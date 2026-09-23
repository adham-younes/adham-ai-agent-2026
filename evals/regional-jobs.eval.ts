import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "Regional agentic AI job research uses the bounded source tool and cites a direct listing.",
  timeoutMs: 120_000,
  async test(t) {
    await t.send("ابحث عن إعلان وظيفة حديث لبناء AI agents في مصر أو السعودية. استخدم regional_ai_jobs، وقدّم رابط الإعلان المباشر وتاريخ النشر وحدود تغطية المصدر.");
    t.succeeded();
    t.calledTool("regional_ai_jobs");
    t.check(t.reply, includes("wuzzuf.net/jobs/p/"));
  },
});
