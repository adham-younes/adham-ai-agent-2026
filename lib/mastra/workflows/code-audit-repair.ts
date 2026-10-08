import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/groq";

export const CodeAuditInputSchema = z.object({
  targetFilePath: z.string().trim().min(1).max(100000).describe("مسار الملف أو اسم المكون المستهدف"),
  codeSnippet: z.string().trim().min(1).max(100000).describe("محتوى الكود المراد تدقيقه وإصلاحه"),
  issueDescription: z.string().trim().min(1).max(100000).optional().describe("وصف المشكلة أو الخلل إن وجد"),
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
3. تقديم تشخيص دقيق in English.`;

    const { text } = await generateText({
      model: model as any,
      system: "Write every report, heading, and explanation in English. Produce drafts for human review. You cannot run commands, inspect live infrastructure, deploy software, approve decisions, or resolve incidents. Never claim execution, approval, publication, verified tests, or observed facts without supplied evidence. Label assumptions and unknowns explicitly. Do not invent dates, authors, measurements, or verification outcomes; omit them unless supplied.",
      prompt,
    });

    return {
      targetFilePath: inputData.targetFilePath,
      codeSnippet: inputData.codeSnippet,
      vulnerabilitiesFound: [],
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
      system: "Write every report, heading, and explanation in English. Produce drafts for human review. You cannot run commands, inspect live infrastructure, deploy software, approve decisions, or resolve incidents. Never claim execution, approval, publication, verified tests, or observed facts without supplied evidence. Label assumptions and unknowns explicitly. Do not invent dates, authors, measurements, or verification outcomes; omit them unless supplied.",
      prompt,
    });

    return {
      targetFilePath: inputData.targetFilePath,
      repairedCode: text,
      patchExplanation: "This generated patch has not been written to files or tested. Review, apply, and verify it.",
      verificationCommand: "Run typecheck, build, and relevant tests after applying the patch.",
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
