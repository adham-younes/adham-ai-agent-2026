"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import {
  ActivityIcon,
  AlertCircleIcon,
  BrainIcon,
  Code2Icon,
  DatabaseIcon,
  GitBranchIcon,
  Globe2Icon,
  MenuIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  SquareIcon,
  TerminalSquareIcon,
  UsersIcon,
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
  { id: "feature-delivery", label: "بناء ميزة", hint: "تخطيط وتنفيذ ومراجعة", icon: SparklesIcon },
  { id: "code-audit-repair", label: "إصلاح كود", hint: "تشخيص واختبار", icon: Code2Icon },
  { id: "database-engineering", label: "هندسة بيانات", hint: "مخطط وأداء وصلاحيات", icon: DatabaseIcon },
  { id: "architecture-evaluation", label: "قرار معماري", hint: "بدائل ومقايضات", icon: GitBranchIcon },
  { id: "incident-response", label: "معالجة حادث", hint: "احتواء وسبب جذري", icon: ActivityIcon },
  { id: "release-readiness", label: "تجهيز إصدار", hint: "فحص ونشر وتراجع", icon: RocketIcon },
  { id: "continual-learning", label: "استخلاص معرفة", hint: "ذاكرة محكومة بالسياق", icon: BrainIcon },
] as const;

interface PlatformStatus {
  readonly status: string;
  readonly storage: "postgres" | "ephemeral";
}

export function AgentChat({
  sessionId,
  sessionless = false,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
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
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          aria-label="اكتب مهمتك"
          className="min-h-[68px] resize-none border-none bg-transparent px-3 py-2 text-[15px] leading-7 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0"
          disabled={isResuming}
          onChange={(event) => setHasInputText(event.currentTarget.value.trim().length > 0)}
          placeholder="ماذا تريد أن ننجز؟"
        />
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="flex items-center gap-2 text-[11px] text-zinc-600">
            <span className={cn("status-dot", isBusy && "status-dot-busy")} />
            {isBusy ? "يعمل الآن — يمكنك تعديل الاتجاه" : "جاهز للبحث والتنفيذ"}
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
      <aside className={cn("sidebar hidden lg:flex", sidebarOpen ? "w-[268px]" : "w-0 border-0")}>
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} onOpenWorkflow={openWorkflow} platform={platform} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="إغلاق القائمة" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="sidebar absolute inset-y-0 right-0 flex w-[min(86vw,320px)] shadow-2xl">
            <Button aria-label="إغلاق القائمة" className="absolute left-3 top-3 z-10" onClick={() => setMobileOpen(false)} size="icon-sm" variant="ghost"><XIcon className="size-4" /></Button>
            <Sidebar onOpenSettings={() => { setSettingsOpen(true); setMobileOpen(false); }} onOpenWorkflow={openWorkflow} platform={platform} />
          </aside>
        </div>
      ) : null}

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="topbar">
          <div className="flex items-center gap-2">
            <Button aria-label="فتح القائمة" className="lg:hidden" onClick={() => setMobileOpen(true)} size="icon-sm" variant="ghost"><MenuIcon className="size-4" /></Button>
            <Button aria-label="طي القائمة" className="hidden lg:inline-flex" onClick={() => setSidebarOpen((value) => !value)} size="icon-sm" variant="ghost">
              {sidebarOpen ? <PanelRightCloseIcon className="size-4" /> : <PanelRightOpenIcon className="size-4" />}
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.08em] text-zinc-100" dir="ltr">ADHAM AGENT</p>
              <p className="truncate text-[10px] text-zinc-600">{activeSessionId ? `جلسة ${activeSessionId.slice(0, 8)}` : "محادثة جديدة"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button aria-label="إعدادات الوكيل" onClick={() => setSettingsOpen(true)} size="icon-sm" variant="ghost"><Settings2Icon className="size-4" /></Button>
            <Button className="rounded-lg border-white/10 bg-white/[0.035]" onClick={() => window.location.assign("/s")} size="sm" variant="outline"><PlusIcon className="size-3.5" /><span className="hidden sm:inline">محادثة جديدة</span></Button>
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
          <Welcome onOpenWorkflow={openWorkflow} onPrompt={(prompt) => void agent.send(prompt)} />
        )}

        <div className={cn("composer-wrap", showConversation ? "composer-fixed" : "composer-home")}>{composer}</div>
      </main>

      <AgentSettingsDialog onOpenChange={setSettingsOpen} open={settingsOpen} />
      <ExecutiveWorkflowsModal
        initialPipeline={selectedWorkflow}
        isOpen={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        onSendToChat={(text) => void agent.send(text)}
      />
    </div>
  );
}

