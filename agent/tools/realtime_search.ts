import { defineTool } from "eve/tools";
import { z } from "zod";

const inputSchema = z.object({
  query: z.string().trim().min(2).max(300),
  limit: z.number().int().min(1).max(8).default(5),
});

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeResultUrl(value: string): string {
  const decoded = decodeHtml(value);
  const absolute = decoded.startsWith("//") ? `https:${decoded}` : decoded;
  try {
    const url = new URL(absolute);
    return url.hostname.endsWith("duckduckgo.com")
      ? (url.searchParams.get("uddg") ?? absolute)
      : absolute;
  } catch {
    return absolute;
  }
}

export default defineTool({
  description: "ابحث لحظياً في الويب وأعد نتائج حديثة بعناوين وروابط ومقتطفات. استخدمه للحقائق المتغيرة والأخبار والمراجع الحالية.",
  inputSchema,
  async execute(input) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const endpoint = new URL("https://html.duckduckgo.com/html/");
      endpoint.searchParams.set("q", input.query);
      const response = await fetch(endpoint, {
        headers: { "accept-language": "ar,en;q=0.8", "user-agent": "Mozilla/5.0 (compatible; AdhamAgent/3.0)" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Search provider returned ${response.status}`);
      const html = await response.text();
      const resultPattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      const results = [...html.matchAll(resultPattern)]
        .slice(0, input.limit)
        .map((match) => ({
          title: decodeHtml(match[2] ?? ""),
          url: decodeResultUrl(match[1] ?? ""),
          snippet: decodeHtml(match[3] ?? "").slice(0, 600),
        }))
        .filter((result) => result.title && result.url);
      return { query: input.query, searchedAt: new Date().toISOString(), results };
    } finally {
      clearTimeout(timeout);
    }
  },
  toModelOutput(output) {
    return { type: "json", value: output };
  },
});
