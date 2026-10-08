import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/groq";

export const DbEngineeringInputSchema = z.object({
  domainName: z.string().trim().min(1).max(100000).describe("اسم المجال أو النظام المستهدف، مثل: eCommerce أو Multi-tenant SaaS"),
  entitiesDescription: z.string().trim().min(1).max(100000).describe("وصف الكيانات، العلاقات، وحقول البيانات المطلوبة"),
  tenantModel: z.enum(["single-tenant", "multi-tenant"]).default("multi-tenant"),
});

export const SchemaDesignOutputSchema = z.object({
  domainName: z.string(),
  tableDefinitions: z.string(),
  relationshipDiagram: z.string(),
});

export const IndexOptimizationOutputSchema = z.object({
  domainName: z.string(),
  tableDefinitions: z.string(),
  optimizedIndexesSql: z.string(),
});

export const RlsPolicyOutputSchema = z.object({
  domainName: z.string(),
  completeMigrationSql: z.string(),
  verificationInstructions: z.string(),
});

// Step 1: Data Modeling & Schema Design
export const schemaDesignStep = createStep({
  id: "schema-design-step",
  inputSchema: DbEngineeringInputSchema,
  outputSchema: SchemaDesignOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس قواعد بيانات رئيسي متخصص في PostgreSQL و Supabase.
قم بتصميم مخطط بيانات احترافي للمجال التالي:
المجال: ${inputData.domainName}
نموذج المستأجرين: ${inputData.tenantModel}
الكيانات المطلوبة: ${inputData.entitiesDescription}

المطلوب:
1. صياغة جداول PostgreSQL متكاملة مع أنواع البيانات الدقيقة (TIMESTAMPTZ, UUID, JSONB, TEXT).
2. تحديد المفاتيح الأساسية (UUID) والمفاتيح الأجنبية والقيود (Constraints) وتحديث timestamp تلقائياً.
3. توثيق العلاقات 1:N و N:M.`;

    const { text } = await generateText({
      model: model as any,
      system: "Write every report, heading, and explanation in English. Produce drafts for human review. You cannot run commands, inspect live infrastructure, deploy software, approve decisions, or resolve incidents. Never claim execution, approval, publication, verified tests, or observed facts without supplied evidence. Label assumptions and unknowns explicitly. Do not invent dates, authors, measurements, or verification outcomes; omit them unless supplied.",
      prompt,
    });

    return {
      domainName: inputData.domainName,
      tableDefinitions: text,
      relationshipDiagram: "Review the proposed relationships in the generated schema; database validation is pending.",
    };
  },
});

// Step 2: Foreign Key Indexing & Performance Optimization
export const indexOptimizationStep = createStep({
  id: "index-optimization-step",
  inputSchema: SchemaDesignOutputSchema,
  outputSchema: IndexOptimizationOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت خبير تحسين أداء قواعد البيانات (Database Performance Engineer).
بناءً على الجداول التالية:
${inputData.tableDefinitions}

المطلوب:
1. توليد استعلامات فهارس مخصصة لجميع المفاتيح الأجنبية (CREATE INDEX IF NOT EXISTS).
2. إضافة فهارس تغطية وفهارس مركبة (Composite Indexes) لمسارات الاستعلام الشائعة وتصفية التواريخ والـ tenant_id.
3. تجنب الإفراط في الفهرسة وشرح مبرر كل فهرس.`;

    const { text } = await generateText({
      model: model as any,
      system: "Write every report, heading, and explanation in English. Produce drafts for human review. You cannot run commands, inspect live infrastructure, deploy software, approve decisions, or resolve incidents. Never claim execution, approval, publication, verified tests, or observed facts without supplied evidence. Label assumptions and unknowns explicitly. Do not invent dates, authors, measurements, or verification outcomes; omit them unless supplied.",
      prompt,
    });

    return {
      domainName: inputData.domainName,
      tableDefinitions: inputData.tableDefinitions,
      optimizedIndexesSql: text,
    };
  },
});

// Step 3: Row-Level Security (RLS) Policies
export const rlsPolicyStep = createStep({
  id: "rls-policy-step",
  inputSchema: IndexOptimizationOutputSchema,
  outputSchema: RlsPolicyOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس أمن قواعد بيانات Supabase.
بناءً على الجداول والفهارس:
${inputData.tableDefinitions}
${inputData.optimizedIndexesSql}

المطلوب:
1. تفعيل RLS على كافة الجداول (ALTER TABLE ... ENABLE ROW LEVEL SECURITY).
2. كتابة سياسات RLS تفصيلية لعمليات (SELECT, INSERT, UPDATE, DELETE) باستخدام auth.uid() أو auth.jwt()->>'tenant_id'.
3. دمج كل ما سبق في سكريبت هجرة SQL نهائي موحد وقابل للتنفيذ المباشر (Idempotent Migration Script).`;

    const { text } = await generateText({
      model: model as any,
      system: "Write every report, heading, and explanation in English. Produce drafts for human review. You cannot run commands, inspect live infrastructure, deploy software, approve decisions, or resolve incidents. Never claim execution, approval, publication, verified tests, or observed facts without supplied evidence. Label assumptions and unknowns explicitly. Do not invent dates, authors, measurements, or verification outcomes; omit them unless supplied.",
      prompt,
    });

    return {
      domainName: inputData.domainName,
      completeMigrationSql: text,
      verificationInstructions: "Draft SQL and policies require human review and testing against a database copy before applying migrations.",
    };
  },
});

// Compose Database Workflow
export const databaseEngineeringWorkflow = createWorkflow({
  id: "autonomous-database-engineering",
  inputSchema: DbEngineeringInputSchema,
  outputSchema: RlsPolicyOutputSchema,
})
  .then(schemaDesignStep)
  .then(indexOptimizationStep)
  .then(rlsPolicyStep)
  .commit();
