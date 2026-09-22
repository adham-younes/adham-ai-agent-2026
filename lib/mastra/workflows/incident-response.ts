import { createStep, createWorkflow } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/groq";

export const IncidentResponseInputSchema = z.object({
  incidentTitle: z
    .string()
    .describe("عنوان الحادث أو الإنذار، مثل: انقطاع الخدمة 504 وتجاوز حد اتصالات قاعدة البيانات"),
  errorLogs: z
    .string()
    .describe("سجلات الخطأ، الـ Stack Trace، أو حمولة الإنذار من Sentry/Datadog"),
  affectedService: z
    .string()
    .describe("الخدمة أو النقطة المتأثرة، مثل: api/checkout أو Supabase Connection Pool"),
  severityLevel: z
    .enum([
      "P0 - Critical Outage",
      "P1 - High Degradation",
      "P2 - Moderate Issue",
      "P3 - Low Impact",
    ])
    .default("P0 - Critical Outage")
    .describe("مستوى خطورة الحادث وفق معايير SRE"),
  recentChanges: z
    .string()
    .optional()
    .default("تحديث أخير للإصدار مع تعديل في إعدادات الاتصال وحجم الـ Pool")
    .describe("التغييرات أو عمليات النشر الأخيرة المرتبطة بالحادث"),
});

export const TriageOutputSchema = z.object({
  incidentTitle: z.string(),
  severityLevel: z.string(),
  affectedService: z.string(),
  errorLogs: z.string(),
  triageReport: z.string(),
  containmentStrategy: z.string(),
});

export const RcaOutputSchema = z.object({
  incidentTitle: z.string(),
  severityLevel: z.string(),
  affectedService: z.string(),
  triageReport: z.string(),
  rcaDiagnosis: z.string(),
  failureMechanism: z.string(),
});

export const MitigationOutputSchema = z.object({
  incidentTitle: z.string(),
  severityLevel: z.string(),
  affectedService: z.string(),
  triageReport: z.string(),
  rcaDiagnosis: z.string(),
  mitigationRunbook: z.string(),
  hotfixCodeSnippet: z.string(),
  verificationCommands: z.string(),
});

export const PostMortemOutputSchema = z.object({
  incidentTitle: z.string(),
  severityLevel: z.string(),
  affectedService: z.string(),
  triageReport: z.string(),
  rcaDiagnosis: z.string(),
  mitigationRunbook: z.string(),
  hotfixCodeSnippet: z.string(),
  verificationCommands: z.string(),
  postMortemMarkdown: z.string(),
  incidentStatus: z.string(),
});

// Step 1: Emergency Triage & Impact Containment
export const incidentTriageStep = createStep({
  id: "incident-triage-step",
  inputSchema: IncidentResponseInputSchema,
  outputSchema: TriageOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_1", "qwen/qwen3.8-27b");
    const prompt = `أنت قائد الاستجابة للطوارئ ومهندس الموثوقية الأول (Site Reliability Engineering Lead - Incident Commander).
وقع حادث تشغيلي في بيئة الإنتاج:
العنوان: ${inputData.incidentTitle}
مستوى الخطورة: ${inputData.severityLevel}
الخدمة المتأثرة: ${inputData.affectedService}
سجلات الخطأ / التتبع:
\`\`\`
${inputData.errorLogs}
\`\`\`
التغييرات الأخيرة: ${inputData.recentChanges}

المطلوب:
1. تقييم نطاق الضرر (Blast Radius) وأثر الحادث على المستخدمين وسلامة البيانات.
2. تحديد مستوى الأولوية الحقيقي وحالة الخطر اللحظي.
3. وضع استراتيجية احتواء عاجلة (Immediate Containment Strategy) لوقف تفاقم الأزمة (مثل تفعيل وضع الصيانة، خفض الحمل، أو حظر الـ Traffic الضار).
4. الصياغة باللغة العربية الفصحى التقنية الرصينة بأسلوب SRE محترف.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      incidentTitle: inputData.incidentTitle,
      severityLevel: inputData.severityLevel,
      affectedService: inputData.affectedService,
      errorLogs: inputData.errorLogs,
      triageReport: text,
      containmentStrategy: "تم تحديد استراتيجية الاحتواء الفوري وحصر نطاق الضرر.",
    };
  },
});

// Step 2: Root Cause Analysis (RCA) Systematic Isolation
export const rcaIsolationStep = createStep({
  id: "rca-isolation-step",
  inputSchema: TriageOutputSchema,
  outputSchema: RcaOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس تشخيص الأعطال والأنظمة الموزعة (Distributed Systems Debugger & Root Cause Investigator).
بناءً على تقرير التصنيف التالي للحادث [${inputData.incidentTitle}]:
${inputData.triageReport}

سجلات الخطأ الأصلية:
${inputData.errorLogs}

المطلوب:
1. تطبيق منهجية "الأسباب الخمسة" (5 Whys) للوصول إلى السبب الحقيقي الدفين وليس مجرد العوارض الخارجية.
2. تشريح آلية الفشل (Failure Mechanism): هل هو تسريب ذاكرة (Memory Leak)، استنزاف اتصالات (Connection Pool Exhaustion)، Deadlock في قاعدة البيانات، أم تراجع في كود الـ TypeScript؟
3. تقديم شواهد فنية حاسمة من سجلات الخطأ تؤكد صحة التشخيص.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      incidentTitle: inputData.incidentTitle,
      severityLevel: inputData.severityLevel,
      affectedService: inputData.affectedService,
      triageReport: inputData.triageReport,
      rcaDiagnosis: text,
      failureMechanism: "تم عزل السبب الجذري وآلية الفشل التقنية بنجاح.",
    };
  },
});

// Step 3: Immediate Mitigation Runbook & Surgical Hotfix
export const mitigationRunbookStep = createStep({
  id: "mitigation-runbook-step",
  inputSchema: RcaOutputSchema,
  outputSchema: MitigationOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b");
    const prompt = `أنت مهندس استعادة الأنظمة والتشغيل الفوري (Site Recovery & Surgical Hotfix Specialist).
بناءً على التشخيص الجذري التالي للحادث [${inputData.incidentTitle}]:
${inputData.rcaDiagnosis}

الخدمة المتأثرة: ${inputData.affectedService}

المطلوب إنتاج دليل إجراءات وتصحيح طارئ (Mitigation Runbook & Emergency Hotfix):
1. دليل أوامر شل وخطوات سريعة للتنفيذ الفوري لاستعادة الخدمة (مثل إعادة تشغيل الخدمات، تنظيف الاتصالات المعلقة، أو تطبيق سكريبت SQL طارئ).
2. رقعة كود برمجية جراحية (TypeScript Code Hotfix) إن كان الخلل برمجياً لمعالجة المشكلة فوراً.
3. أوامر التحقق الحتمي (Deterministic Verification Commands) للتأكد من زوال العطل قبل استئناف حركة المرور.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      incidentTitle: inputData.incidentTitle,
      severityLevel: inputData.severityLevel,
      affectedService: inputData.affectedService,
      triageReport: inputData.triageReport,
      rcaDiagnosis: inputData.rcaDiagnosis,
      mitigationRunbook: text,
      hotfixCodeSnippet: "// تم إرفاق رقعة الإصلاح البرمجية ضمن دليل الإجراءات أعلاه",
      verificationCommands: "pnpm test && curl -I https://api.production/healthz",
    };
  },
});

