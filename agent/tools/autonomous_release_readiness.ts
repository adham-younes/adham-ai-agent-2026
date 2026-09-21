import { defineTool } from "eve/tools";
import { z } from "zod";
import { mastra } from "@/lib/mastra";

export default defineTool({
  description:
    "تشغيل مسار جاهزية النشر والإصدار السحابي الذاتي عبر Mastra (تدقيق أمان المتغيرات البيئية -> مصفوفة التحقق الصارم وبوابات الجودة -> استراتيجية النشر بدون توقف وخطة التراجع الفوري -> صياغة مذكرة الإطلاق التنفيذية).",
  inputSchema: z.object({
    appName: z
      .string()
      .default("adham-ai-agent-2026")
      .describe("اسم التطبيق أو المنظومة المستهدفة"),
    targetEnvironment: z
      .enum(["production", "staging", "preview"])
      .default("production")
      .describe("البيئة السحابية المستهدفة"),
    releaseScope: z
      .string()
      .describe("نطاق ومحتوى التحديثات والميزات المطلوب تدقيق جاهزيتها للنشر"),
    criticalIntegrations: z
      .string()
      .optional()
      .default("Groq LPU Swarm, Supabase PostgreSQL, Vercel Edge")
      .describe("الخدمات السحابية والربط الحرج"),
  }),
  label: {
    start: ({ appName, targetEnvironment }) =>
      `فحص وتدقيق جاهزية النشر: ${appName} (${targetEnvironment})`,
  },
  async execute(input) {
    const workflow = mastra.getWorkflow("releaseDeploymentWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    return {
      status: "COMPLETED",
      workflowId: "autonomous-release-readiness",
      runId: run.runId,
      result,
    };
  },
});
