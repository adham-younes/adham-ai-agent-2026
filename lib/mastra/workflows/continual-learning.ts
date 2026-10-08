import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/groq";
import { evaluateContextGate } from "../../continual-learning/context-gate";
import { LearnedRule } from "../../continual-learning/types";

export const ContinualLearningInputSchema = z.object({
  episodeTask: z
    .string().trim().min(1).max(100000)
    .optional()
    .describe("المهمة التشغيلية أو الحادثة السابقة المراد استيعابها والتعلم منها"),
  task: z.string().trim().min(1).max(100000).optional(),
  episodeDomain: z
    .string().trim().min(1).max(100000)
    .optional()
    .describe("المجال الهندسي والصناعي، مثل: B2B E-Commerce، توربينات الرياح، الرعاية الصحية"),
  domain: z.string().trim().min(1).max(100000).optional(),
  episodeEnvironment: z
    .string().trim().min(1).max(100000)
    .optional()
    .describe("البيئة التقنية، مثل: Next.js 16 + Supabase PostgreSQL + Vercel Edge"),
  environment: z.string().trim().min(1).max(100000).optional(),
  decisionTaken: z
    .string().trim().min(1).max(100000)
    .describe("القرار أو الإجراء الذي اتخذه الوكيل سابقاً"),
  observedReality: z
    .string().trim().min(1).max(100000)
    .describe("الواقع والنتيجة الفعلية الميدانية، والأثر الإيجابي أو السلبي الناتج"),
  targetNewContext: z
    .string().trim().min(1).max(100000)
    .optional()
    .default("No target context supplied; request a concrete target context before applying the lesson.")
    .describe("سياق عمل جديد لفحصه عبر بوابة السياق (Context Gate) واختبار منع النقل السلبي"),
});

export const EpisodeIngestionOutputSchema = z.object({
  episodeTask: z.string(),
  episodeDomain: z.string(),
  episodeEnvironment: z.string(),
  decisionTaken: z.string(),
  observedReality: z.string(),
  targetNewContext: z.string(),
  episodeAnalysisReport: z.string(),
  outcomeScore: z.number(),
});

export const HeuristicExtractionOutputSchema = z.object({
  episodeTask: z.string(),
  targetNewContext: z.string(),
  ruleTitle: z.string(),
  lessonLearned: z.string(),
  validityBoundary: z.string(),
  prohibitedContexts: z.string(),
  boundaryKeywords: z.array(z.string()),
  ruleExtractionMarkdown: z.string(),
});

export const ContextGatingOutputSchema = z.object({
  ruleTitle: z.string(),
  lessonLearned: z.string(),
  validityBoundary: z.string(),
  prohibitedContexts: z.string(),
  targetNewContext: z.string(),
  gateStatus: z.string(),
  similarityScore: z.number(),
  gatingReportMarkdown: z.string(),
  continualLearningStatus: z.string(),
});

// Step 1: Ingest Episode & Structure Experience
export const episodeIngestionStep = createStep({
  id: "episode-ingestion-step",
  inputSchema: ContinualLearningInputSchema,
  outputSchema: EpisodeIngestionOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_1", "qwen/qwen3.8-27b");
    const episodeTask = inputData.episodeTask || inputData.task || "المهمة الهندسية المسجلة";
    const episodeDomain = inputData.episodeDomain || inputData.domain || "backend-database";
    const episodeEnvironment = inputData.episodeEnvironment || inputData.environment || "production";
    const targetNewContext = inputData.targetNewContext || "تطبيق نفس القاعدة على منصة مزادات حية عالية السرعة";

    const prompt = `أنت مهندس التعلم المستمر والتقييم النظمي (Continual Learning & Evaluation Engineer).
قم بتحليل التجربة الميدانية السابقة وفق الهيكل الرباعي المعتمد:
[السياق - Context]: المهمة: ${episodeTask} | المجال: ${episodeDomain} | البيئة: ${episodeEnvironment}
[القرار - Decision]: ${inputData.decisionTaken}
[الواقع الميداني - Reality]: ${inputData.observedReality}

المطلوب:
1. تشريح الفجوة بين القرار المتخذ والواقع الميداني بدقة تقنية.
2. تقييم أثر النتيجة بدرجة رقمية دقيقة بين -1.0 (كارثة تشغيلية) إلى +1.0 (نجاح تام).
3. تحديد أنماط الفشل أو عوامل النجاح الحتمية.
4. الصياغة in English.`;

    const { text } = await generateText({
      model: model as any,
      system: "Write every report, heading, and explanation in English. Produce drafts for human review. You cannot run commands, inspect live infrastructure, deploy software, approve decisions, or resolve incidents. Never claim execution, approval, publication, verified tests, or observed facts without supplied evidence. Label assumptions and unknowns explicitly. Do not invent dates, authors, measurements, or verification outcomes; omit them unless supplied.",
      prompt,
    });

    return {
      episodeTask,
      episodeDomain,
      episodeEnvironment,
      decisionTaken: inputData.decisionTaken,
      observedReality: inputData.observedReality,
      targetNewContext,
      episodeAnalysisReport: text,
      outcomeScore: 0, // Unknown: generated text is not measured outcome evidence.
    };
  },
});

