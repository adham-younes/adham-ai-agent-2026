"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import {
  ActivityIcon,
  HomeIcon,
  MessageSquareIcon,
  LayoutGridIcon,
  LinkIcon,
  PlayIcon,
  CheckIcon,
  CircleIcon,
  FileCodeIcon,
  EyeIcon,
  PaperclipIcon,
  SendIcon,
  TriangleIcon,
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
  ShieldCheckIcon,
  SparklesIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { SignIn } from "./web-chat-auth";
import { AgentMessage } from "./agent-message";
import { AgentSettingsDialog } from "./agent-settings-dialog";
import {
  ExecutiveWorkflowsModal,
  type WorkflowPipelineType,
} from "./executive-workflows-modal";

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
  sessionless = false,
  authenticated = true,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
  readonly authenticated?: boolean;
}) {
  const [demo, setDemo] = useState(false);
  const [demoTab, setDemoTab] = useState("Changes");
  const [executionOpen, setExecutionOpen] = useState(false);
  const [cancellationError, setCancellationError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowPipelineType>("feature-delivery");
  const [platform, setPlatform] = useState<PlatformStatus>();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/executive-workflows", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        setPlatform((await response.json()) as PlatformStatus);
      })
      .catch(() => setPlatform(undefined));
    return () => controller.abort();
  }, []);

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
  const showConversation = isResuming || sessionless || !isEmpty || errorMessage !== undefined;
  const activeSessionId = sessionId ?? agent.session?.sessionId;

  const openWorkflow = (workflow: WorkflowPipelineType) => {
    setSelectedWorkflow(workflow);
    setWorkflowOpen(true);
    setMobileOpen(false);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!authenticated) return;
    setDemo(false);
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
      {!authenticated ? <div className="composer-auth"><span>Sign in to start a task and save your conversations.</span><SignIn /></div> : null}
      <PromptInput onSubmit={handleSubmit} multiple>
        <ComposerAttachments disabled={!authenticated || isResuming} />
        <PromptInputTextarea
          aria-label="Describe your task"
          className="min-h-[48px] resize-none border-none bg-transparent px-3 py-2 text-[15px] leading-7 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0"
          disabled={isResuming || !authenticated}
          onChange={(event) => setHasInputText(event.currentTarget.value.trim().length > 0)}
          placeholder="Describe the next step..."
        />
        <div className="composer-toolbar flex items-center justify-between px-1 pb-1">
          <div className="flex items-center gap-2 text-[11px] text-zinc-600">
            <span className={cn("status-dot", isBusy && "status-dot-busy")} />
            {isBusy ? "Working — send a follow-up to steer the task" : "Use natural language to plan, build, and run tasks"}
          </div>
          <ComposerAction
            hasInputText={hasInputText}
            isBusy={isBusy}
            isResuming={isResuming || !authenticated}
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
      <aside className={cn("sidebar hidden lg:flex", sidebarOpen ? "w-[280px]" : "w-0 border-0")}>
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} onOpenWorkflow={openWorkflow} platform={platform} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="sidebar absolute inset-y-0 left-0 flex w-[min(86vw,320px)] shadow-2xl">
            <Button aria-label="Close menu" className="absolute left-3 top-3 z-10" onClick={() => setMobileOpen(false)} size="icon-sm" variant="ghost"><XIcon className="size-4" /></Button>
            <Sidebar onOpenSettings={() => { setSettingsOpen(true); setMobileOpen(false); }} onOpenWorkflow={openWorkflow} platform={platform} />
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
              <div className="workspace-breadcrumb"><HomeIcon className="size-5" /><span>Workspace</span><span>/</span><strong>{demo ? "Customer support API" : activeSessionId ? `Task ${activeSessionId.slice(0, 8)}` : "New task"}</strong></div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button className="demo-button" onClick={() => setDemo((value) => !value)} size="sm" variant="outline"><PlayIcon className="size-3.5" />{demo ? "Exit demo" : "Demo session"}</Button>
            <Button aria-label="Toggle execution panel" onClick={() => setExecutionOpen((value) => !value)} size="icon-sm" variant="ghost"><ActivityIcon className="size-4" /></Button>
            <Button aria-label="Agent settings" onClick={() => setSettingsOpen(true)} size="icon-sm" variant="ghost"><Settings2Icon className="size-4" /></Button>
            <Button className="rounded-lg border-white/10 bg-white/[0.035]" onClick={() => window.location.assign("/s")} size="sm" variant="outline"><PlusIcon className="size-3.5" /><span className="hidden sm:inline">New task</span></Button>
          </div>
        </header>

        {demo ? <DemoConversation tab={demoTab} onTab={setDemoTab} /> : showConversation ? (
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
          <div className="workspace-empty"><div className="agent-heading"><img src="/agent-mark.png" alt="" width={40} height={36} /><strong>ADHAM AGENT</strong><span>Coordinator</span></div><h1>What are we working on?</h1><p>Describe your task below. I’ll help you plan, build, and verify it.</p><div className="start-tasks">{WORKFLOWS.slice(0, 3).map((workflow) => <button key={workflow.id} onClick={() => authenticated ? openWorkflow(workflow.id) : document.querySelector<HTMLTextAreaElement>("textarea")?.focus()} disabled={!authenticated} type="button"><workflow.icon className="size-4" /><span>{workflow.label}</span><PlusIcon className="size-4" /></button>)}</div></div>
        )}

        <div className={cn("composer-wrap", "composer-fixed")}>{composer}</div>
      </main>

      <ExecutionPanel demo={demo} busy={isBusy} error={errorMessage} open={executionOpen} onClose={() => setExecutionOpen(false)} events={agent.events} onReview={() => { if (demo) setDemoTab("Checks"); else document.querySelector("[data-streamdown]")?.scrollIntoView({ behavior: "smooth" }); }} />
      <AgentSettingsDialog authenticated={authenticated} onOpenChange={setSettingsOpen} open={settingsOpen} />
      <ExecutiveWorkflowsModal
        authenticated={authenticated}
        initialPipeline={selectedWorkflow}
        isOpen={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        onSendToChat={(text) => { setDemo(false); void agent.send(text); }}
      />
    </div>
  );
}

