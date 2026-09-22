"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowUpLeftIcon,
  BotIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  CircleGaugeIcon,
  CloudIcon,
  Code2Icon,
  DatabaseIcon,
  MenuIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlusIcon,
  RadarIcon,
  RouteIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SquareIcon,
  WorkflowIcon,
  XIcon,
  ZapIcon,
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
import {
  ExecutiveWorkflowsModal,
  type WorkflowPipelineType,
} from "./executive-workflows-modal";

const AGENT_NAME = "adham-ai-agent-2026";

const PIPELINES: readonly {
  id: WorkflowPipelineType;
  title: string;
  english: string;
  description: string;
  steps: number;
  icon: React.ElementType;
  accent: string;
}[] = [
  { id: "feature-delivery", title: "تسليم الميزات", english: "Feature delivery", description: "مواصفات، بيانات، تنفيذ وتدقيق", steps: 4, icon: SparklesIcon, accent: "emerald" },
  { id: "database-engineering", title: "هندسة البيانات", english: "Database & RLS", description: "PostgreSQL، فهارس وسياسات وصول", steps: 3, icon: DatabaseIcon, accent: "blue" },
  { id: "code-audit-repair", title: "تدقيق الكود", english: "Code audit", description: "سبب جذري ورقعة قابلة للتحقق", steps: 2, icon: Code2Icon, accent: "amber" },
  { id: "release-readiness", title: "جاهزية الإصدار", english: "Release readiness", description: "بوابات جودة ونشر وتراجع", steps: 3, icon: CloudIcon, accent: "violet" },
  { id: "architecture-evaluation", title: "قرار معماري", english: "Architecture ADR", description: "مقايضات وتكلفة وسجل قرار", steps: 3, icon: RouteIcon, accent: "fuchsia" },
  { id: "incident-response", title: "استجابة للحوادث", english: "Incident response", description: "تصنيف، RCA واحتواء", steps: 4, icon: ActivityIcon, accent: "rose" },
  { id: "continual-learning", title: "تعلم مستمر", english: "Context learning", description: "معرفة محكومة ببوابة سياق", steps: 3, icon: BrainCircuitIcon, accent: "cyan" },
] as const;

interface PlatformStatus {
  readonly status: string;
  readonly storage: "postgres" | "ephemeral";
  readonly models: Record<"orchestrator" | "executor" | "analyst", boolean>;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] =
    useState<WorkflowPipelineType>("feature-delivery");
  const [platform, setPlatform] = useState<PlatformStatus>();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/executive-workflows", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Platform status unavailable");
        setPlatform((await response.json()) as PlatformStatus);
      })
      .catch(() => setPlatform(undefined));
    return () => controller.abort();
  }, []);

  const openPipeline = (pipeline: WorkflowPipelineType) => {
    setSelectedPipeline(pipeline);
    setModalOpen(true);
    setMobileOpen(false);
  };

  const agent = useEveAgent({
    initialSession:
      sessionId === undefined ? undefined : { sessionId, streamIndex: 0 },
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

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isResuming) return;
    setHasInputText(false);
    setCancellationError(undefined);
    const options = isBusy ? { turnPolicy: "steer" as const } : undefined;
    if (message.files.length === 0) {
      await agent.send(text, options);
      return;
    }
    const parts: UserContent = [];
    if (text) parts.push({ text, type: "text" });
    for (const file of message.files) {
      parts.push({ data: file.url, filename: file.filename, mediaType: file.mediaType, type: "file" });
    }
    await agent.send(parts, options);
  };

  const composer = (
    <div className="composer-shell">
      <div className="mb-2 flex items-center justify-between px-2 text-[11px] text-zinc-500">
        <span className="flex items-center gap-2">
          <span className={cn("status-dot", isBusy && "status-dot-busy")} />
          {isBusy ? "تنفيذ جارٍ — يمكنك توجيه المهمة أثناء العمل" : "الموجّه التنفيذي جاهز"}
        </span>
        <span className="hidden font-mono sm:inline">ENTER ↵</span>
      </div>
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          aria-label="رسالة إلى الوكيل"
          className="min-h-[62px] resize-none border-none bg-transparent px-2 py-1 text-[15px] leading-7 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0"
          disabled={isResuming}
          onChange={(event) => setHasInputText(event.currentTarget.value.trim().length > 0)}
          placeholder="صف النتيجة التي تريد إنجازها..."
        />
        <ComposerAction
          hasInputText={hasInputText}
          isBusy={isBusy}
          isResuming={isResuming}
          onCancel={() => {
            setCancellationError(undefined);
            void agent.cancel().catch((error: unknown) => setCancellationError(toErrorMessage(error)));
          }}
        />
      </PromptInput>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className={cn("sidebar hidden lg:flex", sidebarOpen ? "w-[292px]" : "w-0 border-0")}>
        <Sidebar
          activeSessionId={activeSessionId}
          onOpenPipeline={openPipeline}
          platform={platform}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="إغلاق القائمة" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="sidebar absolute inset-y-0 right-0 flex w-[292px] shadow-2xl">
            <Button aria-label="إغلاق القائمة" className="absolute left-3 top-3 z-10" onClick={() => setMobileOpen(false)} size="icon-sm" variant="ghost"><XIcon className="size-4" /></Button>
            <Sidebar activeSessionId={activeSessionId} onOpenPipeline={openPipeline} platform={platform} />
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
            <div>
              <p className="text-sm font-semibold text-zinc-100">مساحة التنفيذ</p>
              <p className="text-[11px] text-zinc-500">{activeSessionId ? `جلسة ${activeSessionId.slice(0, 8)}` : "جلسة جديدة"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-400 sm:flex">
              <span className={cn("status-dot", platform?.status !== "online" && "bg-zinc-600 shadow-none")} />
              {platform?.status === "online" ? "المنصة متصلة" : "جارٍ التحقق"}
            </span>
            <Button className="gap-2 rounded-full border-white/10 bg-white/[0.04]" onClick={() => window.location.assign("/s")} size="sm" variant="outline"><PlusIcon className="size-3.5" />مهمة جديدة</Button>
          </div>
        </header>

        {showConversation ? (
          <Conversation className="flex-1">
            <ConversationTopFade />
            <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pb-44 pt-8 sm:px-6">
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
          <Welcome onOpenPipeline={openPipeline} platform={platform} onPrompt={(prompt) => void agent.send(prompt)} />
        )}

        <div className={cn("composer-wrap", showConversation ? "composer-fixed" : "composer-home")}>{composer}</div>
      </main>

      <ExecutiveWorkflowsModal
        initialPipeline={selectedPipeline}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSendToChat={(text) => {
          setCancellationError(undefined);
          void agent.send(text);
        }}
      />
    </div>
  );
}

