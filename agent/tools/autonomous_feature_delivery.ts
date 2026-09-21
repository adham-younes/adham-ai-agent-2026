import { defineTool } from "eve/tools";
import { z } from "zod";
import { mastra } from "@/lib/mastra";

export default defineTool({
  description:
    "تشغيل مسار تسليم الميزات الكامل الحتمي عبر Mastra (تحليل المعمارية -> مخطط قاعدة بيانات Supabase -> توليد كود Next.js مع Zod -> تدقيق أمان وجودة).",
  inputSchema: z.object({
    featureTitle: z.string().describe("عنوان الميزة البرمجية أو النظام"),
    userRequirements: z.string().describe("المواصفات والمتطلبات بالتفصيل"),
    targetStack: z
      .string()
      .optional()
      .default("Next.js 16 + Tailwind CSS + Supabase PostgreSQL"),
  }),
  label: {
    start: ({ featureTitle }) => `تشغيل مسار تسليم الميزة: ${featureTitle}`,
  },
  async execute(input) {
    const workflow = mastra.getWorkflow("featureDeliveryWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    return {
      status: "COMPLETED",
      workflowId: "autonomous-feature-delivery",
      runId: run.runId,
      result,
    };
  },
});
