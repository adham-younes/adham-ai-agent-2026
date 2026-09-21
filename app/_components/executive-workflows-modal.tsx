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
  ExternalLinkIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlayIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
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
  | "code-audit-repair";

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

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(undefined), 2000);
  };

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    setError(undefined);
    setExecutionResult(null);

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
      summaryText = `تم تشغيل مسار هندسة قاعدة البيانات لـ [${dbDomain}] بنجاح.\nتم توليد مخطط PostgreSQL وسياسات RLS وفهارس المفاتيح الأجنبية.`;
    } else if (activePipeline === "code-audit-repair" && executionResult) {
      summaryText = `تم تشغيل مسار التدقيق البرمجي والإصلاح الجراحي لـ [${auditFilePath}].\nتم تحديد السبب الجذري وتوليد رقعة الإصلاح مع أمر التحقق.`;
    }

    onSendToChat(summaryText);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950/95 text-zinc-100 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="text-right border-b border-zinc-800/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                <CpuIcon className="size-5.5" />
              </div>
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-bold text-lg text-zinc-100">
                    لوحة المسارات التنفيذية الحتمية (Mastra Engine)
                  </DialogTitle>
                  <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-400 font-semibold">
                    DAG
                  </span>
                </div>
                <DialogDescription className="text-xs text-zinc-400">
                  تشغيل مهام هندسية ذاتية متعددة المراحل عبر Groq LPU ونظام سير العمل الحتمي.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Pipeline Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
          <button
            type="button"
            onClick={() => {
              setActivePipeline("feature-delivery");
              setExecutionResult(null);
            }}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-right transition-all",
              activePipeline === "feature-delivery"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-md"
                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            <div className="flex items-center gap-2.5">
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

          <button
            type="button"
            onClick={() => {
              setActivePipeline("database-engineering");
              setExecutionResult(null);
            }}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-right transition-all",
              activePipeline === "database-engineering"
                ? "border-blue-500/50 bg-blue-500/10 text-blue-300 shadow-md"
                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            <div className="flex items-center gap-2.5">
              <DatabaseIcon className="size-4 shrink-0 text-blue-400" />
              <div className="flex flex-col">
                <span className="font-semibold text-xs">هندسة قواعد البيانات</span>
                <span className="text-[10px] text-zinc-500">Supabase & RLS</span>
              </div>
            </div>
            <span className="text-[10px] font-mono rounded bg-zinc-900/80 px-1.5 py-0.5 border border-zinc-800">
              3 مراحل
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePipeline("code-audit-repair");
              setExecutionResult(null);
            }}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-right transition-all",
              activePipeline === "code-audit-repair"
                ? "border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-md"
                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            <div className="flex items-center gap-2.5">
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
                  المواصفات والمتطلبات التفصيلية (Requirements):
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
                  الحزمة التقنية المستهدفة (Target Stack):
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

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <ZapIcon className="size-3.5 text-emerald-400" />
              <span>محرك الاستدلال: Groq LPU Swarm (120B + 27B)</span>
            </div>
            <Button
              disabled={isRunning}
              onClick={handleRunWorkflow}
              className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs px-5 py-2.5 transition-colors shadow-lg"
            >
              {isRunning ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>جاري تنفيذ المسار الحتمي...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="size-3.5 fill-current" />
                  <span>تشغيل المسار الذاتي الآن</span>
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

        {/* Real-time Execution Output Viewer */}
        {executionResult ? (
          <div className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 text-right">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-emerald-400" />
                <span className="font-bold text-xs text-zinc-100">
                  تم اكتمال المسار الهندسي بنجاح (Execution Completed)
                </span>
              </div>
              {onSendToChat ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendToChat}
                  className="gap-1.5 rounded-lg border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700"
                >
                  <MessageSquareIcon className="size-3.5 text-emerald-400" />
                  <span>إرسال النتيجة إلى المحادثة</span>
                </Button>
              ) : null}
            </div>

            {/* Results Display */}
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
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
