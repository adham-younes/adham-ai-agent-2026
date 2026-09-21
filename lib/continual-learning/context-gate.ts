import { ContextGateDecision, LearnedRule } from "./types";

/**
 * Normalizes text for semantic token matching
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

/**
 * Calculates Jaccard / Overlap similarity between two token sets
 */
function calculateSimilarity(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return Math.min(1.0, (intersection / union) * 1.5); // Weighted token overlap
}

/**
 * Evaluates whether a LearnedRule may be applied to the current context without causing Negative Transfer.
 * Mathematical formula:
 * Trigger Rule <=> Similarity(Current Context, Rule Validity Boundary) >= tau AND NOT in Prohibited Contexts
 */
export function evaluateContextGate(
  currentContextText: string,
  rule: LearnedRule,
  threshold: number = 0.75,
): ContextGateDecision {
  const currentTokens = tokenize(currentContextText);
  const boundaryTokens = tokenize(`${rule.validityBoundary} ${rule.boundaryKeywords.join(" ")}`);
  const prohibitedTokens = tokenize(rule.prohibitedContexts);

  // 1. Check for Negative Transfer Trigger
  const prohibitedHits: string[] = [];
  for (const token of prohibitedTokens) {
    if (currentTokens.has(token)) {
      prohibitedHits.push(token);
    }
  }

  const matchedKeywords: string[] = [];
  for (const kw of rule.boundaryKeywords) {
    if (currentTokens.has(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    }
  }

  if (prohibitedHits.length >= 2) {
    return {
      ruleId: rule.id,
      ruleTitle: rule.title,
      similarityScore: 0.15,
      threshold,
      isApproved: false,
      status: "BLOCKED_NEGATIVE_TRANSFER",
      reasoning: `تم حجب القاعدة لحماية الوكيل من النقل السلبي (Negative Transfer). السياق الحالي يتضمن موانع تطبيق واضحة: [${rule.prohibitedContexts}].`,
      prohibitedHits,
      matchedKeywords,
      transferRisk: "حرجة جداً (Critical Negative Transfer Hazard) - موانع سياقية صريحة مرصودة",
    };
  }

  // 2. Compute Semantic Boundary Similarity
  const similarityScore = Math.round(calculateSimilarity(currentTokens, boundaryTokens) * 100) / 100;

  if (similarityScore >= threshold) {
    return {
      ruleId: rule.id,
      ruleTitle: rule.title,
      similarityScore,
      threshold,
      isApproved: true,
      status: "APPROVED",
      reasoning: `تمت الموافقة وتمرير بوابة السياق. نسبة التشابه الدلالي (${similarityScore}) تتجاوز عتبة الأمان (${threshold}) وتطابق نطاق الشرعية [${rule.validityBoundary}].`,
      prohibitedHits,
      matchedKeywords,
      transferRisk: "منعدمة أو منخفضة جداً (Safe Optimal Transfer)",
    };
  }

  return {
    ruleId: rule.id,
    ruleTitle: rule.title,
    similarityScore,
    threshold,
    isApproved: false,
    status: "BELOW_SIMILARITY_THRESHOLD",
    reasoning: `لم يتم تفعيل القاعدة لأن نسبة التشابه السياقي (${similarityScore}) أقل من عتبة الشرعية المطلوبة (${threshold}). تم حجب القاعدة لتفادي التداخل المعرفي.`,
    prohibitedHits,
    matchedKeywords,
    transferRisk: "متوسطة - تشابه غير كافٍ لضمان سلامة النقل",
  };
}
