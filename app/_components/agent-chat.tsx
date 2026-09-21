"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import {
  AlertCircleIcon,
  BotIcon,
  BrainIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  CloudIcon,
  Code2Icon,
  CpuIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  LayersIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PlayIcon,
  PlusIcon,
  SendIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SquareIcon,
  TerminalIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";
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

interface SuggestionCard {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly prompt: string;
  readonly icon: React.ElementType;
  readonly badgeColor: string;
}

const SUGGESTIONS: readonly SuggestionCard[] = [
  {
    id: "coding",
    title: "هندسة وتطوير البرمجيات",
    category: "Full-Stack Development",
    description: "كتابة مكونات React و Next.js، مراجعة وتصحيح الأكواد، وتحسين بنية المشاريع.",
    prompt:
      "اكتب مكون لوحة تحكم Dashboard كامل ومتقدم باستخدام Next.js 16 و Tailwind CSS مع عرض إحصائيات بيانية وبطاقات أداء تفاعلية ونوعيات TypeScript صارمة.",
    icon: Code2Icon,
    badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "database",
    title: "قواعد البيانات و Supabase",
    category: "PostgreSQL & RLS",
    description: "تصميم مخططات PostgreSQL معقدة، استعلامات متقدمة، وسياسات حماية وأمان البيانات.",
    prompt:
      "صمم مخطط قاعدة بيانات متكامل على Supabase PostgreSQL لنظام SaaS متعدد المستأجرين (Multi-tenant) مع جداول المستخدمين، الاشتراكات، وسياسات حماية البيانات RLS.",
    icon: DatabaseIcon,
    badgeColor: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },
  {
    id: "cloud",
    title: "النشر السحابي و Vercel",
    category: "DevOps & Infrastructure",
    description: "إعداد بيئات الإنتاج، حوسبة الحافة (Edge Functions)، وإدارة متغيرات البيئة السرية.",
    prompt:
      "اشرح خطوات نشر تطبيق Next.js عالي التوافر على Vercel مع ضبط متغيرات البيئة للإنتاج وسياسات التخزين المؤقت وحماية المسارات.",
    icon: CloudIcon,
    badgeColor: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  },
  {
    id: "analysis",
    title: "تحليل استراتيجي وأبحاث",
    category: "Deep Architecture Review",
    description: "دراسة المعماريات التقنية، مقارنة الحلول، وإعداد خطط العمل التنفيذية المنهجية.",
    prompt:
      "قم بعمل تحليل معماري شامل (System Architecture Review) لمنظومة وكلاء الذكاء الاصطناعي متعددة النماذج (Multi-Agent Swarm) وكيفية تحسين زمن الاستجابة وجودة المخرجات.",
    icon: SparklesIcon,
    badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
];

export function AgentChat({
  sessionId,
  sessionless = false,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  const [cancellationError, setCancellationError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] =
    useState<WorkflowPipelineType>("feature-delivery");

  const handleOpenWorkflowModal = (pipeline: WorkflowPipelineType) => {
    setSelectedPipeline(pipeline);
    setIsModalOpen(true);
  };

  const agent = useEveAgent({
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
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
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");
  const showPendingThinking =
    isBusy &&
    (agent.status === "submitted" || lastMessage?.role !== "assistant" || isPendingAssistantShell);
  const turnFailure = isBusy || isResuming ? undefined : getLatestTurnFailure(agent.events);
  const errorMessage = cancellationError ?? agent.error?.message ?? turnFailure;
  const hasConversationContent = sessionless || !isEmpty || errorMessage !== undefined;
  const showConversationLayout = isResuming || hasConversationContent;
  const activeSessionId = sessionId ?? agent.session?.sessionId;

  const requestCancellation = () => {
    setCancellationError(undefined);
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

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
    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    await agent.send(parts, options);
  };

  const handleSuggestionClick = (promptText: string) => {
    if (isBusy || isResuming) return;
    setCancellationError(undefined);
    void agent.send(promptText);
  };

  const composer = (
    <div className="w-full rounded-2xl border border-zinc-800/90 bg-zinc-900/90 p-2.5 shadow-2xl backdrop-blur-xl transition-colors focus-within:border-zinc-700/90">
      <div className="mb-2 flex items-center justify-between px-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="flex size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="font-medium text-zinc-300">Groq LPU ⚡ 120B Executive Orchestrator</span>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded border border-zinc-800 bg-zinc-950/60 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            131,072 Tokens
          </span>
          <span className="text-zinc-500">·</span>
          <span>Enter للإرسال</span>
        </div>
      </div>
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          className="min-h-[58px] resize-none border-none bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
          disabled={isResuming}
          onChange={(event) => setHasInputText(event.currentTarget.value.trim().length > 0)}
          placeholder="اكتب استفسارك، طلب كود، أو مسألة تقنية معقدة... (Enter للإرسال)"
        />
        <ComposerAction
          hasInputText={hasInputText}
          isBusy={isBusy}
          isResuming={isResuming}
          onCancel={requestCancellation}
        />
      </PromptInput>
    </div>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground font-sans">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-e border-zinc-800/80 bg-zinc-950/90 transition-all duration-300 ease-in-out z-30 shrink-0",
          isSidebarOpen ? "w-72 lg:w-80" : "w-0 overflow-hidden border-none",
        )}
      >
        <SidebarContent
          activeSessionId={activeSessionId}
          onOpenModal={handleOpenWorkflowModal}
        />
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isMobileDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col border-e border-zinc-800/80 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
              <span className="font-semibold text-sm text-zinc-200">القائمة الرئيسية</span>
              <Button
                aria-label="إغلاق القائمة"
                className="size-8 rounded-lg text-zinc-400 hover:text-zinc-100"
                onClick={() => setIsMobileDrawerOpen(false)}
                size="icon-sm"
                variant="ghost"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            <SidebarContent
              activeSessionId={activeSessionId}
              onOpenModal={handleOpenWorkflowModal}
            />
          </div>
        </div>
      ) : null}

      {/* Main Workspace Area */}
      <main className="relative flex flex-1 flex-col overflow-hidden min-w-0 bg-background">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              aria-label="تبديل القائمة الجانبية"
              className="size-8 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              onClick={() => {
                setIsSidebarOpen(!isSidebarOpen);
                setIsMobileDrawerOpen(!isMobileDrawerOpen);
              }}
              size="icon-sm"
              variant="ghost"
            >
              <PanelLeftIcon className="size-4.5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="relative flex size-6 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <BotIcon className="size-3.5" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100">
                adham.ai
              </span>
              <span className="hidden text-xs text-zinc-500 sm:inline">/</span>
              <span className="hidden text-xs text-zinc-400 sm:inline">منظومة الوكلاء التنفيذية</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Button
              aria-label="مسارات Mastra التنفيذية"
              className="gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 text-xs font-medium text-violet-300 hover:bg-violet-500/20 hover:text-white"
              onClick={() => handleOpenWorkflowModal("feature-delivery")}
              size="sm"
              variant="outline"
            >
              <ZapIcon className="size-3.5 text-violet-400" />
              <span className="hidden sm:inline">مسارات Mastra الذاتية</span>
              <span className="sm:hidden">Mastra ⚡</span>
            </Button>

            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs text-zinc-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="hidden font-medium text-[11px] lg:inline">Groq LPU ⚡ 120B + 2×27B Swarm</span>
              <span className="font-medium text-[11px] lg:hidden">Groq Swarm ⚡</span>
            </div>

            <Button
              aria-label="محادثة جديدة"
              className="gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
              onClick={() => window.location.assign("/s")}
              size="sm"
              variant="outline"
            >
              <PlusIcon className="size-3.5" />
              <span className="hidden sm:inline">محادثة جديدة</span>
            </Button>
          </div>
        </header>

        {/* Conversation Message Feed */}
        {showConversationLayout ? (
          <Conversation
            className="min-h-0 flex-1"
            initial={sessionId === undefined ? undefined : false}
            resize={activeSessionId === undefined ? "smooth" : "instant"}
            scrollRestorationKey={
              isEmpty || activeSessionId === undefined
                ? undefined
                : `eve:web-chat-scroll:${activeSessionId}`
            }
          >
            <ConversationTopFade className="top-0" />
            <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pt-6 pb-40 sm:px-6">
              {agent.data.messages.map((message, index) =>
                showPendingThinking &&
                isPendingAssistantShell &&
                message.id === lastMessage.id ? null : (
                  <AgentMessage
                    canRespond={!isBusy && !isResuming}
                    isStreaming={
                      agent.status === "streaming" && index === agent.data.messages.length - 1
                    }
                    key={message.id}
                    message={message}
                    onInputResponses={(inputResponses) => {
                      setCancellationError(undefined);
                      return agent.respond(inputResponses);
                    }}
                  />
                ),
              )}
              {showPendingThinking ? <PendingThinking /> : null}
              {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        ) : null}

        {/* Empty State Hero & Suggestion Cards */}
        {!showConversationLayout ? (
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
            <div className="flex w-full max-w-3xl flex-col items-center gap-8 text-center">
              {/* Hero Header */}
              <div className="flex flex-col items-center gap-3.5">
                <div className="relative flex size-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.15)]">
                  <BotIcon className="size-7" />
                  <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-zinc-950 border border-emerald-500/50 text-[9px] font-bold text-emerald-400">
                    ⚡
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-0.5 text-[11px] text-zinc-400">
                    <ZapIcon className="size-3 text-emerald-400" />
                    <span>منظومة Groq LPU فائقة السرعة · 120B + 2×27B</span>
                  </div>
                  <h1 className="font-bold text-3xl tracking-tight text-zinc-100 sm:text-4xl">
                    كيف يمكننا مساعدتك اليوم؟
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
                    وكيلك التنفيذي الذكي للبرمجة المتقدمة، إدارة قواعد البيانات، النشر السحابي، والتحليل العميق بدقة وسرعة قياسية.
                  </p>
                </div>
              </div>

              {/* 2x2 Suggestion Grid */}
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 text-right">
                {SUGGESTIONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      className="group flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-right transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/90 hover:shadow-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      key={item.id}
                      onClick={() => handleSuggestionClick(item.prompt)}
                      type="button"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex size-8 items-center justify-center rounded-lg border",
                              item.badgeColor,
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <span className="font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs leading-5 text-zinc-400">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* Floating Composer Container */}
        <div
          className={cn(
            "mx-auto w-full px-4 sm:px-6",
            showConversationLayout
              ? "fixed bottom-0 left-0 right-0 z-20 max-w-3xl bg-gradient-to-t from-background via-background/95 to-transparent pt-4 pb-6"
              : "w-full max-w-3xl pb-8",
          )}
        >
          {composer}
        </div>
      </main>

      <ExecutiveWorkflowsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPipeline={selectedPipeline}
        onSendToChat={(text) => {
          setCancellationError(undefined);
          void agent.send(text);
        }}
      />
    </div>
  );
}

function SidebarContent({
  activeSessionId,
  onOpenModal,
}: {
  readonly activeSessionId?: string;
  readonly onOpenModal?: (pipeline: WorkflowPipelineType) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4 text-right">
      <div className="flex flex-col gap-6">
        {/* Brand & Badge */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="relative flex size-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <CpuIcon className="size-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-zinc-100">adham.ai</span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  PRO
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">Executive Swarm 2026</span>
            </div>
          </div>
        </div>

        {/* New Chat Quick Button */}
        <Button
          className="w-full justify-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white shadow-sm"
          onClick={() => window.location.assign("/s")}
          size="default"
          variant="outline"
        >
          <PlusIcon className="size-4 text-emerald-400" />
          <span>محادثة جديدة</span>
          <span className="ms-auto rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
            ⌘N
          </span>
        </Button>

        {/* Multi-Agent Swarm Telemetry */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-zinc-200">معمارية الوكلاء (Groq Swarm)</span>
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex flex-col gap-2">
            {/* Orchestrator */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/60 px-2.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">👑</span>
                <div className="flex flex-col">
                  <span className="font-medium text-zinc-200">الموجّه (Orchestrator)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">gpt-oss-120b</span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                131k ctx
              </span>
            </div>

            {/* Executor */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/60 px-2.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">⚡</span>
                <div className="flex flex-col">
                  <span className="font-medium text-zinc-200">المنفّذ (Executor)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">qwen3.8-27b</span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                131k ctx
              </span>
            </div>

            {/* Analyst */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/60 px-2.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">🔍</span>
                <div className="flex flex-col">
                  <span className="font-medium text-zinc-200">المحلّل (Analyst)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">qwen3.8-27b</span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                131k ctx
              </span>
            </div>
          </div>
        </div>

        {/* Mastra Autonomous Engineering Pipelines */}
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-zinc-200">المسارات التنفيذية الذاتية (Mastra)</span>
            <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-mono font-medium text-violet-400">
              DAG
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onOpenModal?.("feature-delivery")}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2 text-right text-[11px] text-zinc-300 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-white cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 group-hover:scale-110 transition-transform">🚀</span>
                <span>تسليم الميزات الكاملة</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-emerald-400">تشغيل ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal?.("database-engineering")}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2 text-right text-[11px] text-zinc-300 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-white cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-blue-400 group-hover:scale-110 transition-transform">🗄️</span>
                <span>هندسة قواعد البيانات</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-blue-400">تشغيل ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal?.("code-audit-repair")}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2 text-right text-[11px] text-zinc-300 transition-all hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-white cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 group-hover:scale-110 transition-transform">🛡️</span>
                <span>التدقيق والإصلاح الذاتي</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-amber-400">تشغيل ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal?.("release-readiness")}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2 text-right text-[11px] text-zinc-300 transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-violet-400 group-hover:scale-110 transition-transform">🌐</span>
                <span>جاهزية النشر والإصدار</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-violet-400">تشغيل ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal?.("architecture-evaluation")}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2 text-right text-[11px] text-zinc-300 transition-all hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 hover:text-white cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-fuchsia-400 group-hover:scale-110 transition-transform">⚖️</span>
                <span>التقييم المعماري و ADRs</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-fuchsia-400">تشغيل ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal?.("incident-response")}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2 text-right text-[11px] text-zinc-300 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-white cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-rose-400 group-hover:scale-110 transition-transform">🚨</span>
                <span>طوارئ و SRE ومراجعة الحادث</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-rose-400">تشغيل ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal?.("continual-learning")}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2 text-right text-[11px] text-zinc-300 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-white cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-400 group-hover:scale-110 transition-transform">🧠</span>
                <span>التعلم وبوابات السياق</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-cyan-400">تشغيل ⚡</span>
            </button>

            <Button
              size="sm"
              variant="outline"
              className="mt-1 w-full text-xs font-medium border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-white"
              onClick={() => onOpenModal?.("feature-delivery")}
            >
              لوحة تحكم Mastra التنفيذية ⚡
            </Button>
          </div>
        </div>

        {/* Connected Cloud Services */}
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
          <span className="font-semibold text-xs text-zinc-200">الربط السحابي (Cloud Connectors)</span>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ZapIcon className="size-3.5 text-amber-400" />
                <span>Groq LPU Engine</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">متصل ●</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <DatabaseIcon className="size-3.5 text-emerald-400" />
                <span>Supabase PostgreSQL</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">متصل ●</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <CloudIcon className="size-3.5 text-blue-400" />
                <span>Vercel Edge Platform</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">متصل ●</span>
            </div>
          </div>
        </div>

        {/* Sessions & Navigation */}
        <div className="flex flex-col gap-2">
          <span className="px-1 text-xs font-semibold text-zinc-400">الجلسة النشطة</span>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-300 truncate max-w-[170px]">
                {activeSessionId ? `جلسة #${activeSessionId.slice(0, 8)}` : "جلسة عمل جديدة"}
              </span>
              <span className="size-2 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="border-t border-zinc-800/60 pt-3 text-[11px] text-zinc-500">
        <div className="flex items-center justify-between">
          <span>الإصدار الإنتاجي 2026</span>
          <span className="font-mono text-[10px] text-zinc-400">v1.2.0 · Live</span>
        </div>
      </div>
    </div>
  );
}

function ComposerAction({
  hasInputText,
  isBusy,
  isResuming,
  onCancel,
}: {
  readonly hasInputText: boolean;
  readonly isBusy: boolean;
  readonly isResuming: boolean;
  readonly onCancel: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;

  if (!isBusy || canSubmit) {
    return (
      <PromptInputSubmit
        className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
        disabled={isResuming}
      />
    );
  }

  return (
    <PromptInputButton
      aria-label="Stop"
      className="absolute right-2.5 bottom-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
      onClick={onCancel}
      variant="outline"
    >
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  );
}

function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <Message className="max-w-full" from="assistant">
      <MessageContent>
        <div
          className="flex w-full items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive"
          role="alert"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">تعذر إكمال الطلب</p>
            <p className="text-xs leading-5 text-muted-foreground">{message}</p>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function PendingThinking() {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
          <div className="relative flex size-6 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <BrainIcon className="size-3.5 animate-pulse" />
          </div>
          <Shimmer duration={1.2}>جاري استدعاء الوكلاء والتفكير في الحل...</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to cancel the response.";
}

function getLatestTurnFailure(
  events: ReturnType<typeof useEveAgent>["events"],
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type === "turn.failed") {
      return event.data.code === "MODEL_CALL_FAILED"
        ? "تعذر تشغيل النموذج حاليًا. نموذج Groq هذا غير متاح للحساب المجاني عبر Vercel AI Gateway؛ أضف رصيدًا مدفوعًا في Vercel AI أو اختر نموذجًا متاحًا ثم أعد المحاولة."
        : event.data.message;
    }

    if (event.type === "turn.completed" || event.type === "turn.cancelled") {
      return undefined;
    }

    if (event.type === "message.received") {
      return undefined;
    }
  }

  return undefined;
}
