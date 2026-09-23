import { defineTool } from "eve/tools";
import { z } from "zod";
import { parseRegionalAiJobs } from "@/lib/regional-ai-jobs";

export default defineTool({
  description: "ابحث في إعلانات WUZZUF المنشورة حديثاً عن وظائف بناء أنظمة AI agents وLLM والأتمتة في مصر وبعض دول الخليج. أعد الوصف التقني والتاريخ والرابط مباشرة دون تنزيل الملف أو كتابة سكربت. هذا مصدر واحد وليس بحثاً شاملاً لكل السوق.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(10).default(6) }),
  label: { start: () => "البحث في إعلانات وظائف الذكاء الاصطناعي" },
  async execute({ limit }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14_000);
    try {
      const response = await fetch("https://wuzzuf.net/feeds/all-jobs.xml", {
        signal: controller.signal,
        headers: { accept: "application/rss+xml, application/xml, text/xml" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`WUZZUF feed returned HTTP ${response.status}`);
      const declaredSize = Number(response.headers.get("content-length") ?? 0);
      if (declaredSize > 20_000_000) throw new Error("WUZZUF feed exceeded the 20 MB size limit");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("WUZZUF feed has no response body");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 20_000_000) {
          await reader.cancel();
          throw new Error("WUZZUF feed exceeded the 20 MB size limit");
        }
        chunks.push(value);
      }
      const xml = new TextDecoder().decode(Buffer.concat(chunks));
      const jobs = parseRegionalAiJobs(xml, limit);
      return {
        searchedAt: new Date().toISOString(), source: "https://wuzzuf.net/feeds/all-jobs.xml",
        coverage: "WUZZUF feed only; postings may close after publication",
        jobs,
        warning: jobs.length ? undefined : "لم تظهر إعلانات مطابقة في آخر 120 يوماً بهذا المصدر؛ وسّع البحث بمصادر أخرى.",
      };
    } finally {
      clearTimeout(timeout);
    }
  },
  toModelOutput(output) { return { type: "json", value: output }; },
});
