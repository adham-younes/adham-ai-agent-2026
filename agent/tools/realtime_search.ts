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

type SearchResult = { title: string; url: string; snippet: string };

function parseBingRss(xml: string, limit: number): SearchResult[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .slice(0, limit)
    .map((item) => {
      const body = item[1] ?? "";
      const value = (tag: string) =>
        decodeHtml(body.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "");
      return {
        title: value("title"),
        url: value("link"),
        snippet: value("description").slice(0, 600),
      };
    })
    .filter((result) => result.title && result.url);
}

function parseDuckDuckGo(html: string, limit: number): SearchResult[] {
  const resultPattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  return [...html.matchAll(resultPattern)]
    .slice(0, limit)
    .map((match) => ({
      title: decodeHtml(match[2] ?? ""),
      url: decodeResultUrl(match[1] ?? ""),
      snippet: decodeHtml(match[3] ?? "").slice(0, 600),
    }))
    .filter((result) => result.title && result.url);
}

export default defineTool({
  description: "ابحث لحظياً في الويب وأعد نتائج حديثة بعناوين وروابط ومقتطفات. استخدمه للحقائق المتغيرة والأخبار والمراجع الحالية.",
  inputSchema,
  async execute(input) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const headers = {
        "accept-language": "ar,en;q=0.8",
        "user-agent": "Mozilla/5.0 (compatible; AdhamAgent/3.0)",
      };
      const bing = new URL("https://www.bing.com/search");
      bing.searchParams.set("q", input.query);
      bing.searchParams.set("format", "rss");
      const bingResponse = await fetch(bing, { headers, signal: controller.signal });
      let results = bingResponse.ok ? parseBingRss(await bingResponse.text(), input.limit) : [];

      if (results.length === 0) {
        const duckDuckGo = new URL("https://html.duckduckgo.com/html/");
        duckDuckGo.searchParams.set("q", input.query);
        const duckResponse = await fetch(duckDuckGo, { headers, signal: controller.signal });
        if (duckResponse.ok) results = parseDuckDuckGo(await duckResponse.text(), input.limit);
      }

      if (results.length === 0) throw new Error("Search providers returned no usable results");
      return { query: input.query, searchedAt: new Date().toISOString(), results };
    } finally {
      clearTimeout(timeout);
    }
  },
  toModelOutput(output) {
    return { type: "json", value: output };
  },
});