// Step 2: Extract Reusable Heuristic with Explicit Validity Boundary & Prohibitions
export const heuristicExtractionStep = createStep({
  id: "heuristic-extraction-step",
  inputSchema: EpisodeIngestionOutputSchema,
  outputSchema: HeuristicExtractionOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس استخلاص المعرفة وتجريد القواعد (Heuristic Extractor & Knowledge Engineer).
بناءً على تحليل التجربة التالية:
${inputData.episodeAnalysisReport}

المهمة: استخلاص "قاعدة معرفية عامة مجردة" (Reusable Heuristic) لتوجيه سلوك الوكيل في المستقبل، مع **تحديد حدود صلاحيتها والموانع الصارمة لمنع ظاهرة النقل السلبي (Negative Transfer)**:

المطلوب بدقة:
1. عنوان القاعدة (Rule Title).
2. الدرس المستفاد الجوهري (Core Lesson Learned).
3. نطاق الصلاحية والشرعية (Validity Boundary): ما هي البيئات والظروف التي تكون فيها هذه القاعدة صحيحة ومفيدة حتماً؟
4. موانع التطبيق (Prohibited Contexts): ما هي البيئات أو الشروط التي إذا طُبقت فيها هذه القاعدة ستحدث كارثة تشغيلية أو نقلاً سلبياً؟
5. الكلمات المفتاحية الدلالية للنطاق (5-7 كلمات تقنية).`;

    const { text } = await generateText({
      model: model as any,
      system: "Write every report, heading, and explanation in English. Produce drafts for human review. You cannot run commands, inspect live infrastructure, deploy software, approve decisions, or resolve incidents. Never claim execution, approval, publication, verified tests, or observed facts without supplied evidence. Label assumptions and unknowns explicitly. Do not invent dates, authors, measurements, or verification outcomes; omit them unless supplied.",
      prompt,
    });

    return {
      episodeTask: inputData.episodeTask,
      targetNewContext: inputData.targetNewContext,
      ruleTitle: `Candidate lesson: ${inputData.episodeTask.slice(0, 50)}`,
      lessonLearned: "Review the candidate lesson in the generated report; it has not been independently validated.",
      validityBoundary: `${inputData.episodeDomain} - ${inputData.episodeEnvironment}`,
      prohibitedContexts: "Do not apply outside the original conditions without independent validation.",
      boundaryKeywords: ["performance", "latency", "architecture", "safety", "context"],
      ruleExtractionMarkdown: text,
    };
  },
});

// Step 3: Context Gating & Negative Transfer Prevention
export const contextGatingStep = createStep({
  id: "context-gating-step",
  inputSchema: HeuristicExtractionOutputSchema,
  outputSchema: ContextGatingOutputSchema,
  execute: async ({ inputData }) => {
    const candidateRule: LearnedRule = {
      id: `rule_${Date.now()}`,
      title: inputData.ruleTitle,
      lessonLearned: inputData.lessonLearned,
      validityBoundary: inputData.validityBoundary,
      prohibitedContexts: inputData.prohibitedContexts,
      boundaryKeywords: inputData.boundaryKeywords,
      confidenceScore: 0, // Unvalidated candidate, not a learned fact.
      createdAt: new Date().toISOString().split("T")[0],
    };

    // Evaluate mathematically through our Context Gate Engine
    const gateDecision = evaluateContextGate(inputData.targetNewContext, candidateRule, 0.70);

    const model = getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b");
    const prompt = `أنت حارس بوابات السياق ومنع النقل السلبي (Context Gatekeeper & Safety Lead).
تم فحص القاعدة المستخلصة التالية:
العنوان: ${inputData.ruleTitle}
تقرير استخلاص القاعدة:
${inputData.ruleExtractionMarkdown}

السياق الجديد المطلوب فحص ملاءمة تطبيق القاعدة عليه:
"${inputData.targetNewContext}"

قرار البوابة الرياضي المحسوب:
الحالة: ${gateDecision.status}
نسبة التشابه الدلالي: ${gateDecision.similarityScore} (العتبة: ${gateDecision.threshold})
المبرر النظمي: ${gateDecision.reasoning}

المطلوب:
صياغة تقرير "قرار بوابة السياق والتعلم المستمر (Context Gating Decision Report)" بصيغة Markdown قياسية:
1. # 🧠 قرار بوابة السياق ومنع النقل السلبي
2. ## 1. تقييم الشرعية والملاءمة السياقية (Context Applicability Assessment)
3. ## 2. فحص مخاطر النقل السلبي (Negative Transfer Risk Analysis)
4. ## 3. نتيجة البوابة النهائية (Final Gate Verdict): [APPROVED / BLOCKED]
5. ## 4. الإرشادات التنفيذية للوكيل القائد (Executive Policy Recommendation)`;

    const { text } = await generateText({
      model: model as any,
      system: "Write every report, heading, and explanation in English. Produce drafts for human review. You cannot run commands, inspect live infrastructure, deploy software, approve decisions, or resolve incidents. Never claim execution, approval, publication, verified tests, or observed facts without supplied evidence. Label assumptions and unknowns explicitly. Do not invent dates, authors, measurements, or verification outcomes; omit them unless supplied.",
      prompt,
    });

    return {
      ruleTitle: inputData.ruleTitle,
      lessonLearned: inputData.lessonLearned,
      validityBoundary: inputData.validityBoundary,
      prohibitedContexts: inputData.prohibitedContexts,
      targetNewContext: inputData.targetNewContext,
      gateStatus: gateDecision.status,
      similarityScore: gateDecision.similarityScore,
      gatingReportMarkdown: text,
      continualLearningStatus: "Heuristic context check completed; independent validation is pending",
    };
  },
});

// Compose Continual Learning Workflow
export const continualLearningWorkflow = createWorkflow({
  id: "autonomous-continual-learning",
  inputSchema: ContinualLearningInputSchema,
  outputSchema: ContextGatingOutputSchema,
})
  .then(episodeIngestionStep)
  .then(heuristicExtractionStep)
  .then(contextGatingStep)
  .commit();
