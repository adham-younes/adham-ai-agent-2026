export interface RegionalAiJob {
  title: string;
  url: string;
  publishedAt: string;
  location: string;
  description: string;
  requirements: string;
  source: "WUZZUF";
}

function clean(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g, (entity) => ({
      "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
      "&apos;": "'", "&#39;": "'", "&nbsp;": " ",
    })[entity] ?? entity)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, name: string): string {
  return clean(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "");
}

const ROLE = /\b(?:agentic|ai agents?|llm|large language model|generative ai|genai|ai engineer|ai automation|artificial intelligence|machine learning)\b/i;
const BUILD = /\b(?:build|develop|design|implement|architect|deploy|integrat|automation|workflow|langchain|langgraph|rag|python|n8n)\w*/i;

export function parseRegionalAiJobs(xml: string, limit: number, now = Date.now()): RegionalAiJob[] {
  const matches: Array<{ job: RegionalAiJob; score: number; timestamp: number }> = [];
  const seen = new Set<string>();
  for (const item of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const body = item[1] ?? "";
    const title = tag(body, "title");
    const url = tag(body, "link");
    const description = tag(body, "description");
    const requirements = tag(body, "job_requirements");
    const country = /-Saudi-Arabia(?:[/?#]|$)/i.test(url) ? "Saudi Arabia" :
      /-United-Arab-Emirates(?:[/?#]|$)/i.test(url) ? "United Arab Emirates" : "Egypt";
    const location = [tag(body, "area"), country].filter(Boolean).join(", ");
    const timestamp = Date.parse(tag(body, "pubDate"));
    if (!Number.isFinite(timestamp) || timestamp > now || now - timestamp > 120 * 86400_000) continue;
    if (!/^https:\/\/wuzzuf\.net\/jobs\/p\//i.test(url) || seen.has(url)) continue;
    const content = `${title} ${description} ${requirements}`;
    if (!ROLE.test(`${title} ${description}`) || !BUILD.test(content)) continue;
    const score = (ROLE.test(title) ? 5 : 0) + (BUILD.test(title) ? 2 : 0) +
      (/\b(?:agentic|ai agents?|llm|rag|langchain|langgraph)\b/i.test(content) ? 3 : 0);
    if (score < 3) continue;
    seen.add(url);
    matches.push({
      job: {
        title, url, publishedAt: new Date(timestamp).toISOString(), location,
        description: description.slice(0, 1100), requirements: requirements.slice(0, 900), source: "WUZZUF",
      }, score, timestamp,
    });
  }
  const ranked = matches.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
  const gulf = ranked.filter(({ job }) => !job.location.endsWith("Egypt")).slice(0, Math.min(2, Math.floor(limit / 3)));
  const chosen = [...gulf, ...ranked.filter((candidate) => !gulf.includes(candidate)).slice(0, limit - gulf.length)];
  return chosen.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp).map(({ job }) => job);
}
