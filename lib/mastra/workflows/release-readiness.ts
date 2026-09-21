import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/groq";

export const ReleaseReadinessInputSchema = z.object({
  appName: z
    .string()
    .default("adham-ai-agent-2026")
    .describe("اسم التطبيق أو المنظومة المستهدفة للنشر"),
  targetEnvironment: z
    .enum(["production", "staging", "preview"])
    .default("production")
    .describe("بيئة النشر المستهدفة"),
  releaseScope: z
    .string()
    .describe("نطاق الإصدار والتحديثات والميزات المطلوب تدقيق جاهزيتها للنشر"),
  criticalIntegrations: z
    .string()
    .optional()
    .default("Groq LPU Swarm, Supabase PostgreSQL, Vercel Edge")
    .describe("الخدمات السحابية والربط الحرج"),
});

export const EnvAuditOutputSchema = z.object({
  appName: z.string(),
  targetEnvironment: z.string(),
  envAuditReport: z.string(),
  requiredSecretsChecklist: z.string(),
});

export const VerificationContractOutputSchema = z.object({
  appName: z.string(),
  targetEnvironment: z.string(),
  envAuditReport: z.string(),
  verificationMatrix: z.string(),
  buildGatesChecklist: z.string(),
});

export const ReleaseRollbackOutputSchema = z.object({
  appName: z.string(),
  targetEnvironment: z.string(),
  envAuditReport: z.string(),
  verificationMatrix: z.string(),
  zeroDowntimeStrategy: z.string(),
  rollbackPlan: z.string(),
  releaseNotesMarkdown: z.string(),
  deploymentCommand: z.string(),
});

// Step 1: Environment, Secrets & Cloud Connectors Audit
export const envAuditStep = createStep({
  id: "env-secret-audit-step",
  inputSchema: ReleaseReadinessInputSchema,
  outputSchema: EnvAuditOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_1", "openai/gpt-oss-120b");
    const prompt = `أنت مهندس أمان ونظم سحابية رئيسي (Principal Cloud Security & Site Reliability Engineer).
قم بتدقيق الجاهزية البيئية والأمنية للتطبيق قبل إطلاقه على الإنتاج:
التطبيق: ${inputData.appName}
البيئة المستهدفة: ${inputData.targetEnvironment}
نطاق الإصدار: ${inputData.releaseScope}
الخدمات المتكاملة: ${inputData.criticalIntegrations}

المطلوب:
1. تدقيق أمان المتغيرات البيئية واعتمادات السحابة (Zero Secret Exposure: منع أي تسريب للقيم السرية).
2. إعداد قائمة فحص دقيقة لجميع المتغيرات البيئية المطلوبة للإنتاج (Environment Matrix).
3. تقييم أمان الاتصال بقواعد البيانات وخدمات الطرف الثالث (SSL/TLS, Connection Pooling, Timeouts).
4. تقديم التقرير باللغة العربية الفصحى التقنية الدقيقة.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      appName: inputData.appName,
      targetEnvironment: inputData.targetEnvironment,
      envAuditReport: text,
      requiredSecretsChecklist:
        "GROQ_API_KEY_1..3, POSTGRES_URL / SUPABASE_DATABASE_URL, BETTER_AUTH_SECRET (32+ chars), NEXT_PUBLIC_SITE_URL",
    };
  },
});

// Step 2: Deterministic Verification & Quality Gates Matrix
export const verificationContractStep = createStep({
  id: "verification-contract-step",
  inputSchema: EnvAuditOutputSchema,
  outputSchema: VerificationContractOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس ضمان الجودة والتحقق الصارم (QA & Verification Lead).
بناءً على التقرير البيئي التالي للتطبيق ${inputData.appName} (${inputData.targetEnvironment}):
${inputData.envAuditReport}

المطلوب:
1. صياغة مصفوفة اختبارات التحقق الحتمية قبل النشر (Pre-flight Gates):
   - التحقق من الأنواع (Type-check: tsc --noEmit).
   - تجميع حزم الوكلاء (Agent Compile: eve build).
   - بناء بيئة الإنتاج وتحسين الصفحات الثابتة (Next.js Turbopack Build).
   - معايير إمكانية الوصول وتوافق الواجهات (WCAG 2.2 AA).
2. تحديد معايير الرفض التلقائي (Hard-fail Criteria) التي توقف عملية النشر فوراً إذا لم تتحقق.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      appName: inputData.appName,
      targetEnvironment: inputData.targetEnvironment,
      envAuditReport: inputData.envAuditReport,
      verificationMatrix: text,
      buildGatesChecklist: "pnpm typecheck -> pnpm build:eve -> pnpm build -> live smoke check",
    };
  },
});

// Step 3: Zero-Downtime Deployment, Rollback Strategy & Executive Release Notes
export const releaseRollbackStep = createStep({
  id: "release-rollback-step",
  inputSchema: VerificationContractOutputSchema,
  outputSchema: ReleaseRollbackOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس النشر والعمليات السحابية التنفيذي (DevOps & Release Commander).
بناءً على مصفوفة التحقق والأمان للتطبيق ${inputData.appName}:
${inputData.verificationMatrix}

المطلوب:
1. صياغة استراتيجية النشر بدون توقف (Zero-Downtime Deployment / Atomic Swap) على Vercel Edge.
2. خطة التراجع الفوري عند الطوارئ (Instant Rollback Plan) لضمان عدم تأثر المستخدمين في حالة أي خلل غير متوقع.
3. صياغة مذكرة إطلاق تنفيذية رسمية (Executive Release Notes) باللغة العربية والإنجليزية توثق التغييرات، والتحسينات، والفوائد التقنية.
4. تحديد أمر النشر النهائي الصارم.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      appName: inputData.appName,
      targetEnvironment: inputData.targetEnvironment,
      envAuditReport: inputData.envAuditReport,
      verificationMatrix: inputData.verificationMatrix,
      zeroDowntimeStrategy: "Vercel Instant Atomic Deployment with Preview Verification.",
      rollbackPlan: "Fast rollback via `vercel rollback <deployment-url>` without data corruption.",
      releaseNotesMarkdown: text,
      deploymentCommand: "git push origin main && vercel --prod",
    };
  },
});

// Compose Release Readiness Workflow
export const releaseDeploymentWorkflow = createWorkflow({
  id: "autonomous-release-readiness",
  inputSchema: ReleaseReadinessInputSchema,
  outputSchema: ReleaseRollbackOutputSchema,
})
  .then(envAuditStep)
  .then(verificationContractStep)
  .then(releaseRollbackStep)
  .commit();
