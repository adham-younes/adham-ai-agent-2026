"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import {
  ActivityIcon,
  MessageSquareIcon,
  LayoutGridIcon,
  LinkIcon,
  CheckIcon,
  CircleIcon,
  PaperclipIcon,
  SendIcon,
  TerminalIcon,
  AlertCircleIcon,
  BrainIcon,
  Code2Icon,
  DatabaseIcon,
  GitBranchIcon,
  MenuIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlusIcon,
  RocketIcon,
  Settings2Icon,
  SparklesIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationTopFade,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkspaceWelcome } from "./workspace-welcome";
import { AgentMessage } from "./agent-message";
import { AgentSettingsDialog } from "./agent-settings-dialog";
import {
  ExecutiveWorkflowsModal,
  type WorkflowPipelineType,
} from "./workflow-runner";
import { workflowForms, type SavedRun } from "@/lib/platform/workflow-form";
import { HistoryDialog } from "./run-history";

const WORKFLOWS: readonly {
  id: WorkflowPipelineType;
  label: string;
  hint: string;
  icon: React.ElementType;
}[] = [
  { id: "feature-delivery", label: "Build a feature", hint: "Plan, implement, and review", icon: SparklesIcon },
  { id: "code-audit-repair", label: "Code audit & repair", hint: "Diagnose and test", icon: Code2Icon },
  { id: "database-engineering", label: "Database design", hint: "Schema, performance, and access", icon: DatabaseIcon },
  { id: "architecture-evaluation", label: "Architecture review", hint: "Options and tradeoffs", icon: GitBranchIcon },
  { id: "incident-response", label: "Incident response", hint: "Containment and root cause", icon: ActivityIcon },
  { id: "release-readiness", label: "Deploy to production", hint: "Checks, deployment, and rollback", icon: RocketIcon },
  { id: "continual-learning", label: "Capture knowledge", hint: "Context-aware memory", icon: BrainIcon },
] as const;

interface PlatformStatus {
  readonly status: string;
  readonly storage: "postgres" | "ephemeral";
}

