import assert from "node:assert/strict";
import test from "node:test";
import { rankSearchResults } from "../lib/search-relevance.ts";

test("ranks relevant documentation above a similarly named store", () => {
  const results = rankSearchResults("Next.js 16 documentation", [
    { title: "Next US Official Site | Shop Online", url: "https://www.next.us/en", snippet: "Clothing and fashion" },
    { title: "Next.js 16 Documentation", url: "https://nextjs.org/docs", snippet: "Read the Next.js 16 docs" },
  ], 2);
  assert.deepEqual(results.map((result) => result.url), ["https://nextjs.org/docs"]);
});

test("rejects unrelated results rather than presenting them as search evidence", () => {
  assert.deepEqual(rankSearchResults("Next.js 16 documentation", [
    { title: "Next US Official Site", url: "https://www.next.us/en", snippet: "New summer clothes" },
  ], 2), []);
});

test("keeps Arabic results and rejects duplicate or unsafe URLs", () => {
  const results = rankSearchResults("أخبار القاهرة", [
    { title: "أخبار القاهرة اليوم", url: "https://example.org/news", snippet: "تحديث مباشر" },
    { title: "أخبار القاهرة", url: "https://example.org/news/", snippet: "نسخة مكررة" },
    { title: "أخبار القاهرة", url: "javascript:alert(1)", snippet: "غير آمن" },
  ], 3);
  assert.equal(results.length, 1);
  assert.equal(results[0].url, "https://example.org/news");
});
