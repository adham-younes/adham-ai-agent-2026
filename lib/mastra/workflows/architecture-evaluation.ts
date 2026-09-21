import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/groq";

export const ArchitectureEvaluationInputSchema = z.object({
  systemTitle: z
    .string()
    .describe("عنوان المعمارية أو القرار التقني المراد دراسته وتقييمه"),
  problemContext: z
    .string()
    .describe("السياق الهندسي والمشكلة والتحديات المطروحة بالتفصيل"),
  alternativesConsidered: z
    .string()
    .describe("البدائل التقنية المقترحة للمقارنة، مثل: Upstash Redis مقابل Supabase pgvector"),
  targetCriteria: z
    .string()
    .optional()
    .default("زمن الاستجابة (Latency)، التكلفة الشهرية (Cost)، قابلية التوسع (Scalability)، وسهولة الصيانة (DX)")
    .describe("المعايير المرجعية للمفاضلة"),
});

export const TradeoffsOutputSchema = z.object({
  systemTitle: z.string(),
  tradeoffsAnalysis: z.string(),
  criteriaComparisonTable: z.string(),
});

export const CostProjectionOutputSchema = z.object({
  systemTitle: z.string(),
  tradeoffsAnalysis: z.string(),
  costLatencyReport: z.string(),
  resourceChecklist: z.string(),
});

export const AdrGeneratorOutputSchema = z.object({
  systemTitle: z.string(),
  adrNumber: z.string(),
  adrMarkdown: z.string(),
  status: z.string(),
  decisionSummary: z.string(),
});

// Step 1: Architectural Trade-offs & Deep Multi-dimensional Spike
export const tradeoffsSpikeStep = createStep({
  id: "tradeoffs-spike-step",
  inputSchema: ArchitectureEvaluationInputSchema,
  outputSchema: TradeoffsOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_1", "openai/gpt-oss-120b");
    const prompt = `أنت مهندس معماري برمجيات رئيسي (Chief Software & Systems Architect).
قم بإجراء تحليل معماري ومفاضلة هندسية عميقة (Architectural Trade-offs Spike):
عنوان النظام: ${inputData.systemTitle}
سياق المشكلة: ${inputData.problemContext}
البدائل المقترحة: ${inputData.alternativesConsidered}
المعايير المرجعية: ${inputData.targetCriteria}

المطلوب:
1. تحليل نقاط القوة والضعف (Pros & Cons) لكل بديل بدقة تقنية جراحية.
2. تقييم المخاطر الخفية والديون التقنية المحتملة (Hidden Technical Debt & Failure Modes).
3. إنشاء جدول مقارنة تفصيلي يستند إلى المعايير المحددة.
4. تقديم الصياغة باللغة العربية الفصحى التقنية الرصينة.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      systemTitle: inputData.systemTitle,
      tradeoffsAnalysis: text,
      criteriaComparisonTable: "جدول المقايضات المعمارية مضمن في التقرير.",
    };
  },
});

// Step 2: Cost, Latency & Cloud Resource Projections
export const costProjectionStep = createStep({
  id: "cost-projection-step",
  inputSchema: TradeoffsOutputSchema,
  outputSchema: CostProjectionOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت خبير هندسة التكاليف السحابية والأداء (FinOps & Performance Engineer).
بناءً على تحليل المقايضات التالي للنظام [${inputData.systemTitle}]:
${inputData.tradeoffsAnalysis}

المطلوب:
1. تقدير زمن الاستجابة (p50 و p99 Latency Projections) لكل مسار تحت أحمال متفاوتة.
2. تقدير تكلفة الاستهلاك السحابي التقريبية شهرياً (Compute, Bandwidth, Database, API Tokens).
3. تقديم توصيات واضحة لخفض التكلفة وتحسين الكفاءة دون المساس بالأمان أو التوافر.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      systemTitle: inputData.systemTitle,
      tradeoffsAnalysis: inputData.tradeoffsAnalysis,
      costLatencyReport: text,
      resourceChecklist: "FinOps projection completed.",
    };
  },
});

// Step 3: Formal ADR (Architectural Decision Record) Generation
export const adrGeneratorStep = createStep({
  id: "adr-generator-step",
  inputSchema: CostProjectionOutputSchema,
  outputSchema: AdrGeneratorOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_3", "openai/gpt-oss-120b");
    const prompt = `أنت رئيس الحوكمة المعمارية (Architecture Governance Lead).
بناءً على تحليلات المقايضات والتكاليف للنظام [${inputData.systemTitle}]:
التحليل المعماري:
${inputData.tradeoffsAnalysis}

تقرير التكاليف والأداء:
${inputData.costLatencyReport}

المطلوب صياغة سجل قرار معماري رسمي كامل (ADR - Architectural Decision Record) بصيغة Markdown قياسية تتضمن الأقسام التالية بدقة:
1. # ADR-[رقم]: [عنوان القرار]
2. ## الحالة (Status): [Approved / Proposed]
3. ## السياق والمشكلة (Context & Problem Statement)
4. ## محركات القرار (Decision Drivers)
5. ## الخيارات المدروسة (Considered Options)
6. ## القرار النهائي والمبرر الجذري (Decision & Rationale)
7. ## العواقب الإيجابية والقيود (Positive Consequences & Negative Trade-offs)
8. ## إرشادات التنفيذ والتحقق (Compliance & Verification Guidelines)

احرص على أن تكون الوثيقة احترافية وموجهة للإيداع في مسار \`.context/adr/\`.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      systemTitle: inputData.systemTitle,
      adrNumber: `ADR-${Math.floor(100 + Math.random() * 900)}`,
      adrMarkdown: text,
      status: "Approved",
      decisionSummary: "تم التقييم وصياغة وثيقة القرار المعماري ADR بنجاح.",
    };
  },
});

// Compose Architecture Evaluation Workflow
export const architectureEvaluationWorkflow = createWorkflow({
  id: "autonomous-architecture-evaluation",
  inputSchema: ArchitectureEvaluationInputSchema,
  outputSchema: AdrGeneratorOutputSchema,
})
  .then(tradeoffsSpikeStep)
  .then(costProjectionStep)
  .then(adrGeneratorStep)
  .commit();