export function AgentChat({
  sessionId,
}: {
  readonly sessionId?: string;
}) {
  const [executionOpen, setExecutionOpen] = useState(false);
  const [cancellationError, setCancellationError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowPipelineType>("feature-delivery");
  const [platform, setPlatform] = useState<PlatformStatus>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>();
  const [runs, setRuns] = useState<readonly SavedRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string>();
  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true); setHistoryError(undefined);
    try {
      const response = await fetch("/api/executive-workflows?history=1");
      if (!response.ok) throw new Error("Saved work is temporarily unavailable.");
      const data = await response.json(); setPlatform(data); setRuns(data.history ?? []);
    } catch (cause) { setHistoryError(cause instanceof Error ? cause.message : "Could not load saved work."); }
    finally { setHistoryLoading(false); }
  }, []);
  useEffect(() => { void refreshHistory(); }, [refreshHistory]);
  const openRun = (run: SavedRun) => { setSelectedWorkflow(run.workflowId); setSelectedRunId(run.id); setWorkflowOpen(true); setHistoryOpen(false); };

  const agent = useEveAgent({
    initialSession: sessionId === undefined ? undefined : { sessionId, streamIndex: 0 },
    resume: sessionId !== undefined,
    onSessionChange(session) {
      if (sessionId === undefined && session !== undefined) {
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          "",
          `/s/${encodeURIComponent(session.sessionId)}`,
        );
      }
    },
  });

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isResuming = agent.status === "resuming";
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);
  const pendingShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");
  const showThinking =
    isBusy && (agent.status === "submitted" || lastMessage?.role !== "assistant" || pendingShell);
  const turnFailure = isBusy || isResuming ? undefined : getLatestTurnFailure(agent.events);
  const errorMessage = cancellationError ?? agent.error?.message ?? turnFailure;
  const showConversation = isResuming || !isEmpty || errorMessage !== undefined;
  const activeSessionId = sessionId ?? agent.session?.sessionId;

  const openWorkflow = (workflow: WorkflowPipelineType) => {
    setSelectedRunId(undefined);
    setSelectedWorkflow(workflow);
    setWorkflowOpen(true);
    setMobileOpen(false);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isResuming) return;
    setHasInputText(false);
    setCancellationError(undefined);
    const options = isBusy ? { turnPolicy: "steer" as const } : undefined;
    if (message.files.length === 0) return agent.send(text, options);
    const parts: UserContent = [];
    if (text) parts.push({ text, type: "text" });
    for (const file of message.files) {
      parts.push({ data: file.url, filename: file.filename, mediaType: file.mediaType, type: "file" });
    }
    await agent.send(parts, options);
  };

  const composer = (
    <div className="composer-shell">
      <PromptInput onSubmit={handleSubmit} multiple>
        <ComposerAttachments disabled={isResuming} />
        <PromptInputTextarea
          aria-label="Describe your task"
          className="min-h-[48px] resize-none border-none bg-transparent px-3 py-2 text-[15px] leading-7 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0"
          disabled={isResuming}
          onChange={(event) => setHasInputText(event.currentTarget.value.trim().length > 0)}
          placeholder="Describe the outcome, the context, and what success looks like…"
        />
        <div className="composer-toolbar flex items-center justify-between px-1 pb-1">
          <div className="flex items-center gap-2 text-[11px] text-zinc-600">
            <span className={cn("status-dot", isBusy && "status-dot-busy")} />
            {isBusy ? "Working — send a follow-up to steer the task" : "Work with your agent · files and context welcome"}
          </div>
          <ComposerAction
            hasInputText={hasInputText}
            isBusy={isBusy}
            isResuming={isResuming}
            onCancel={() => {
              setCancellationError(undefined);
              void agent.cancel().catch((error: unknown) => setCancellationError(toErrorMessage(error)));
            }}
          />
        </div>
      </PromptInput>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className={cn("sidebar hidden lg:flex", sidebarOpen ? "w-[256px]" : "w-0 border-0")}>
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} onOpenWorkflow={openWorkflow} platform={platform} onOpenHistory={() => { setHistoryOpen(true); setMobileOpen(false); void refreshHistory(); }} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Dismiss navigation" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="sidebar absolute inset-y-0 left-0 flex w-[min(86vw,320px)] shadow-2xl">
            <Button aria-label="Close menu" className="absolute right-3 top-3 z-10" onClick={() => setMobileOpen(false)} size="icon-sm" variant="ghost"><XIcon className="size-4" /></Button>
            <Sidebar onOpenSettings={() => { setSettingsOpen(true); setMobileOpen(false); }} onOpenWorkflow={openWorkflow} platform={platform} onOpenHistory={() => { setHistoryOpen(true); setMobileOpen(false); void refreshHistory(); }} />
          </aside>
        </div>
      ) : null}

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="topbar">
          <div className="flex items-center gap-2">
            <Button aria-label="Open menu" className="lg:hidden" onClick={() => setMobileOpen(true)} size="icon-sm" variant="ghost"><MenuIcon className="size-4" /></Button>
            <Button aria-label="Toggle sidebar" className="hidden lg:inline-flex" onClick={() => setSidebarOpen((value) => !value)} size="icon-sm" variant="ghost">
              {sidebarOpen ? <PanelRightCloseIcon className="size-4" /> : <PanelRightOpenIcon className="size-4" />}
            </Button>
            <div className="min-w-0">
              <div className="workspace-breadcrumb"><span>Workroom</span><span>/</span><strong>{activeSessionId ? `Task ${activeSessionId.slice(0, 8)}` : "Overview"}</strong></div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="open-access-badge"><span className="status-dot" />Personal workspace</span>
            <Button className="history-button" onClick={() => { setHistoryOpen(true); void refreshHistory(); }} size="sm" variant="ghost">Saved work</Button>
            <Button aria-label="Toggle execution panel" onClick={() => setExecutionOpen((value) => !value)} size="icon-sm" variant="ghost"><ActivityIcon className="size-4" /></Button>
            <Button aria-label="Agent settings" onClick={() => setSettingsOpen(true)} size="icon-sm" variant="ghost"><Settings2Icon className="size-4" /></Button>
            <Button className="rounded-lg border-white/10 bg-white/[0.035]" onClick={() => window.location.assign("/s")} size="sm" variant="outline"><PlusIcon className="size-3.5" /><span className="hidden sm:inline">New task</span></Button>
          </div>
        </header>

        {showConversation ? (
          <Conversation className="flex-1">
            <ConversationTopFade />
            <ConversationContent className="mx-auto w-full max-w-[820px] gap-8 px-4 pb-48 pt-8 sm:px-8 lg:pt-12">
              {isResuming ? <LoadingState /> : null}
              {agent.data.messages.map((message, index) => (
                <AgentMessage
                  canRespond={!isBusy && !isResuming}
                  isStreaming={agent.status === "streaming" && index === agent.data.messages.length - 1}
                  key={message.id}
                  message={message}
                  onInputResponses={(inputResponses) => agent.respond(inputResponses)}
                />
              ))}
              {showThinking ? <PendingThinking /> : null}
              {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        ) : (
          <WorkspaceWelcome composer={composer} onOpenWorkflow={openWorkflow} runs={runs} loading={historyLoading} error={historyError} onSelectRun={openRun} onRefresh={() => void refreshHistory()} />
        )}

        {showConversation ? <div className="composer-wrap composer-fixed">{composer}</div> : null}
      </main>

      <ExecutionPanel busy={isBusy} error={errorMessage} open={executionOpen} onClose={() => setExecutionOpen(false)} events={agent.events} onReview={() => document.querySelector("[data-streamdown]")?.scrollIntoView({ behavior: "smooth" })} />
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} runs={runs} loading={historyLoading} error={historyError} onSelect={openRun} onRefresh={() => void refreshHistory()} />
      <AgentSettingsDialog onOpenChange={setSettingsOpen} open={settingsOpen} />
      <ExecutiveWorkflowsModal
        initialPipeline={selectedWorkflow}
        isOpen={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        selectedRunId={selectedRunId}
        onRunSaved={() => void refreshHistory()}
      />
    </div>
  );
}