function Sidebar({
  onOpenSettings,
  onOpenWorkflow,
  platform,
}: {
  readonly onOpenSettings: () => void;
  readonly onOpenWorkflow: (workflow: WorkflowPipelineType) => void;
  readonly platform?: PlatformStatus;
}) {
  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col overflow-y-auto p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="brand-mark"><img src="/agent-mark.png" alt="" width={40} height={36} /></div>
        <div><p className="text-sm font-semibold tracking-[0.08em] text-zinc-100" dir="ltr">ADHAM AGENT</p><p className="text-[10px] text-zinc-500">Workspace</p></div>
      </div>
      <Button className="new-task mt-6 w-full justify-start rounded-lg" onClick={() => window.location.assign("/s")} variant="outline"><PlusIcon className="size-4" />New task</Button>

      <nav className="primary-nav mt-5 space-y-1">
        <button className="nav-item nav-active" onClick={() => window.location.assign("/")} type="button"><MessageSquareIcon className="size-5" />Conversations</button>
        <button className="nav-item" onClick={() => onOpenWorkflow("feature-delivery")} type="button"><LayoutGridIcon className="size-5" />Workspace</button>
        <button className="nav-item" onClick={onOpenSettings} type="button"><LinkIcon className="size-5" />Connections & settings</button>
        <button className="nav-item" onClick={onOpenSettings} type="button"><DatabaseIcon className="size-5" />Memory</button>
      </nav>

      <p className="section-label mt-6">Task workflows</p>
      <nav className="mt-2 space-y-1">
        {WORKFLOWS.map((workflow) => {
          const Icon = workflow.icon;
          return (
            <button className="nav-item" key={workflow.id} onClick={() => onOpenWorkflow(workflow.id)} type="button">
              <Icon className="size-3.5" /><span>{workflow.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-5">
        <div className="sidebar-profile"><span className="profile-avatar"><TriangleIcon className="size-5" /></span><span>Agent workspace</span></div>
        <button className="settings-entry" onClick={onOpenSettings} type="button">
          <Settings2Icon className="size-4" />
          <span><strong>Settings</strong><small>Instructions and memory</small></span>
        </button>
        <div className="mt-3 flex items-center gap-2 px-2 text-[10px] text-zinc-600">
          <span className={cn("status-dot", platform?.status !== "online" && "bg-zinc-700 shadow-none")} />
          {platform?.status === "online" ? "Connected" : "Not connected"}
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

const DEMO_CODE = `import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});`;

function DemoConversation({ tab, onTab }: { readonly tab: string; readonly onTab: (tab: string) => void }) {
  return <div className="demo-conversation">
    <div className="demo-notice">Example session · Preview only</div>
    <div className="demo-user"><span className="profile-avatar">AY</span><p>Build a support request API with validation and tests.</p></div>
    <div className="agent-heading"><img src="/agent-mark.png" alt="" width={40} height={36} /><strong>ADHAM AGENT</strong><span>Coordinator</span></div>
    <p className="demo-response">I’ll define the request schema, build the endpoint, and verify the error handling.</p>
    <div className="plan-card">{[["Plan", "Define requirements and technical approach"], ["Implementation", "Build the API endpoint with validation"], ["Review", "Run tests and verify error handling"]].map(([title, description], index) => <div className="plan-row" key={title}><span className={index === 2 ? "stage-icon stage-running" : "stage-icon"}>{index === 2 ? <CircleIcon /> : <CheckIcon />}</span><div><strong>{title}</strong><small>{description}</small></div><span className={index === 2 ? "accent-text" : "stage-status"}>{index === 2 ? "In progress" : "Completed"}</span></div>)}</div>
    <div className="artifact-card"><div className="artifact-tabs" role="tablist" aria-label="Example artifacts">{[{ name: "Changes", icon: FileCodeIcon }, { name: "Preview", icon: EyeIcon }, { name: "Checks", icon: ShieldCheckIcon }].map(({ name, icon: Icon }) => <button key={name} aria-selected={tab === name} className={tab === name ? "artifact-tab active" : "artifact-tab"} onClick={() => onTab(name)} role="tab" type="button"><Icon className="size-4" />{name}</button>)}</div>
      <div className="artifact-body" role="tabpanel">{tab === "Changes" ? <><div className="code-card"><div className="code-title"><FileCodeIcon className="size-4" />app/api/support/route.ts<span>TypeScript</span></div><pre><code>{DEMO_CODE.split("\n").map((line, index) => <div key={index}><span className="line-number">{index + 1}</span><span>{line}</span></div>)}</code></pre></div><div className="changed-file"><FileCodeIcon /><div><strong>route.ts</strong><small>app/api/support/route.ts</small></div><span>+82</span><small>−0</small></div><div className="changed-file"><ShieldCheckIcon /><div><strong>support.test.ts</strong><small>__tests__/support.test.ts</small></div><span>+64</span><small>−0</small></div></> : tab === "Preview" ? <div className="preview-example"><Code2Icon className="size-6" /><h3>Support request endpoint</h3><code>POST /api/support</code><p>Validates name, email, and message before accepting a request.</p><small>Example output — no endpoint is created by this demo.</small></div> : <div className="example-checks"><p><CheckIcon className="size-4" /> Request schema validation <span>Example: passed</span></p><p><CheckIcon className="size-4" /> Valid request handling <span>Example: passed</span></p><p><CircleIcon className="size-4" /> Error case coverage <span>Example: running</span></p></div>}</div>
    </div>
  </div>;
}

function ExecutionPanel({ demo, busy, error, open, onClose, events, onReview }: { readonly demo: boolean; readonly busy: boolean; readonly error?: string; readonly open: boolean; readonly onClose: () => void; readonly events: ReturnType<typeof useEveAgent>["events"]; readonly onReview: () => void }) {
  const activity = events.filter((event) => /tool|turn\.(completed|failed|started)/.test(event.type)).slice(-5).reverse();
  return <aside className={cn("execution-panel", open && "execution-panel-open")} aria-label="Execution">
    <div className="execution-heading"><div><h2>Execution</h2><p>{demo ? "Example workflow" : busy ? "Task in progress" : "Current session"}</p></div><Button aria-label="Close execution panel" className="xl:hidden" size="icon-sm" variant="ghost" onClick={onClose}><XIcon className="size-4" /></Button></div>
    {demo ? <div className="execution-stages">{[["Planner", "Break down the task"], ["Executor", "Write and update code"], ["Reviewer", "Run tests and validate"]].map(([title, detail], index) => <div className="execution-stage" key={title}><span className={index === 2 ? "stage-icon stage-running" : "stage-icon"}>{index === 2 ? <CircleIcon /> : <CheckIcon />}</span><div><strong>{title}</strong><small>{detail}</small></div><span className="status-badge">{index === 2 ? "Running" : "Completed"}</span></div>)}</div> : <div className="live-execution"><span className={cn("stage-icon", busy && "stage-running")}><ActivityIcon /></span><div><strong>{error ? "Task interrupted" : busy ? "Coordinator working" : "Ready for a task"}</strong><small>{error ? "Review the message in the conversation." : busy ? "Follow progress in the conversation." : "Execution activity appears here when you start."}</small></div></div>}
    <div className="latest-activity"><h2>Latest activity</h2>{demo ? [["Validated request schema", "Defined and tested input validation"], ["Added API handler", "Implemented POST /api/support"], ["Checking error cases", "Running test suite"]].map(([title, detail], index) => <div className="activity-row" key={title}><FileCodeIcon className="size-5" /><div><strong>{title}</strong><small>{detail}</small></div><span className={index === 2 ? "activity-dot running" : "activity-dot"} /></div>) : activity.length ? activity.map((event, index) => <div className="activity-row" key={index}><ActivityIcon className="size-4" /><div><strong>{activityLabel(event.type)}</strong></div></div>) : <p className="activity-empty">No activity yet.<br />Start a conversation to see live updates.</p>}</div>
    <Button className="review-button" disabled={!demo && activity.length === 0} onClick={onReview} variant="outline"><ShieldCheckIcon className="size-4" />{demo ? "Review example checks" : "Review conversation"}</Button>
  </aside>;
}

function activityLabel(type: string): string {
  if (type === "turn.completed") return "Task completed";
  if (type === "turn.failed") return "Task interrupted";
  if (type === "turn.started") return "Task started";
  if (type.includes("completed") || type.includes("result")) return "Tool finished";
  if (type.includes("failed")) return "Tool needs attention";
  return "Using a tool";
}

function ComposerAttachments({ disabled }: { readonly disabled: boolean }) {
  const attachments = usePromptInputAttachments();
  return <div className="composer-attachments"><PromptInputButton aria-label="Attach files" disabled={disabled} onClick={() => attachments.openFileDialog()} variant="ghost"><PaperclipIcon className="size-4" /></PromptInputButton>{attachments.files.map((file) => <button key={file.id} className="attachment-chip" onClick={() => attachments.remove(file.id)} type="button" aria-label={`Remove ${file.filename ?? "attachment"}`}>{file.filename ?? "Attachment"}<XIcon className="size-3" /></button>)}</div>;
}
