import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRegionalAiJobs } from "../lib/regional-ai-jobs.ts";

const now = Date.parse("2026-09-23T12:00:00Z");
function item(title, url, date = "Tue, 22 Sep 2026 10:00:00 GMT", description = "Build LLM agentic AI workflows with Python and RAG") {
  return `<item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate><description>${description}</description><job_requirements>Develop agentic systems</job_requirements></item>`;
}

test("returns bounded regional AI jobs with a Gulf posting", () => {
  const xml = `<rss>${item("AI Engineer", "https://wuzzuf.net/jobs/p/1-AI-Engineer-Cairo-Egypt")}${item("LLM Engineer", "https://wuzzuf.net/jobs/p/2-LLM-Engineer-Riyadh-Saudi-Arabia")}${item("AI Engineer", "https://wuzzuf.net/jobs/p/3-AI-Engineer-Cairo-Egypt")}</rss>`;
  const jobs = parseRegionalAiJobs(xml, 3, now);
  assert.equal(jobs.length, 3);
  assert.ok(jobs.some((job) => job.location.includes("Saudi Arabia")));
});

test("rejects stale, unsafe and unrelated postings", () => {
  const xml = `<rss>${item("Salesperson", "https://wuzzuf.net/jobs/p/4-Sales-Cairo-Egypt", undefined, "Sell clothing")}${item("AI Engineer", "javascript:alert(1)")}${item("AI Engineer", "https://wuzzuf.net/jobs/p/5-AI-Engineer-Cairo-Egypt", "Tue, 01 Jan 2024 10:00:00 GMT")}</rss>`;
  assert.deepEqual(parseRegionalAiJobs(xml, 5, now), []);
});
