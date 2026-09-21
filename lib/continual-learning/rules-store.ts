import { EpisodicRecord, LearnedRule } from "./types";

/**
 * Curated Enterprise Knowledge Base of Learned Rules with explicit Validity Boundaries
 * to illustrate the Context Gating Architecture and prevent Negative Transfer.
 */
export const SEED_LEARNED_RULES: readonly LearnedRule[] = [
  {
    id: "rule-sre-db-pool-01",
    title: "منع استنزاف اتصالات PostgreSQL عبر تحديد سقف الـ Pool واستخدام البوابات الحتمية",
    lessonLearned:
      "عند حدوث طفرات مفاجئة في حركة المرور (Traffic Spikes)، يجب عدم السماح لكل طلب بفتح اتصال متزامن مباشر بقاعدة البيانات؛ بل فرض طبقة تخزين مؤقت (Redis/In-Memory Cache) وفصل استعلامات القراءة عن الكتابة.",
    validityBoundary:
      "واجهات برمجة التطبيقات ذات الحمل العالي (High-Throughput APIs)، قواعد بيانات PostgreSQL / Supabase ذات اتصالات محدودة (Pool Size < 200).",
    prohibitedContexts:
      "المعاملات المالية الحتمية التي تتطلب قفل العزل الفوري (Serializable ACID Transactions) أو الاستعلامات الفردية المحلية المعزولة.",
    boundaryKeywords: ["postgresql", "supabase", "pool", "connections", "traffic", "checkout", "cache", "504"],
    confidenceScore: 0.98,
    createdAt: "2026-09-21",
  },
  {
    id: "rule-react-ssr-hydration-02",
    title: "عزل قراءة localStorage ومحددات المتصفح داخل useEffect لمنع خطأ Hydration Mismatch",
    lessonLearned:
      "في Next.js مع Server-Side Rendering، لا تقم أبداً بتهيئة حالة المكون مباشرة من localStorage أثناء الـ Render الأولي؛ بل اقرأ التخزين داخل useEffect بعد اكتمال الـ Mount في المتصفح.",
    validityBoundary:
      "مكونات Next.js 16 Client Components، بيئات React SSR، واجهات التخزين المحلي للمتصفح (localStorage, sessionStorage).",
    prohibitedContexts:
      "سكريبتات Node.js الخلفية، معالجات Edge API Routes التي تعمل على الخادم فقط، أو مكونات React Server Components (RSC).",
    boundaryKeywords: ["react", "nextjs", "hydration", "localstorage", "ssr", "client", "useeffect"],
    confidenceScore: 0.99,
    createdAt: "2026-09-21",
  },
  {
    id: "rule-industrial-wind-turbine-03",
    title: "فصل تشخيص اهتزاز المحامل الميكانيكية عن أعطال التروس الكهربائية عبر بوابات الرطوبة",
    lessonLearned:
      "في محطات توربينات الرياح البحرية، تتسبب الرطوبة العالية في قراءات اهتزاز شاذة مؤقتة في المحامل لا تعني تلف التروس؛ لذا يجب فحص عامل الرطوبة قبل إرسال فرق الصيانة بالمروحيات لتوفير النفقات.",
    validityBoundary:
      "توربينات الرياح البحرية والساحلية (Offshore Wind Turbines)، بيئات الرطوبة العالية (>80% Humidity)، حساسات الاهتزاز الميكانيكية.",
    prohibitedContexts:
      "توربينات الرياح الصحراوية الجافة (Arid/Desert Farms) أو محطات التوليد الحرارية المغلقة، حيث يشير الاهتزاز حتماً لكسر ميكانيكي صريح.",
    boundaryKeywords: ["turbine", "wind", "offshore", "vibration", "humidity", "bearings", "gearbox", "sensor"],
    confidenceScore: 0.95,
    createdAt: "2026-09-21",
  },
  {
    id: "rule-saga-financial-reversal-04",
    title: "إلزامية تسجيل المعاملة التعويضية المقترنة بمفتاح القوة الخاملة (Idempotency Key)",
    lessonLearned:
      "في العمليات المالية متعددة الخدمات (خصم رصيد -> إصدار فاتورة)، يجب ألا يُنفذ أمر الخصم إلا بعد تسجيل دالة الإلغاء التعويضية مع مفتاح فريد يمنع تكرار الخصم عند انقطاع الشبكة.",
    validityBoundary:
      "معاملات الدفع والمحافظ المالية (Fintech & Payment Gateways)، النظم الموزعة متعددة الخدمات (Microservices Distributed Saga).",
    prohibitedContexts:
      "استعلامات القراءة فقط (Read-only Queries) أو عمليات المعاينة السريعة التي لا تحدث أثراً جانبياً دائماً.",
    boundaryKeywords: ["saga", "financial", "payment", "idempotency", "compensating", "wallet", "ledger"],
    confidenceScore: 0.97,
    createdAt: "2026-09-21",
  },
];

/**
 * Seed Episodic Memory Records representing past real-world executions
 */
export const SEED_EPISODIC_RECORDS: readonly EpisodicRecord[] = [
  {
    id: "ep-2026-checkout-504",
    timestamp: "2026-09-21 20:40:02",
    pipeline: "incident-response",
    context: {
      task: "استجابة لطوارئ انقطاع بوابة الدفع /api/checkout تحت حمل 5000 طلب/ثانية",
      domain: "B2B E-Commerce & Payments",
      environment: "Vercel Edge + Supabase PostgreSQL Pool (100 conns)",
      constraints: "زمن استجابة أقل من 500ms وممنوع فقدان أي عملية شراء",
    },
    decision: {
      actionTaken: "زيادة حجم الاتصالات المتزامنة بدون طبقة كاش وسيطة",
      rationale: "محاولة استيعاب الطلب المتزايد برفع استهلاك الاتصالات المباشرة",
    },
    reality: {
      actualOutcome: "FAILURE",
      failureMode: "Connection pool exhausted & HTTP 504 Gateway Timeout",
      observation:
        "انهيار تجمع الاتصالات وتراكم 450 طلباً في طابور الانتظار وتوقف بوابة الدفع لمدة 50 دقيقة قبل التدخل بوضع صفحة الصيانة وإضافة الـ Caching.",
    },
    outcomeScore: -0.9,
  },
  {
    id: "ep-2026-mastra-dag-deploy",
    timestamp: "2026-09-21 23:40:15",
    pipeline: "release-readiness",
    context: {
      task: "نشر محرك مسارات Mastra وسرب Groq LPU في بيئة Vercel الإنتاجية",
      domain: "Distributed AI Agent App",
      environment: "Next.js 16 Turbopack + Node 22 Nitro Server",
      constraints: "صفر أخطاء TypeScript وتوافق كامل لبيئة Edge",
    },
    decision: {
      actionTaken: "فصل استدعاءات Eve عن بيئة Next.js واستخدام build:eve محلياً قبل vercel --prod",
      rationale: "حماية حزم nitro وخوادم التطبيق من تضارب حزم rolldown",
    },
    reality: {
      actualOutcome: "SUCCESS",
      observation: "نجاح البناء في 2.5 ثانية وظهور صفحة Vercel Production بحالة Ready ونسبة استجابة 200 OK حتمية.",
    },
    outcomeScore: 0.98,
  },
];