function Welcome({
  onOpenWorkflow,
  onPrompt,
}: {
  readonly onOpenWorkflow: (workflow: WorkflowPipelineType) => void;
  readonly onPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center px-5 pb-8 pt-12 sm:px-8">
        <div className="welcome-orb">A</div>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-emerald-300/80" dir="ltr">ADHAM AGENT / WORKSPACE</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-[1.35] tracking-[-0.035em] text-zinc-100 sm:text-5xl">
          فكّر، ابحث، نفّذ.<br /><span className="text-zinc-500">العمل الحقيقي يبدأ هنا.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-500">
          مساحة عمل موحدة للبحث المباشر والبرمجة والتحقق، مع ذاكرة مستدامة وفريق متخصص عند الحاجة.
        </p>

        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOWS.slice(0, 6).map((workflow) => {
            const Icon = workflow.icon;
            return (
              <button className="quick-action" key={workflow.id} onClick={() => onOpenWorkflow(workflow.id)} type="button">
                <Icon className="size-4 text-zinc-400" />
                <span className="min-w-0"><strong>{workflow.label}</strong><small>{workflow.hint}</small></span>
              </button>
            );
          })}
        </div>
        <button className="mt-3 flex w-fit items-center gap-2 text-xs text-zinc-600 transition hover:text-zinc-300" onClick={() => onPrompt("ابحث لحظياً عن أهم التطورات التقنية اليوم وقدّم لي خلاصة موثقة بالمصادر.")} type="button">
          <SearchIcon className="size-3.5" /> جرّب البحث اللحظي
        </button>
      </div>
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
    <div className="flex h-full w-[268px] shrink-0 flex-col overflow-y-auto p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="brand-mark">A</div>
        <div><p className="text-sm font-semibold tracking-[0.08em] text-zinc-100" dir="ltr">ADHAM AGENT</p><p className="text-[10px] text-zinc-500">مساحة العمل الذكية</p></div>
      </div>
      <Button className="mt-4 w-full justify-start rounded-xl border-white/8 bg-white/[0.035] text-zinc-300" onClick={() => window.location.assign("/s")} variant="outline"><PlusIcon className="size-4" />محادثة جديدة</Button>

      <p className="section-label mt-6">القدرات</p>
      <nav className="mt-2 space-y-1">
        <SideItem icon={Globe2Icon} label="بحث لحظي" />
        <SideItem icon={TerminalSquareIcon} label="Linux دائم ومعزول" />
        <SideItem icon={BrainIcon} label="ذاكرة مستدامة" />
        <SideItem icon={UsersIcon} label="فريق متعدد الوكلاء" />
      </nav>

      <p className="section-label mt-6">مسارات جاهزة</p>
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
        <button className="settings-entry" onClick={onOpenSettings} type="button">
          <Settings2Icon className="size-4" />
          <span><strong>تعليمات الوكيل</strong><small>الذاكرة والسلوك الدائم</small></span>
        </button>
        <div className="mt-3 flex items-center gap-2 px-2 text-[10px] text-zinc-600">
          <span className={cn("status-dot", platform?.status !== "online" && "bg-zinc-700 shadow-none")} />
          {platform?.status === "online" ? "جميع الأنظمة متصلة" : "جارٍ فحص الاتصال"}
        </div>
      </div>
    </div>
  );
}

function SideItem({ icon: Icon, label }: { readonly icon: React.ElementType; readonly label: string }) {
  return <div className="nav-item cursor-default"><Icon className="size-3.5" /><span>{label}</span><ShieldCheckIcon className="ms-auto size-3 text-emerald-500/70" /></div>;
}

function ComposerAction({ hasInputText, isBusy, isResuming, onCancel }: { readonly hasInputText: boolean; readonly isBusy: boolean; readonly isResuming: boolean; readonly onCancel: () => void }) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;
  if (!isBusy || canSubmit) return <PromptInputSubmit aria-label="إرسال" className="rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white" disabled={isResuming} />;
  return <PromptInputButton aria-label="إيقاف التنفيذ" className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400" onClick={onCancel} variant="outline"><SquareIcon className="size-3 fill-current" /></PromptInputButton>;
}

function LoadingState() {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-600"><span className="status-dot status-dot-busy" />استعادة المحادثة...</div>;
}

function PendingThinking() {
  return <Message aria-live="polite" from="assistant"><MessageContent><div className="inline-flex items-center gap-2 py-2 text-sm text-zinc-500"><span className="status-dot status-dot-busy" /><Shimmer duration={1.1}>يعمل الفريق على المهمة...</Shimmer></div></MessageContent></Message>;
}

function ErrorMessage({ message }: { readonly message: string }) {
  return <Message from="assistant"><MessageContent><div className="flex items-start gap-3 border-s-2 border-rose-500/50 py-2 ps-3 text-sm text-rose-300" role="alert"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" /><div><p className="font-medium">تعذر إكمال المهمة</p><p className="mt-1 text-xs leading-5 text-zinc-500">{message}</p></div></div></MessageContent></Message>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "تعذر إيقاف التنفيذ.";
}

function getLatestTurnFailure(events: ReturnType<typeof useEveAgent>["events"]): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "turn.failed") return event.data.message;
    if (event.type === "turn.completed" || event.type === "turn.cancelled" || event.type === "message.received") return undefined;
  }
  return undefined;
}
