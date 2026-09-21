"use client";

import { useState } from "react";
import {
  AlertCircleIcon,
  BotIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  CloudIcon,
  Code2Icon,
  CpuIcon,
  DatabaseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GlobeIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlayIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TimerIcon,
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
  | "release-readiness";

interface ExecutiveWorkflowsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialPipeline?: WorkflowPipelineType;
  readonly onSendToChat?: (text: string) => void;
}

export function ExecutiveWorkflowsModal({
  isOpen,
  onClose,
  initialPipeline = "feature-delivery",
  onSendToChat,
}: ExecutiveWorkflowsModalProps) {
  const [activePipeline, setActivePipeline] =
    useState<WorkflowPipelineType>(initialPipeline);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionDuration, setExecutionDuration] = useState<number>();
  const [runId, setRunId] = useState<string>();
  const [copiedKey, setCopiedKey] = useState<string>();

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
    if (activePipeline === "feature-delivery") {
      inputData = {
        featureTitle,
        userRequirements: featureRequirements,
        targetStack: featureStack,
      };
    } else if (activePipeline === "database-engineering") {
      inputData = {
        domainName: dbDomain,
        entitiesDescription: dbEntities,
        tenantModel: dbTenantModel,
      };
    } else if (activePipeline === "code-audit-repair") {
      inputData = {
        targetFilePath: auditFilePath,
        codeSnippet: auditCode,
        issueDescription: auditIssue,
      };
    } else if (activePipeline === "release-readiness") {
      inputData = {
        appName: releaseAppName,
        targetEnvironment: releaseEnv,
        releaseScope,
        criticalIntegrations: releaseIntegrations,
      };
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تشغيل المسار.");
    } finally {
      setIsRunning(false);
    }
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
    }

    if (summaryText) {
      onSendToChat(summaryText);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 p-6 shadow-2xl">
        <DialogHeader className="text-right border-b border-zinc-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <CpuIcon className="size-5" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-base font-bold text-zinc-100">
                  لوحة تحكم المسارات التنفيذية الذاتية (Autonomous Studio)
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  محرك مسارات العمل الحتمية (Mastra DAGs) المدعوم بسرب نماذج Groq LPU فائقة السرعة
                </DialogDescription>
              </div>
            </div>
            <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-violet-400">
              PHASE 3 ● 2026
            </span>
          </div>
        </DialogHeader>

        {/* 4 Pipeline Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
          {/* 1. Feature Delivery */}
          <button
            type="button"
            onClick={() => {
              setActivePipeline("feature-delivery");
              setExecutionResult(null);
            }}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-right transition-all cursor-pointer",
              activePipeline === "feature-delivery"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-md ring-1 ring-emerald-500/30"
                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            <div className="flex items-center gap-2">
              <Code2Icon className="size-4 shrink-0 text-emerald-400" />
              <div className="flex flex-col">
                <span className="font-semibold text-xs">تسليم الميزات</span>
                <span className="text-[10px] text-zinc-500">Feature Delivery</span>
              </div>
            </div>
            <span className="text-[10px] font-mono rounded bg-zinc-900/80 px-1.5 py-0.5 border border-zinc-800">
              4 مراحل
            </span>
          </button>

          {/* 2. Database Engineering */}
          <button
            type="button"
            onClick={() => {
              setActivePipeline("database-engineering");
              setExecutionResult(null);
            }}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-right transition-all cursor-pointer",
              activePipeline === "database-engineering"
                ? "border-blue-500/50 bg-blue-500/10 text-blue-300 shadow-md ring-1 ring-blue-500/30"
                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            <div className="flex items-center gap-2">
              <DatabaseIcon className="size-4 shrink-0 text-blue-400" />
              <div className="flex flex-col">
                <span className="font-semibold text-xs">هندسة البيانات</span>
                <span className="text-[10px] text-zinc-500">Supabase & RLS</span>
              </div>
            </div>
            <span className="text-[10px] font-mono rounded bg-zinc-900/80 px-1.5 py-0.5 border border-zinc-800">
              3 مراحل
            </span>
          </button>

          {/* 3. Code Audit & Repair */}
          <button
            type="button"
            onClick={() => {
              setActivePipeline("code-audit-repair");
              setExecutionResult(null);
            }}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-right transition-all cursor-pointer",
              activePipeline === "code-audit-repair"
                ? "border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-md ring-1 ring-amber-500/30"
                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 shrink-0 text-amber-400" />
              <div className="flex flex-col">
                <span className="font-semibold text-xs">التدقيق والإصلاح</span>
                <span className="text-[10px] text-zinc-500">Audit & Patch</span>
              </div>
            </div>
            <span className="text-[10px] font-mono rounded bg-zinc-900/80 px-1.5 py-0.5 border border-zinc-800">
              مرحلتان
            </span>
          </button>

          {/* 4. Release Readiness */}
          <button
            type="button"
            onClick={() => {
              setActivePipeline("release-readiness");
              setExecutionResult(null);
            }}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-right transition-all cursor-pointer",
              activePipeline === "release-readiness"
                ? "border-violet-500/50 bg-violet-500/10 text-violet-300 shadow-md ring-1 ring-violet-500/30"
                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            <div className="flex items-center gap-2">
              <GlobeIcon className="size-4 shrink-0 text-violet-400" />
              <div className="flex flex-col">
                <span className="font-semibold text-xs">جاهزية النشر</span>
                <span className="text-[10px] text-zinc-500">Release Readiness</span>
              </div>
            </div>
            <span className="text-[10px] font-mono rounded bg-zinc-900/80 px-1.5 py-0.5 border border-zinc-800">
              3 مراحل
            </span>
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
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