function Sidebar({
  onOpenSettings,
  onOpenWorkflow,
  onOpenHistory,
  platform,
}: {
  readonly onOpenSettings: () => void;
  readonly onOpenWorkflow: (workflow: WorkflowPipelineType) => void;
  readonly platform?: PlatformStatus;
  readonly onOpenHistory: () => void;
}) {
  return (
    <div className="sidebar-content flex h-full w-[256px] shrink-0 flex-col overflow-y-auto p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="brand-mark">a<span>.</span></div>
        <div><p className="brand-name" dir="ltr">ADHAM</p><p className="brand-subtitle">THE PERSONAL WORKROOM</p></div>
      </div>
      <Button className="new-task mt-7 w-full justify-start rounded-lg" onClick={() => window.location.assign("/s")} variant="outline"><PlusIcon className="size-4" />New task<span className="new-task-shortcut">+</span></Button>

      <nav className="primary-nav mt-5 space-y-1">
        <button className="nav-item nav-active" onClick={() => window.location.assign("/")} type="button"><MessageSquareIcon className="size-5" />Workroom</button>
        <button className="nav-item" onClick={onOpenHistory} type="button"><LayoutGridIcon className="size-5" />Saved work</button>
        <button className="nav-item" onClick={onOpenSettings} type="button"><LinkIcon className="size-5" />Agent preferences</button>
      </nav>

      <p className="section-label mt-6">DELIVERABLES<span className="workflow-count">07</span></p>
      <nav className="mt-2 space-y-1">
        {WORKFLOWS.map((workflow) => {
          const Icon = workflow.icon;
          return (
            <button className="nav-item" key={workflow.id} onClick={() => onOpenWorkflow(workflow.id)} type="button">
              <Icon className="size-3.5" /><span>{workflowForms[workflow.id].title}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-5">
        <div className="sidebar-profile"><span className="profile-avatar"><TerminalIcon className="size-4" /></span><span><strong>Made for your work</strong><small>Identity stays in this browser</small></span></div>
        <button className="settings-entry" onClick={onOpenSettings} type="button">
          <Settings2Icon className="size-4" />
          <span><strong>Settings</strong><small>Instructions and memory</small></span>
        </button>
        <div className="mt-3 flex items-center gap-2 px-2 text-[10px] text-zinc-600">
          <span className={cn("status-dot", platform?.status !== "available" && "bg-zinc-700 shadow-none")} />
          {platform?.status === "available" ? "Workspace connected" : "Connection unavailable"}
        </div>
      </div>
    </div>
  );
}

function ComposerAction({ hasInputText, isBusy, isResuming, onCancel }: { readonly hasInputText: boolean; readonly isBusy: boolean; readonly isResuming: boolean; readonly onCancel: () => void }) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;
  if (!isBusy || canSubmit) return <PromptInputSubmit aria-label="Send message" className="send-button rounded-lg" disabled={isResuming}><SendIcon className="size-5" /></PromptInputSubmit>;
  return <PromptInputButton aria-label="Stop execution" className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400" onClick={onCancel} variant="outline"><SquareIcon className="size-3 fill-current" /></PromptInputButton>;
}

function LoadingState() {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-600"><span className="status-dot status-dot-busy" />Restoring conversation...</div>;
}

function PendingThinking() {
  return <Message aria-live="polite" from="assistant"><MessageContent><div className="inline-flex items-center gap-2 py-2 text-sm text-zinc-500"><span className="status-dot status-dot-busy" /><Shimmer duration={1.1}>The agent is working...</Shimmer></div></MessageContent></Message>;
}

function ErrorMessage({ message }: { readonly message: string }) {
  return <Message from="assistant"><MessageContent><div className="flex items-start gap-3 border-s-2 border-rose-500/50 py-2 ps-3 text-sm text-rose-300" role="alert"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" /><div><p className="font-medium">Unable to complete the task</p><p className="mt-1 text-xs leading-5 text-zinc-500">{message}</p></div></div></MessageContent></Message>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to stop execution.";
}

function getLatestTurnFailure(events: ReturnType<typeof useEveAgent>["events"]): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "turn.failed") return event.data.message;
    if (event.type === "turn.completed" || event.type === "turn.cancelled" || event.type === "message.received") return undefined;
  }
  return undefined;
}

