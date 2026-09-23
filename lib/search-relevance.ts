export interface SearchResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "about", "find", "for", "in", "is", "latest", "of", "on", "or", "please", "search", "the", "to", "what", "with",
  "ابحث", "أحدث", "الآن", "اليوم", "عن", "في", "من", "على", "إلى", "و", "ما", "هو", "هي",
]);

function terms(value: string): string[] {
  return (value.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+(?:\.[\p{L}\p{N}]+)*/gu) ?? [])
    .map((term) => term === "documentation" ? "docs" : term === "nextjs" ? "next.js" : term)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function uniqueTerms(value: string): string[] {
  return [...new Set(terms(value))];
}

export function rankSearchResults(query: string, candidates: readonly SearchResult[], limit: number): SearchResult[] {
  const queryTerms = uniqueTerms(query);
  if (queryTerms.length === 0) return [];

  const seen = new Set<string>();
  return candidates
    .flatMap((result) => {
      let url: URL;
      try {
        url = new URL(result.url);
      } catch {
        return [];
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") return [];
      const identity = `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
      if (seen.has(identity)) return [];
      seen.add(identity);

      const title = new Set(uniqueTerms(result.title));
      const address = new Set(uniqueTerms(`${url.hostname} ${url.pathname.replaceAll("/", " ")}`));
      const snippet = new Set(uniqueTerms(result.snippet));
      const matched = queryTerms.filter((term) => title.has(term) || address.has(term) || snippet.has(term));
      const minimumMatches = Math.min(3, Math.max(1, Math.ceil(queryTerms.length * 0.5)));
      if (matched.length < minimumMatches) return [];
      const score = matched.reduce((sum, term) =>
        sum + (title.has(term) ? 4 : 0) + (address.has(term) ? 3 : 0) + (snippet.has(term) ? 1 : 0), 0);
      return [{ result, score }];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ result }) => result);
}