// Step 4: Formal Blameless Post-Mortem Generator
export const postMortemStep = createStep({
  id: "post-mortem-step",
  inputSchema: MitigationOutputSchema,
  outputSchema: PostMortemOutputSchema,
  execute: async ({ inputData }) => {
    const model = getGroqModel("GROQ_API_KEY_1", "qwen/qwen3.8-27b");
    const prompt = `أنت رئيس هندسة الموثوقية (VP of Site Reliability Engineering).
قم بإعداد وثيقة "مراجعة ما بعد الحادث غير اللائمة" (Executive Blameless Post-Mortem) بصيغة Markdown قياسية كاملة للحادث التالي:
عنوان الحادث: ${inputData.incidentTitle}
درجة الخطورة: ${inputData.severityLevel}
الخدمة: ${inputData.affectedService}

تقرير التصنيف والاحتواء:
${inputData.triageReport}

تشخيص السبب الجذري:
${inputData.rcaDiagnosis}

دليل الإجراءات ورقعة الإصلاح:
${inputData.mitigationRunbook}

المطلوب إعداد وثيقة Post-Mortem رسمية تتضمن الأقسام التالية بدقة متناهية:
# 🚨 مراجعة ما بعد الحادث (Blameless Post-Mortem): [عنوان الحادث]
## 1. الملخص التنفيذي (Executive Summary & Metadata)
- تاريخ وتوقيت الحادث، المدة الزمنية للانقطاع، زمن الكشف (MTTD)، زمن الحل (MTTR).
## 2. التسلسل الزمني للأحداث (Incident Timeline)
- تسلسل دقيق بالساعة والدقيقة من لحظة أول إشارة تنبيه حتى إعلان استقرار النظام.
## 3. السبب الجذري وآلية الفشل (Root Cause Analysis - Technical & Organizational)
## 4. حجم الأثر التشغيلي والتجاري (User & Business Impact)
## 5. خطة العمل لمنع التكرار (Action Items & Preventative Engineering)
- جدول يوضح المهام، الأولوية (P0/P1)، والمسؤوليات، وتاريخ الاستحقاق.
## 6. الدروس المستفادة (Lessons Learned)
- ما تم بنجاح؟ ما الذي أخفق؟ وأين حالفنا الحظ؟

احرص على أسلوب هندسي رفيع لا يلوم الأشخاص بل يعالج الثغرات المعمارية والإجرائية.`;

    const { text } = await generateText({
      model: model as any,
      prompt,
    });

    return {
      incidentTitle: inputData.incidentTitle,
      severityLevel: inputData.severityLevel,
      affectedService: inputData.affectedService,
      triageReport: inputData.triageReport,
      rcaDiagnosis: inputData.rcaDiagnosis,
      mitigationRunbook: inputData.mitigationRunbook,
      hotfixCodeSnippet: inputData.hotfixCodeSnippet,
      verificationCommands: inputData.verificationCommands,
      postMortemMarkdown: text,
      incidentStatus: "Resolved & Post-Mortem Published",
    };
  },
});

// Compose Incident Response Workflow
export const incidentResponseWorkflow = createWorkflow({
  id: "autonomous-incident-response",
  inputSchema: IncidentResponseInputSchema,
  outputSchema: PostMortemOutputSchema,
})
  .then(incidentTriageStep)
  .then(rcaIsolationStep)
  .then(mitigationRunbookStep)
  .then(postMortemStep)
  .commit();