function Welcome({
  onOpenPipeline,
  onPrompt,
  platform,
}: {
  readonly onOpenPipeline: (pipeline: WorkflowPipelineType) => void;
  readonly onPrompt: (prompt: string) => void;
  readonly platform?: PlatformStatus;
}) {
  return (
    <div className="flex flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-5 pb-8 pt-10 sm:px-8 lg:pt-14">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <div className="eyebrow"><RadarIcon className="size-3.5" />EXECUTIVE AGENT OPERATING SYSTEM</div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.18] tracking-[-0.04em] text-white sm:text-5xl">
              حوّل الهدف إلى<br /><span className="text-gradient">تنفيذ هندسي موثّق.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">
              موجّه واحد يقود وكلاء التنفيذ والتحليل عبر مسارات حتمية، مع جلسات قابلة للاستئناف وسجل تشغيل دائم.
            </p>
          </div>
          <div className="system-card">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-zinc-200">حالة النظام</span><CircleGaugeIcon className="size-4 text-emerald-400" /></div>
            <StatusRow label="الموجّه" ready={platform?.models.orchestrator} />
            <StatusRow label="التنفيذ" ready={platform?.models.executor} />
            <StatusRow label="التحليل" ready={platform?.models.analyst} />
            <StatusRow label="سجل التشغيل" ready={platform?.storage === "postgres"} />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">مسارات التنفيذ</h2>
            <p className="mt-1 text-xs text-zinc-500">اختر مسارًا مضبوط المدخلات والمراحل</p>
          </div>
          <span className="font-mono text-[11px] text-zinc-600">7 WORKFLOWS</span>
        </div>
        <div className="pipeline-grid">
          {PIPELINES.map((pipeline, index) => {
            const Icon = pipeline.icon;
            return (
              <button className={cn("pipeline-card", `accent-${pipeline.accent}`, index === 0 && "sm:col-span-2")} key={pipeline.id} onClick={() => onOpenPipeline(pipeline.id)} type="button">
                <div className="flex items-start justify-between">
                  <span className="pipeline-icon"><Icon className="size-4" /></span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-600">{pipeline.steps} مراحل <ArrowUpLeftIcon className="size-3.5" /></span>
                </div>
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-zinc-100">{pipeline.title}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">{pipeline.english}</p>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">{pipeline.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <button className="mt-5 flex items-center justify-between rounded-2xl border border-dashed border-white/10 px-4 py-3 text-right text-xs text-zinc-500 transition hover:border-emerald-400/30 hover:text-zinc-300" onClick={() => onPrompt("راجع معمارية هذا النظام واقترح خطة تحسين مرتبة حسب الأولوية والأثر.")} type="button">
          <span>أو ابدأ بطلب مفتوح للموجّه التنفيذي</span><ChevronLeftIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  activeSessionId,
  onOpenPipeline,
  platform,
}: {
  readonly activeSessionId?: string;
  readonly onOpenPipeline: (pipeline: WorkflowPipelineType) => void;
  readonly platform?: PlatformStatus;
}) {
  return (
    <div className="flex h-full w-[292px] shrink-0 flex-col overflow-y-auto p-4">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="brand-mark"><WorkflowIcon className="size-5" /></div>
        <div><p className="text-sm font-bold tracking-tight text-white">adham.ai</p><p className="font-mono text-[9px] tracking-[0.18em] text-emerald-400">AGENT OPERATING SYSTEM</p></div>
      </div>
      <Button className="mt-5 w-full justify-start gap-2 rounded-xl border-white/10 bg-white/[0.04] text-zinc-200" onClick={() => window.location.assign("/s")} variant="outline"><PlusIcon className="size-4 text-emerald-400" />مهمة جديدة</Button>

      <p className="section-label mt-7">فريق الوكلاء</p>
      <div className="mt-2 space-y-1.5">
        <AgentRow icon={ZapIcon} label="الموجّه التنفيذي" model="GPT-OSS 120B" ready={platform?.models.orchestrator} />
        <AgentRow icon={BotIcon} label="وكيل التنفيذ" model="QWEN 27B" ready={platform?.models.executor} />
        <AgentRow icon={ShieldCheckIcon} label="وكيل التحليل" model="QWEN 27B" ready={platform?.models.analyst} />
      </div>

      <p className="section-label mt-7">المسارات</p>
      <nav className="mt-2 space-y-1">
        {PIPELINES.map((pipeline) => {
          const Icon = pipeline.icon;
          return <button className="nav-item" key={pipeline.id} onClick={() => onOpenPipeline(pipeline.id)} type="button"><Icon className="size-3.5" /><span>{pipeline.title}</span><span className="ms-auto font-mono text-[9px] text-zinc-700">{pipeline.steps}</span></button>;
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <div className="flex items-center justify-between text-[11px]"><span className="text-zinc-400">التخزين</span><span className={platform?.storage === "postgres" ? "text-emerald-400" : "text-amber-400"}>{platform?.storage === "postgres" ? "PostgreSQL دائم" : "مؤقت"}</span></div>
          <div className="mt-2 flex items-center justify-between text-[11px]"><span className="text-zinc-400">الجلسة</span><span className="max-w-28 truncate font-mono text-zinc-600">{activeSessionId?.slice(0, 8) ?? "NEW"}</span></div>
        </div>
        <p className="mt-3 px-1 font-mono text-[9px] text-zinc-700">PLATFORM 2.0 · VERCEL</p>
      </div>
    </div>
  );
}

function StatusRow({ label, ready }: { readonly label: string; readonly ready?: boolean }) {
  return <div className="mt-3 flex items-center justify-between text-xs"><span className="text-zinc-500">{label}</span><span className={cn("flex items-center gap-1.5", ready ? "text-emerald-400" : "text-zinc-600")}><span className={cn("size-1.5 rounded-full", ready ? "bg-emerald-400" : "bg-zinc-700")} />{ready ? "جاهز" : "غير متاح"}</span></div>;
}

function AgentRow({ icon: Icon, label, model, ready }: { readonly icon: React.ElementType; readonly label: string; readonly model: string; readonly ready?: boolean }) {
  return <div className="agent-row"><span className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400"><Icon className="size-3.5" /></span><div className="min-w-0"><p className="truncate text-[11px] font-medium text-zinc-300">{label}</p><p className="font-mono text-[9px] text-zinc-600">{model}</p></div><span className={cn("ms-auto size-1.5 rounded-full", ready ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-zinc-700")} /></div>;
}

function ComposerAction({ hasInputText, isBusy, isResuming, onCancel }: { readonly hasInputText: boolean; readonly isBusy: boolean; readonly isResuming: boolean; readonly onCancel: () => void }) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;
  if (!isBusy || canSubmit) return <PromptInputSubmit aria-label="إرسال" className="rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300" disabled={isResuming} />;
  return <PromptInputButton aria-label="إيقاف التنفيذ" className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400" onClick={onCancel} variant="outline"><SquareIcon className="size-3 fill-current" /></PromptInputButton>;
}

function LoadingState() {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500"><span className="status-dot status-dot-busy" />استعادة الجلسة...</div>;
}

function PendingThinking() {
  return <Message aria-live="polite" from="assistant"><MessageContent><div className="inline-flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400"><BrainCircuitIcon className="size-4 animate-pulse text-emerald-400" /><Shimmer duration={1.2}>يحلّل الموجّه المهمة ويختار مسار التنفيذ...</Shimmer></div></MessageContent></Message>;
}

function ErrorMessage({ message }: { readonly message: string }) {
  return <Message from="assistant"><MessageContent><div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/8 p-4 text-sm text-rose-300" role="alert"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">تعذر إكمال التنفيذ</p><p className="mt-1 text-xs leading-5 text-zinc-400">{message}</p></div></div></MessageContent></Message>;
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
