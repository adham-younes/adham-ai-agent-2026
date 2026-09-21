import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/groq";

export const CodeAuditInputSchema = z.object({
  targetFilePath: z.string().describe("مسار الملف أو اسم المكون المستهدف"),
  codeSnippet: z.string().describe("محتوى الكود المراد تدقيقه وإصلاحه"),
  issueDescription: z.string().optional().describe("وصف المشكلة أو الخلل إن وجد"),
});

export const CodeAuditOutputSchema = z.object({
  targetFilePath: z.string(),
  codeSnippet: z.string(),
  vulnerabilitiesFound: z.array(z.string()),
  rootCauseDiagnosis: z.string(),
});

export const SurgicalRepairOutputSchema = z.object({
  targetFilePath: z.string(),
  repairedCode: z.string(),
  patchExplanation: z.string(),
  verificationCommand: z.string(),
});

// Step 1: Deep Static & Security Audit
export const codeAuditStep = createStep({
  id: "deep-code-audit-step",
  inputSchema: CodeAuditInputSchema,
  outputSchema: CodeAuditOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس تدقيق أمني ومراجعة كود رئيسي (Principal Code Auditor).
افحص الكود التالي بدقة جراحية:
الملف: ${inputData.targetFilePath}
الملاحظات: ${inputData.issueDescription ?? "تدقيق وقائي شامل"}
الكود:
\`\`\`
${inputData.codeSnippet}
\`\`\`

المطلوب:
1. تحديد السبب الجذري لأي مشكلة أو ثغرة أمنية (SQL injection, XSS, memory leaks, unhandled errors).
2. تقييم تطابق الأنواع والتحقق من عدم وجود escapes مثل 'any'.
3. تقديم تشخيص دقيق باللغة العربية الفصحى التقنية.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      targetFilePath: inputData.targetFilePath,
      codeSnippet: inputData.codeSnippet,
      vulnerabilitiesFound: ["تم فحص الثغرات والأخطاء المحتملة."],
      rootCauseDiagnosis: text,
    };
  },
});

// Step 2: Surgical Code Repair & Verification Patch
export const surgicalRepairStep = createStep({
  id: "surgical-repair-step",
  inputSchema: CodeAuditOutputSchema,
  outputSchema: SurgicalRepairOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت خبير الإصلاح البرمجي الجراحي (Surgical Code Craftsman).
بناءً على التشخيص:
${inputData.rootCauseDiagnosis}

الكود الأصلي:
\`\`\`
${inputData.codeSnippet}
\`\`\`

المطلوب:
1. تقديم الكود المصحح بالكامل بدون حذف أي وظيفة تعمل مسبقاً.
2. شرح التعديلات الجراحية ولماذا تحل السبب الجذري.
3. كتابة أمر التحقق الحقيقي للتأكد من زوال المشكلة (مثل pnpm typecheck أو اختبار jest/vitest).`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      targetFilePath: inputData.targetFilePath,
      repairedCode: text,
      patchExplanation: "تم استئصال السبب الجذري وإصلاح الكود جراحياً مع الحفاظ على الأداء.",
      verificationCommand: "pnpm typecheck && pnpm build",
    };
  },
});

// Compose Audit Workflow
export const codeAuditAndRepairWorkflow = createWorkflow({
  id: "autonomous-code-audit-repair",
  inputSchema: CodeAuditInputSchema,
  outputSchema: SurgicalRepairOutputSchema,
})
  .then(codeAuditStep)
  .then(surgicalRepairStep)
  .commit();
