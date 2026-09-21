import { defineTool } from "eve/tools";
import { z } from "zod";
import { mastra } from "@/lib/mastra";

export default defineTool({
  description:
    "تشغيل مسار الاستجابة للحوادث و SRE الذاتي عبر Mastra (تصنيف الطوارئ وحصر الأضرار -> عزل السبب الجذري RCA -> دليل الإجراءات والتصحيح الجراحي -> وثيقة ما بعد الحادث Blameless Post-Mortem بصيغة Markdown).",
  inputSchema: z.object({
    incidentTitle: z
      .string()
      .describe("عنوان الحادث أو الإنذار التشغيلي"),
    errorLogs: z
      .string()
      .describe("سجلات الخطأ أو الـ Stack Trace أو وصف العطل"),
    affectedService: z
      .string()
      .describe("الخدمة أو النقطة البرمجية المتأثرة"),
    severityLevel: z
      .enum([
        "P0 - Critical Outage",
        "P1 - High Degradation",
        "P2 - Moderate Issue",
        "P3 - Low Impact",
      ])
      .default("P0 - Critical Outage")
      .describe("مستوى خطورة الحادث"),
    recentChanges: z
      .string()
      .optional()
      .default("تحديث أخير في إعدادات الاتصال أو نشر إصدار جديد")
      .describe("التغييرات أو عمليات النشر الأخيرة المرتبطة بالحادث"),
  }),
  label: {
    start: ({ incidentTitle }) =>
      `بدء استجابة SRE الذاتية للحادث: ${incidentTitle}`,
  },
  async execute(input) {
    const workflow = mastra.getWorkflow("incidentResponseWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    return {
      status: "COMPLETED",
      workflowId: "autonomous-incident-response",
      runId: run.runId,
      result,
    };
  },
});
