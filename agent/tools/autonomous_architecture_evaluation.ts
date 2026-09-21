import { defineTool } from "eve/tools";
import { z } from "zod";
import { mastra } from "@/lib/mastra";

export default defineTool({
  description:
    "تشغيل مسار التقييم المعماري وسجلات ADRs الذاتي عبر Mastra (تحليل المقايضات المعمارية العميقة -> توقع التكاليف واستهلاك الموارد -> توليد وثيقة سجل القرار المعماري ADR بصيغة Markdown قياسية).",
  inputSchema: z.object({
    systemTitle: z
      .string()
      .describe("عنوان المعمارية أو القرار التقني المراد تقييمه"),
    problemContext: z
      .string()
      .describe("السياق والمشكلة والتحديات الفنية المطروحة بالتفصيل"),
    alternativesConsidered: z
      .string()
      .describe("البدائل التقنية المقترحة للمقارنة"),
    targetCriteria: z
      .string()
      .optional()
      .default("زمن الاستجابة، التكلفة الشهرية، قابلية التوسع، وسهولة الصيانة")
      .describe("معايير المفاضلة المرجعية"),
  }),
  label: {
    start: ({ systemTitle }) =>
      `إجراء التقييم المعماري وتوليد ADR: ${systemTitle}`,
  },
  async execute(input) {
    const workflow = mastra.getWorkflow("architectureEvaluationWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    return {
      status: "COMPLETED",
      workflowId: "autonomous-architecture-evaluation",
      runId: run.runId,
      result,
    };
  },
});