function ExecutionPanel({ busy, error, open, onClose, events, onReview }: { readonly busy: boolean; readonly error?: string; readonly open: boolean; readonly onClose: () => void; readonly events: ReturnType<typeof useEveAgent>["events"]; readonly onReview: () => void }) {
  const activity = events.filter(event => /tool|action\.|turn\.(completed|failed|started)/.test(event.type)).slice(-5).reverse();
  return <aside className={cn("execution-panel", open && "execution-panel-open")} aria-label="Execution">
    <div className="execution-heading"><div><span className="eyebrow">LIVE RECORD</span><h2>Activity</h2><p>Current conversation</p></div><Button aria-label="Close execution panel" size="icon-sm" variant="ghost" onClick={onClose}><XIcon className="size-4" /></Button></div>
    <div className="execution-status-card"><span className={cn("status-dot", busy && "status-dot-busy")} /><div><strong>{error ? "Needs attention" : busy ? "Agent working" : activity.length ? "Turn settled" : "Ready when you are"}</strong><p>{error ? "Review the error in the conversation." : busy ? "Live tool activity appears below." : "The record reflects actual agent events."}</p></div></div>
    <div className="latest-activity">{activity.length ? activity.map((event, index) => <div className="activity-row" key={index}><ActivityIcon className="size-4" /><div><strong>{activityLabel(event.type)}</strong></div></div>) : <p className="activity-empty">Start a task to see the work as it happens.</p>}</div>
    <Button className="review-button" disabled={activity.length === 0} onClick={onReview} variant="outline">Review conversation</Button>
  </aside>;
}

function activityLabel(type: string): string {
  if (type === "turn.completed") return "Reply finished";
  if (type === "turn.failed") return "Reply interrupted";
  if (type === "turn.started") return "Reply started";
  if (type.includes("completed") || type.includes("result")) return "Tool finished";
  if (type.includes("failed")) return "Tool needs attention";
  return "Using a tool";
}

function ComposerAttachments({ disabled }: { readonly disabled: boolean }) {
  const attachments = usePromptInputAttachments();
  return <div className="composer-attachments"><PromptInputButton aria-label="Attach files" disabled={disabled} onClick={() => attachments.openFileDialog()} variant="ghost"><PaperclipIcon className="size-4" /></PromptInputButton>{attachments.files.map((file) => <button key={file.id} className="attachment-chip" onClick={() => attachments.remove(file.id)} type="button" aria-label={`Remove ${file.filename ?? "attachment"}`}>{file.filename ?? "Attachment"}<XIcon className="size-3" /></button>)}</div>;
}
