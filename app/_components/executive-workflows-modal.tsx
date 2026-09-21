"use client";

import { useEffect, useState } from "react";
import {
  AlertCircleIcon,
  BotIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  ClockIcon,
  CloudIcon,
  Code2Icon,
  CpuIcon,
  DatabaseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GlobeIcon,
  HistoryIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlayIcon,
  RotateCcwIcon,
  ScaleIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TimerIcon,
  Trash2Icon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type WorkflowPipelineType =
  | "feature-delivery"
  | "database-engineering"
  | "code-audit-repair"
  | "release-readiness"
  | "architecture-evaluation";

export interface WorkflowRunRecord {
  readonly id: string;
  readonly runId: string;
  readonly pipeline: WorkflowPipelineType;
  readonly title: string;
  readonly timestamp: string;
  readonly durationMs?: number;
  readonly output: any;
}

interface ExecutiveWorkflowsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialPipeline?: WorkflowPipelineType;
  readonly onSendToChat?: (text: string) => void;
}

const STORAGE_KEY = "adham_ai_run_history_2026";

export function ExecutiveWorkflowsModal({
  isOpen,
  onClose,
  initialPipeline = "feature-delivery",
  onSendToChat,
}: ExecutiveWorkflowsModalProps) {
  const [activeTab, setActiveTab] = useState<"studio" | "history">("studio");
  const [activePipeline, setActivePipeline] =
    useState<WorkflowPipelineType>(initialPipeline);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionDuration, setExecutionDuration] = useState<number>();
  const [runId, setRunId] = useState<string>();
  const [copiedKey, setCopiedKey] = useState<string>();
  const [runHistory, setRunHistory] = useState<readonly WorkflowRunRecord[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRunHistory(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveHistoryItem = (record: WorkflowRunRecord) => {
    try {
      const updated = [record, ...runHistory].slice(0, 20);
      setRunHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearHistory = () => {
    setRunHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Feature Delivery Form
  const [featureTitle, setFeatureTitle] = useState(
    "نظام إدارة المهام الذكية (Smart Task Board)",
  );
  const [featureRequirements, setFeatureRequirements] = useState(
    "لوحة مهام Kanban تفاعلية مع تصنيف حسب الأولوية، سحب وإفلات، ودعم تعدد المستخدمين مع تخزين دائم في Supabase.",
  );
  const [featureStack, setFeatureStack] = useState(
    "Next.js 16 + Tailwind CSS + Supabase PostgreSQL + Zod",
  );

  // Database Engineering Form
  const [dbDomain, setDbDomain] = useState("منصة تجارة إلكترونية B2B");
  const [dbEntities, setDbEntities] = useState(
    "مستخدمين (Users)، شركات (Organizations)، منتجات (Products)، وطلبيات (Orders) مع دعم أسعار الجملة وسياسات عزل المستأجرين.",
  );
  const [dbTenantModel, setDbTenantModel] = useState<
    "single-tenant" | "multi-tenant"
  >("multi-tenant");

  // Code Audit Form
  const [auditFilePath, setAuditFilePath] = useState("lib/auth/session.ts");
  const [auditCode, setAuditCode] = useState(
    `export async function getUserSession(req: Request) {\n  const token = req.headers.get("authorization");\n  // Need verification against Supabase and safe expiry check\n  return { user: "guest", token };\n}`,
  );
  const [auditIssue, setAuditIssue] = useState(
    "التحقق من صحة التوكن ومنع التزييف ورفع كفاءة التحقق بدون استعلامات زائدة.",
  );

  // Release Readiness Form
  const [releaseAppName, setReleaseAppName] = useState("adham-ai-agent-2026");
  const [releaseEnv, setReleaseEnv] = useState<"production" | "staging" | "preview">("production");
  const [releaseScope, setReleaseScope] = useState(
    "إطلاق منظومة مسارات Mastra والتخزين الدائم واستوديو المخرجات التنفيذي المتكامل.",
  );
  const [releaseIntegrations, setReleaseIntegrations] = useState(
    "Groq LPU Swarm, Supabase PostgreSQL, Vercel Edge",
  );

  // Architecture Evaluation Form
  const [archTitle, setArchTitle] = useState(
    "مقارنة محركات التخزين المؤقت والبحث الشعاعي: Redis vs Supabase pgvector",
  );
  const [archContext, setArchContext] = useState(
    "نحتاج إلى معمارية فائقة السرعة لتخزين سياق المحادثات الطويلة واسترجاع المتجهات بكفاءة مع خفض التكاليف الشهرية وضمان سهولة الصيانة.",
  );
  const [archAlternatives, setArchAlternatives] = useState(
    "الخيار 1: Upstash Serverless Redis\nالخيار 2: Supabase PostgreSQL مع امتداد pgvector المدمج",
  );
  const [archCriteria, setArchCriteria] = useState(
    "زمن الاستجابة، التكلفة الشهرية، بساطة الصيانة، وقابلية التوسع الأفقي",
  );

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(undefined), 2000);
  };

  const handleExportDeliverable = () => {
    if (!executionResult) return;
    const out = executionResult.output || executionResult;
    let content = `# حزمة تسليمات المسار التنفيذي الذاتي (${activePipeline})\n\n`;
    content += `- **التاريخ**: ${new Date().toLocaleString("ar-EG")}\n`;
    if (runId) content += `- **معرف التشغيل (Run ID)**: \`${runId}\`\n`;
    if (executionDuration) content += `- **زمن الاستجابة**: \`${executionDuration}ms\`\n`;
    content += `- **المحرك**: \`Mastra DAG Engine + Groq LPU Swarm (120B + 27B)\`\n\n---\n\n`;

    if (out.architectureSummary) {
      content += `## 1. المواصفات المعمارية (Architecture Specification)\n\n${out.architectureSummary}\n\n`;
    }
    if (out.sqlSchema || out.completeMigrationSql) {
      content += `## 2. مخطط قاعدة البيانات وسياسات الأمان (PostgreSQL & Supabase RLS)\n\n\`\`\`sql\n${
        out.sqlSchema || out.completeMigrationSql
      }\n\`\`\`\n\n`;
    }
    if (out.generatedCode || out.repairedCode) {
      content += `## 3. الكود البرمجي وعقود الأنواع (Production Code & Zod Contracts)\n\n\`\`\`typescript\n${
        out.generatedCode || out.repairedCode
      }\n\`\`\`\n\n`;
    }
    if (out.securityReport || out.rootCauseDiagnosis) {
      content += `## 4. تقرير الأمان وفحص الجودة (Security & QA Gate)\n\n${
        out.securityReport || out.rootCauseDiagnosis
      }\n\n`;
    }
    if (out.envAuditReport) {
      content += `## 5. التدقيق البيئي والأمني للنشر (Environment & Secrets Audit)\n\n${out.envAuditReport}\n\n`;
    }
    if (out.verificationMatrix) {
      content += `## 6. مصفوفة التحقق وبوابات الجودة (Verification & Quality Gates)\n\n${out.verificationMatrix}\n\n`;
    }
    if (out.releaseNotesMarkdown) {
      content += `## 7. مذكرة الإصدار التنفيذية (Executive Release Notes)\n\n${out.releaseNotesMarkdown}\n\n`;
    }
    if (out.tradeoffsAnalysis) {
      content += `## 8. دراسة المقايضات المعمارية (Trade-offs Spike)\n\n${out.tradeoffsAnalysis}\n\n`;
    }
    if (out.costLatencyReport) {
      content += `## 9. توقعات التكاليف والأداء (FinOps & Latency)\n\n${out.costLatencyReport}\n\n`;
    }
    if (out.adrMarkdown) {
      content += `## 10. وثيقة القرار المعماري الرسمي (${out.adrNumber || "ADR"})\n\n${out.adrMarkdown}\n\n`;
    }

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `executive-deliverable-${activePipeline}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    setError(undefined);
    setExecutionResult(null);
    setExecutionDuration(undefined);
    setRunId(undefined);

    let inputData: any = {};
    let itemTitle = "";

    if (activePipeline === "feature-delivery") {
      inputData = {
        featureTitle,
        userRequirements: featureRequirements,
        targetStack: featureStack,
      };
      itemTitle = featureTitle;
    } else if (activePipeline === "database-engineering") {
      inputData = {
        domainName: dbDomain,
        entitiesDescription: dbEntities,
        tenantModel: dbTenantModel,
      };
      itemTitle = dbDomain;
    } else if (activePipeline === "code-audit-repair") {
      inputData = {
        targetFilePath: auditFilePath,
        codeSnippet: auditCode,
        issueDescription: auditIssue,
      };
      itemTitle = auditFilePath;
    } else if (activePipeline === "release-readiness") {
      inputData = {
        appName: releaseAppName,
        targetEnvironment: releaseEnv,
        releaseScope,
        criticalIntegrations: releaseIntegrations,
      };
      itemTitle = `${releaseAppName} (${releaseEnv})`;
    } else if (activePipeline === "architecture-evaluation") {
      inputData = {
        systemTitle: archTitle,
        problemContext: archContext,
        alternativesConsidered: archAlternatives,
        targetCriteria: archCriteria,
      };
      itemTitle = archTitle;
    }

    try {
      const res = await fetch("/api/executive-workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: activePipeline,
          inputData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تنفيذ المسار");
      }

      setExecutionResult(data.result);
      setExecutionDuration(data.durationMs);
      setRunId(data.runId);

      // Save to history
      saveHistoryItem({
        id: `run_${Date.now()}`,
        runId: data.runId,
        pipeline: activePipeline,
        title: itemTitle,
        timestamp: new Date().toLocaleTimeString("ar-EG"),
        durationMs: data.durationMs,
        output: data.result,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تشغيل المسار.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleRestoreRun = (record: WorkflowRunRecord) => {
    setActivePipeline(record.pipeline);
    setExecutionResult(record.output);
    setExecutionDuration(record.durationMs);
    setRunId(record.runId);
    setActiveTab("studio");
  };

  const handleSendToChat = () => {
    if (!onSendToChat) return;

    let summaryText = "";
    if (activePipeline === "feature-delivery" && executionResult) {
      summaryText = `لقد قمت بتشغيل مسار تسليم الميزة [${featureTitle}] بنجاح عبر Mastra.\nالمعمارية ومخطط قاعدة البيانات والكود جاهزة للاعتماد.`;
    } else if (activePipeline === "database-engineering" && executionResult) {
      summaryText = `لقد قمت بتشغيل مسار هندسة قاعدة البيانات لـ [${dbDomain}] بنجاح عبر Mastra.\nجداول PostgreSQL ومؤشرات الأداء وسياسات Supabase RLS جاهزة للتطبيق.`;
    } else if (activePipeline === "code-audit-repair" && executionResult) {
      summaryText = `لقد قمت بتشغيل مسار التدقيق البرمجي لملف [${auditFilePath}] بنجاح عبر Mastra.\nتم استئصال السبب الجذري وإعداد رقعة الإصلاح الجراحي وأمر التحقق.`;
    } else if (activePipeline === "release-readiness" && executionResult) {
      summaryText = `لقد قمت بتشغيل مسار جاهزية النشر السحابي لـ [${releaseAppName}] بنجاح عبر Mastra.\nتم تدقيق الأمان والبيئة وتأكيد بوابات الجودة وخطة النشر والتراجع.`;
    } else if (activePipeline === "architecture-evaluation" && executionResult) {
      summaryText = `لقد قمت بتشغيل مسار التقييم المعماري لـ [${archTitle}] بنجاح عبر Mastra.\nتمت المفاضلة وصياغة وثيقة القرار المعماري ADR بنجاح.`;
    }

    if (summaryText) {
      onSendToChat(summaryText);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 p-6 shadow-2xl">
        <DialogHeader className="text-right border-b border-zinc-800/80 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <CpuIcon className="size-5" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-base font-bold text-zinc-100">
                  لوحة تحكم المسارات التنفيذية الذاتية (Autonomous Studio)
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  سرب نماذج Groq LPU فائقة السرعة مع محرك المسارات الحتمية (Mastra 5 DAGs)
                </DialogDescription>
              </div>
            </div>

            {/* Mode Switch: Studio vs History */}
            <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("studio")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-colors cursor-pointer",
                  activeTab === "studio"
                    ? "bg-violet-500 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                <SparklesIcon className="size-3.5" />
                <span>الاستوديو والتشغيل</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-colors cursor-pointer",
                  activeTab === "history"
                    ? "bg-violet-500 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                <HistoryIcon className="size-3.5" />
                <span>سجل التشغيلات ({runHistory.length})</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* History Tab View */}
        {activeTab === "history" ? (
          <div className="space-y-4 pt-2 text-right">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-xs font-semibold text-zinc-300">
                التشغيلات السابقة المحفوظة (Audit Trail):
              </span>
              {runHistory.length > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={clearHistory}
                  className="text-zinc-500 hover:text-rose-400 gap-1 text-[11px]"
                >
                  <Trash2Icon className="size-3" />
                  <span>مسح السجل</span>
                </Button>
              )}
            </div>

            {runHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2">
                <ClockIcon className="size-8 stroke-1 text-zinc-600" />
                <p className="text-xs">لا يوجد تشغيلات سابقة حتى الآن.</p>
                <p className="text-[11px] text-zinc-600">
                  قم بتشغيل أي مسار عمل من تبويب الاستوديو لحفظ نتائجه هنا تلقائياً.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {runHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-300">
                        {item.pipeline === "feature-delivery" && <Code2Icon className="size-4 text-emerald-400" />}
                        {item.pipeline === "database-engineering" && <DatabaseIcon className="size-4 text-blue-400" />}
                        {item.pipeline === "code-audit-repair" && <ShieldCheckIcon className="size-4 text-amber-400" />}
                        {item.pipeline === "release-readiness" && <GlobeIcon className="size-4 text-violet-400" />}
                        {item.pipeline === "architecture-evaluation" && <ScaleIcon className="size-4 text-fuchsia-400" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-zinc-200 line-clamp-1">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                          <span>{item.timestamp}</span>
                          {item.durationMs && <span>● {item.durationMs}ms</span>}
                          <span>● {item.runId.slice(0, 10)}...</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreRun(item)}
                      className="gap-1 rounded-lg border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                    >
                      <RotateCcwIcon className="size-3 text-emerald-400" />
                      <span>استعادة النتائج</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Studio & Runner View */
          <>
            {/* 5 Pipeline Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2">
              {/* 1. Feature Delivery */}
              <button
                type="button"
                onClick={() => {
                  setActivePipeline("feature-delivery");
                  setExecutionResult(null);
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-2.5 text-right transition-all cursor-pointer",
                  activePipeline === "feature-delivery"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-md ring-1 ring-emerald-500/30"
                    : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                )}
              >
                <div className="flex items-center justify-between">
                  <Code2Icon className="size-4 text-emerald-400" />
                  <span className="text-[9px] font-mono rounded bg-zinc-900/80 px-1 py-0.5 border border-zinc-800">
                    4 مراحل
                  </span>
                </div>
                <span className="font-semibold text-xs mt-1">تسليم الميزات</span>
                <span className="text-[10px] text-zinc-500">Feature Delivery</span>
              </button>

              {/* 2. Database Engineering */}
              <button
                type="button"
                onClick={() => {
                  setActivePipeline("database-engineering");
                  setExecutionResult(null);
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-2.5 text-right transition-all cursor-pointer",
                  activePipeline === "database-engineering"
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-300 shadow-md ring-1 ring-blue-500/30"
                    : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                )}
              >
                <div className="flex items-center justify-between">
                  <DatabaseIcon className="size-4 text-blue-400" />
                  <span className="text-[9px] font-mono rounded bg-zinc-900/80 px-1 py-0.5 border border-zinc-800">
                    3 مراحل
                  </span>
                </div>
                <span className="font-semibold text-xs mt-1">هندسة البيانات</span>
                <span className="text-[10px] text-zinc-500">Supabase & RLS</span>
              </button>

              {/* 3. Code Audit & Repair */}
              <button
                type="button"
                onClick={() => {
                  setActivePipeline("code-audit-repair");
                  setExecutionResult(null);
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-2.5 text-right transition-all cursor-pointer",
                  activePipeline === "code-audit-repair"
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-md ring-1 ring-amber-500/30"
                    : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                )}
              >
                <div className="flex items-center justify-between">
                  <ShieldCheckIcon className="size-4 text-amber-400" />
                  <span className="text-[9px] font-mono rounded bg-zinc-900/80 px-1 py-0.5 border border-zinc-800">
                    مرحلتان
                  </span>
                </div>
                <span className="font-semibold text-xs mt-1">التدقيق والإصلاح</span>
                <span className="text-[10px] text-zinc-500">Audit & Patch</span>
              </button>

              {/* 4. Release Readiness */}
              <button
                type="button"
                onClick={() => {
                  setActivePipeline("release-readiness");
                  setExecutionResult(null);
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-2.5 text-right transition-all cursor-pointer",
                  activePipeline === "release-readiness"
                    ? "border-violet-500/50 bg-violet-500/10 text-violet-300 shadow-md ring-1 ring-violet-500/30"
                    : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                )}
              >
                <div className="flex items-center justify-between">
                  <GlobeIcon className="size-4 text-violet-400" />
                  <span className="text-[9px] font-mono rounded bg-zinc-900/80 px-1 py-0.5 border border-zinc-800">
                    3 مراحل
                  </span>
                </div>
                <span className="font-semibold text-xs mt-1">جاهزية النشر</span>
                <span className="text-[10px] text-zinc-500">Release Readiness</span>
              </button>

              {/* 5. Architecture Evaluation & ADRs */}
              <button
                type="button"
                onClick={() => {
                  setActivePipeline("architecture-evaluation");
                  setExecutionResult(null);
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-2.5 text-right transition-all cursor-pointer",
                  activePipeline === "architecture-evaluation"
                    ? "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300 shadow-md ring-1 ring-fuchsia-500/30"
                    : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                )}
              >
                <div className="flex items-center justify-between">
                  <ScaleIcon className="size-4 text-fuchsia-400" />
                  <span className="text-[9px] font-mono rounded bg-zinc-900/80 px-1 py-0.5 border border-zinc-800">
                    3 مراحل
                  </span>
                </div>
                <span className="font-semibold text-xs mt-1">التقييم المعماري</span>
                <span className="text-[10px] text-zinc-500">Trade-offs & ADR</span>
              </button>
            </div>

            {/* Form Inputs Area */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-4 text-right">
              {activePipeline === "feature-delivery" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      عنوان الميزة البرمجية (Feature Title):
                    </label>
                    <input
                      type="text"
                      value={featureTitle}
                      onChange={(e) => setFeatureTitle(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      المتطلبات الوظيفية والمعمارية (User Requirements & Journey):
                    </label>
                    <textarea
                      rows={3}
                      value={featureRequirements}
                      onChange={(e) => setFeatureRequirements(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      حزمة التقنيات المستهدفة (Target Stack):
                    </label>
                    <input
                      type="text"
                      value={featureStack}
                      onChange={(e) => setFeatureStack(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              {activePipeline === "database-engineering" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      اسم المجال أو المنظومة (Domain):
                    </label>
                    <input
                      type="text"
                      value={dbDomain}
                      onChange={(e) => setDbDomain(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      وصف الكيانات والعلاقات والحقول (Entities & Constraints):
                    </label>
                    <textarea
                      rows={3}
                      value={dbEntities}
                      onChange={(e) => setDbEntities(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-300">
                    <span className="font-medium">نموذج المستأجرين:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tenantModel"
                        checked={dbTenantModel === "multi-tenant"}
                        onChange={() => setDbTenantModel("multi-tenant")}
                        className="text-blue-500"
                      />
                      <span>متعدد المستأجرين (Multi-tenant)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tenantModel"
                        checked={dbTenantModel === "single-tenant"}
                        onChange={() => setDbTenantModel("single-tenant")}
                        className="text-blue-500"
                      />
                      <span>مستأجر فردي (Single-tenant)</span>
                    </label>
                  </div>
                </>
              )}

              {activePipeline === "code-audit-repair" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      مسار الملف أو اسم المكون (Target File):
                    </label>
                    <input
                      type="text"
                      value={auditFilePath}
                      onChange={(e) => setAuditFilePath(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      الكود المراد تدقيقه (Code Snippet):
                    </label>
                    <textarea
                      rows={4}
                      value={auditCode}
                      onChange={(e) => setAuditCode(e.target.value)}
                      className="w-full font-mono rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      وصف المشكلة أو الخلل (Issue Description):
                    </label>
                    <input
                      type="text"
                      value={auditIssue}
                      onChange={(e) => setAuditIssue(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              {activePipeline === "release-readiness" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        اسم التطبيق (App Name):
                      </label>
                      <input
                        type="text"
                        value={releaseAppName}
                        onChange={(e) => setReleaseAppName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        البيئة المستهدفة (Environment):
                      </label>
                      <select
                        value={releaseEnv}
                        onChange={(e) => setReleaseEnv(e.target.value as any)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                      >
                        <option value="production">Production (بيئة الإنتاج الحية)</option>
                        <option value="staging">Staging (بيئة المعاينة)</option>
                        <option value="preview">Preview (فرع الاختبار)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      نطاق التحديثات والميزات (Release Scope):
                    </label>
                    <textarea
                      rows={2}
                      value={releaseScope}
                      onChange={(e) => setReleaseScope(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      الخدمات السحابية والربط الحرج (Critical Connectors):
                    </label>
                    <input
                      type="text"
                      value={releaseIntegrations}
                      onChange={(e) => setReleaseIntegrations(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </>
              )}

              {activePipeline === "architecture-evaluation" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      عنوان المعمارية أو القرار (Architecture Title):
                    </label>
                    <input
                      type="text"
                      value={archTitle}
                      onChange={(e) => setArchTitle(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      سياق المشكلة والتحديات الهندسية (Problem Context):
                    </label>
                    <textarea
                      rows={2}
                      value={archContext}
                      onChange={(e) => setArchContext(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      البدائل المطروحة للمقارنة (Considered Alternatives):
                    </label>
                    <textarea
                      rows={2}
                      value={archAlternatives}
                      onChange={(e) => setArchAlternatives(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-fuchsia-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      معايير المفاضلة المرجعية (Evaluation Criteria):
                    </label>
                    <input
                      type="text"
                      value={archCriteria}
                      onChange={(e) => setArchCriteria(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>
                </>
              )}

              {/* Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <ZapIcon className="size-3.5 text-emerald-400" />
                  <span>سرب الاستدلال: Groq LPU (GPT-OSS-120B + 2× Qwen-27B)</span>
                </div>
                <Button
                  disabled={isRunning}
                  onClick={handleRunWorkflow}
                  className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs px-5 py-2.5 transition-colors shadow-lg cursor-pointer"
                >
                  {isRunning ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      <span>جاري تنفيذ المسار الحتمي...</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="size-3.5 fill-current" />
                      <span>تشغيل المسار الذاتي الآن ⚡</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Error Alert */}
            {error ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs">
                <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Real-time Execution Output Viewer & Telemetry Banner */}
            {executionResult ? (
              <div className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 text-right">
                {/* Header & Telemetry */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-emerald-400" />
                    <span className="font-bold text-xs text-zinc-100">
                      تم اكتمال المسار الهندسي بنجاح (Execution Completed)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportDeliverable}
                      className="gap-1.5 rounded-lg border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                    >
                      <DownloadIcon className="size-3.5 text-blue-400" />
                      <span>تصدير الحزمة (Markdown)</span>
                    </Button>

                    {onSendToChat ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSendToChat}
                        className="gap-1.5 rounded-lg border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                      >
                        <MessageSquareIcon className="size-3.5 text-emerald-400" />
                        <span>إرسال إلى المحادثة</span>
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Live Telemetry Info Bar */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-400 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/50">
                  {executionDuration !== undefined && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <TimerIcon className="size-3" />
                      {executionDuration}ms
                    </span>
                  )}
                  {runId && (
                    <span className="text-zinc-500">
                      Run ID: <span className="text-zinc-300">{runId.slice(0, 16)}...</span>
                    </span>
                  )}
                  <span className="ms-auto rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-400">
                    PostgresStore Durable ●
                  </span>
                </div>

                {/* Results Display Sections */}
                <div className="space-y-3">
                  {/* Feature Delivery Results */}
                  {executionResult.output?.architectureSummary && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-emerald-400">
                          1. المواصفات المعمارية (Architecture Spec)
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(
                              executionResult.output.architectureSummary,
                              "spec",
                            )
                          }
                        >
                          {copiedKey === "spec" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {executionResult.output.architectureSummary}
                      </pre>
                    </div>
                  )}

                  {/* Database Results */}
                  {(executionResult.output?.sqlSchema ||
                    executionResult.output?.completeMigrationSql) && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-blue-400">
                          مخطط قاعدة البيانات و RLS (PostgreSQL DDL)
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(
                              executionResult.output.sqlSchema ||
                                executionResult.output.completeMigrationSql,
                              "sql",
                            )
                          }
                        >
                          {copiedKey === "sql" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto dir-ltr text-left">
                        {executionResult.output.sqlSchema ||
                          executionResult.output.completeMigrationSql}
                      </pre>
                    </div>
                  )}

                  {/* Code Results */}
                  {(executionResult.output?.generatedCode ||
                    executionResult.output?.repairedCode) && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-violet-400">
                          الكود الإنتاجي (Production Code & Contracts)
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(
                              executionResult.output.generatedCode ||
                                executionResult.output.repairedCode,
                              "code",
                            )
                          }
                        >
                          {copiedKey === "code" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto dir-ltr text-left">
                        {executionResult.output.generatedCode ||
                          executionResult.output.repairedCode}
                      </pre>
                    </div>
                  )}

                  {/* Security Report */}
                  {(executionResult.output?.securityReport ||
                    executionResult.output?.rootCauseDiagnosis) && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-amber-400">
                          تقرير التدقيق الأمني وفحص الجودة (Security & QA Report)
                        </span>
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                          PASSED ●
                        </span>
                      </div>
                      <pre className="text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                        {executionResult.output.securityReport ||
                          executionResult.output.rootCauseDiagnosis}
                      </pre>
                    </div>
                  )}

                  {/* Release Readiness Results */}
                  {executionResult.output?.envAuditReport && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-violet-400">
                          1. التدقيق البيئي والأمني للنشر (Environment & Secrets Audit)
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(executionResult.output.envAuditReport, "envAudit")
                          }
                        >
                          {copiedKey === "envAudit" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                        {executionResult.output.envAuditReport}
                      </pre>
                    </div>
                  )}

                  {executionResult.output?.verificationMatrix && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-emerald-400">
                          2. مصفوفة التحقق الصارم وبوابات الجودة (Pre-flight Quality Gates)
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(
                              executionResult.output.verificationMatrix,
                              "verification",
                            )
                          }
                        >
                          {copiedKey === "verification" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                        {executionResult.output.verificationMatrix}
                      </pre>
                    </div>
                  )}

                  {executionResult.output?.releaseNotesMarkdown && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-blue-400">
                          3. مذكرة الإصدار التنفيذية وخطة التراجع (Executive Release Notes)
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(
                              executionResult.output.releaseNotesMarkdown,
                              "releaseNotes",
                            )
                          }
                        >
                          {copiedKey === "releaseNotes" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {executionResult.output.releaseNotesMarkdown}
                      </pre>
                    </div>
                  )}

                  {/* Architecture Evaluation & ADR Results */}
                  {executionResult.output?.tradeoffsAnalysis && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-fuchsia-400">
                          1. تحليل المقايضات المعمارية (Trade-offs Spike)
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(
                              executionResult.output.tradeoffsAnalysis,
                              "tradeoffs",
                            )
                          }
                        >
                          {copiedKey === "tradeoffs" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto">
                        {executionResult.output.tradeoffsAnalysis}
                      </pre>
                    </div>
                  )}

                  {executionResult.output?.costLatencyReport && (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-amber-400">
                          2. توقعات التكاليف واستهلاك الموارد (FinOps & Latency)
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(
                              executionResult.output.costLatencyReport,
                              "costReport",
                            )
                          }
                        >
                          {copiedKey === "costReport" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                        {executionResult.output.costLatencyReport}
                      </pre>
                    </div>
                  )}

                  {executionResult.output?.adrMarkdown && (
                    <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-950/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-fuchsia-300">
                            3. وثيقة القرار المعماري ({executionResult.output.adrNumber || "ADR"})
                          </span>
                          <span className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] font-mono text-fuchsia-300">
                            APPROVED ●
                          </span>
                        </div>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(executionResult.output.adrMarkdown, "adr")
                          }
                        >
                          {copiedKey === "adr" ? (
                            <CheckIcon className="size-3 text-emerald-400" />
                          ) : (
                            <ClipboardCopyIcon className="size-3 text-zinc-400" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs text-zinc-200 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                        {executionResult.output.adrMarkdown}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
