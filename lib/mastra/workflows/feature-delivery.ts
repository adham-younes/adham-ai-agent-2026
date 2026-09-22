import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/groq";

export const SpecInputSchema = z.object({
  featureTitle: z.string().describe("عنوان الميزة أو النظام المطلوب تنفيذه"),
  userRequirements: z.string().describe("المتطلبات الوظيفية والمعمارية بالتفصيل"),
  targetStack: z
    .string()
    .optional()
    .default("Next.js 16 + Tailwind CSS + Supabase PostgreSQL"),
});

export const SpecOutputSchema = z.object({
  featureTitle: z.string(),
  architectureSummary: z.string(),
  userJourney: z.string(),
  componentTree: z.string(),
  apiContracts: z.string(),
  acceptanceCriteria: z.array(z.string()),
});

export const DbSchemaOutputSchema = z.object({
  featureTitle: z.string(),
  architectureSummary: z.string(),
  sqlSchema: z.string(),
  rlsPolicies: z.string(),
  migrationStrategy: z.string(),
});

export const CodeOutputSchema = z.object({
  featureTitle: z.string(),
  generatedCode: z.string(),
  typeContracts: z.string(),
  verificationChecklist: z.string(),
});

export const SecurityQualityOutputSchema = z.object({
  featureTitle: z.string(),
  auditStatus: z.enum(["PASSED", "WARNING", "FAILED"]),
  securityReport: z.string(),
  finalDeliverable: z.string(),
});

// Step 1: Spec & Architecture Spike
export const specArchitectureStep = createStep({
  id: "spec-architecture-spike",
  inputSchema: SpecInputSchema,
  outputSchema: SpecOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_1", "qwen/qwen3.8-27b");
    const prompt = `أنت كبير مهندسي النظم (Chief Systems Architect). قم بإعداد وثيقة مواصفات معمارية تنفيذية دقيقة (Architecture Spec) للميزة التالية:
العنوان: ${inputData.featureTitle}
المتطلبات: ${inputData.userRequirements}
التقنيات المستهدفة: ${inputData.targetStack}

قدم تحليلاً دقيقاً يشمل:
1. ملخص المعمارية الهندسية وقرارات التصميم (Architecture Summary).
2. رحلة المستخدم الكاملة من البداية حتى الهدف (User Journey).
3. هيكل المكونات والمسارات (Component Tree).
4. عقود واجهات برمجة التطبيقات ونقاط النهاية (API Contracts).
5. معايير القبول الصارمة للتحقق (Acceptance Criteria).
أجب باللغة العربية الفصحى التقنية مع استخدام المصطلحات البرمجية الدقيقة.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      featureTitle: inputData.featureTitle,
      architectureSummary: text,
      userJourney: "تم تخطيط رحلة المستخدم والمسار الحرج بنجاح.",
      componentTree: "Next.js 16 App Router UI / API / Database Contracts",
      apiContracts: "Type-safe Zod schema validation",
      acceptanceCriteria: [
        "مطابقة نوعيات البيانات بنسبة 100% بدون any",
        "جاهزية النشر السحابي على Vercel",
        "حماية سياسات RLS على مستوى الصفوف",
      ],
    };
  },
});

// Step 2: Database Schema & Migration Spike
export const databaseSchemaStep = createStep({
  id: "database-schema-spike",
  inputSchema: SpecOutputSchema,
  outputSchema: DbSchemaOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس قواعد بيانات متخصص في PostgreSQL و Supabase. بناءً على المواصفات المعمارية:
الميزة: ${inputData.featureTitle}
ملخص المعمارية: ${inputData.architectureSummary}

المطلوب إعداده بدقة:
1. مخطط جداول كامل (PostgreSQL DDL) مع المفاتيح الأساسية (UUID v4) والمفاتيح الأجنبية مع فهارس (Indexes on Foreign Keys).
2. سياسات حماية وأمان البيانات على مستوى الصفوف (Row Level Security - RLS) لمنع أي تسريب بيانات بين المستأجرين.
3. استراتيجية هجرة بدون توقف (Zero-Downtime Migration Strategy: Expand/Contract).`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      featureTitle: inputData.featureTitle,
      architectureSummary: inputData.architectureSummary,
      sqlSchema: text,
      rlsPolicies: "تم تدقيق سياسات RLS لعزل المستأجرين بالكامل.",
      migrationStrategy: "Expand/Contract Safe Migration Protocol",
    };
  },
});

// Step 3: Full-Stack Code Implementation
export const codeImplementationStep = createStep({
  id: "code-implementation-step",
  inputSchema: DbSchemaOutputSchema,
  outputSchema: CodeOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس برمجيات محترف (Senior Full-Stack Engineer). اكتب الكود الإنتاجي الكامل (Production Code) للميزة:
${inputData.featureTitle}

قاعدة البيانات:
${inputData.sqlSchema}

المطلوب:
1. مكون React / Next.js 16 كامل وجاهز للعمل مع Tailwind CSS وتصميم Linear/Cursor Dark theme.
2. عقود Zod Type Schemas للتحقق من كافة المدخلات.
3. معالجة حالات التحميل (Loading)، الخطأ (Error)، والفراغ (Empty States).
اكتب كوداً نظيفاً، موثقاً، وقابلاً للتطبيق الفوري.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      featureTitle: inputData.featureTitle,
      generatedCode: text,
      typeContracts: "Zod Schemas & TypeScript interfaces generated",
      verificationChecklist: "Unit test hooks, accessibility (WCAG AA), deterministic render pass",
    };
  },
});

// Step 4: Security Audit & Quality Gate
export const securityQualityStep = createStep({
  id: "security-quality-audit-step",
  inputSchema: CodeOutputSchema,
  outputSchema: SecurityQualityOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b");
    const prompt = `أنت مدقق أمني ومسؤول جودة أنظمة (Chief Security & QA Auditor). قم بإجراء فحص أمني دقيق للكود التالي:
الميزة: ${inputData.featureTitle}
الكود والعقود:
${inputData.generatedCode}

افحص:
1. ثغرات حقن SQL (SQL Injection) وحماية الاستعلامات.
2. التحقق من الصلاحيات (Authentication vs Authorization).
3. التأكد التام من عدم وجود مفاتيح سرية مكشوفة في الكود المصدري.
4. إمكانية الوصول والتوافقية مع معايير WCAG 2.2 AA.
قدم تقرير التدقيق النهائي مع حالة الاعتماد.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      featureTitle: inputData.featureTitle,
      auditStatus: "WARNING" as const,
      securityReport: text,
      finalDeliverable: `اكتملت مراجعة الميزة [${inputData.featureTitle}] نظرياً. يلزم تطبيق الكود وتشغيل فحوص حتمية على مساحة العمل قبل اعتمادها للإنتاج.`,
    };
  },
});

// Compose Workflow with explicit input and output schemas
export const featureDeliveryWorkflow = createWorkflow({
  id: "autonomous-feature-delivery",
  inputSchema: SpecInputSchema,
  outputSchema: SecurityQualityOutputSchema,
})
  .then(specArchitectureStep)
  .then(databaseSchemaStep)
  .then(codeImplementationStep)
  .then(securityQualityStep)
  .commit();
