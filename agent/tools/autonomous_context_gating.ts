import { defineTool } from "eve/tools";
import { z } from "zod";
import { mastra } from "@/lib/mastra";

export default defineTool({
  description:
    "تشغيل مسار التعلم المستمر وبوابات السياق الذاتي عبر Mastra (استيعاب التجربة الرباعية [سياق، قرار، واقع، نتيجة] -> تجريد القواعد وحدود الصلاحية -> تطبيق بوابة السياق الرياضية ومنع النقل السلبي Negative Transfer).",
  inputSchema: z.object({
    episodeTask: z
      .string()
      .describe("المهمة التشغيلية أو التجربة السابقة المراد التعلم منها"),
    episodeDomain: z
      .string()
      .describe("المجال الهندسي والتقني للتجربة"),
    episodeEnvironment: z
      .string()
      .describe("البيئة التقنية ومحددات الأداء"),
    decisionTaken: z
      .string()
      .describe("القرار أو الاستراتيجية التي تم اتخاذها سابقاً"),
    observedReality: z
      .string()
      .describe("الواقع الميداني والنتيجة الفعلية المحققة"),
    targetNewContext: z
      .string()
      .optional()
      .default("سياق عمل جديد لفحص مدى صلاحية تطبيق القاعدة المستفادة عليه")
      .describe("السياق الجديد المطلوب التحقق منه عبر بوابة السياق"),
  }),
  label: {
    start: ({ episodeTask }) =>
      `تقييم بوابة السياق والتعلم المستمر لـ: ${episodeTask}`,
  },
  async execute(input) {
    const workflow = mastra.getWorkflow("continualLearningWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    return {
      status: "DRAFT_READY",
      workflowId: "autonomous-continual-learning",
      runId: run.runId,
      result,
    };
  },
});
