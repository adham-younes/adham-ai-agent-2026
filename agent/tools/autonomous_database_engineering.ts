import { defineTool } from "eve/tools";
import { z } from "zod";
import { mastra } from "@/lib/mastra";

export default defineTool({
  description:
    "تشغيل مسار هندسة قواعد البيانات الذاتي عبر Mastra (تصميم مخطط PostgreSQL -> فهارس المفاتيح الأجنبية -> سياسات RLS المحمية في Supabase -> سكريبت الهجرة الآمن).",
  inputSchema: z.object({
    domainName: z.string().describe("اسم المجال أو النظام، مثل: eCommerce أو Multi-tenant SaaS"),
    entitiesDescription: z.string().describe("وصف الكيانات، الجداول، العلاقات، والحقول المطلوبة"),
    tenantModel: z.enum(["single-tenant", "multi-tenant"]).default("multi-tenant"),
  }),
  label: {
    start: ({ domainName }) => `تشغيل مسار هندسة قاعدة البيانات: ${domainName}`,
  },
  async execute(input) {
    const workflow = mastra.getWorkflow("databaseEngineeringWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    return {
      status: "COMPLETED",
      workflowId: "autonomous-database-engineering",
      runId: run.runId,
      result,
    };
  },
});
