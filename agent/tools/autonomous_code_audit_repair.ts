import { defineTool } from "eve/tools";
import { z } from "zod";
import { mastra } from "@/lib/mastra";

export default defineTool({
  description:
    "تشغيل مسار التدقيق البرمجي الذاتي والإصلاح الجراحي عبر Mastra (فحص أمني واكتشاف الثغرات -> تشخيص السبب الجذري -> رقعة الإصلاح الجراحي الدقيقة مع أمر التحقق).",
  inputSchema: z.object({
    targetFilePath: z.string().describe("مسار الملف أو اسم المكون المستهدف"),
    codeSnippet: z.string().describe("محتوى الكود المراد فحصه وإصلاحه"),
    issueDescription: z.string().optional().describe("وصف المشكلة أو الخلل إن وجد"),
  }),
  label: {
    start: ({ targetFilePath }) => `تدقيق وإصلاح الكود جراحياً: ${targetFilePath}`,
  },
  async execute(input) {
    const workflow = mastra.getWorkflow("codeAuditAndRepairWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    return {
      status: "COMPLETED",
      workflowId: "autonomous-code-audit-repair",
      runId: run.runId,
      result,
    };
  },
});
