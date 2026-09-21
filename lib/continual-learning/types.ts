export interface EpisodicRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly pipeline: string;
  readonly context: {
    readonly task: string;
    readonly domain: string;
    readonly environment: string;
    readonly constraints?: string;
  };
  readonly decision: {
    readonly actionTaken: string;
    readonly rationale: string;
  };
  readonly reality: {
    readonly actualOutcome: "SUCCESS" | "FAILURE" | "DEGRADED";
    readonly failureMode?: string;
    readonly observation: string;
  };
  readonly outcomeScore: number; // -1.0 (disaster) to +1.0 (flawless)
}

export interface LearnedRule {
  readonly id: string;
  readonly title: string;
  readonly lessonLearned: string;
  readonly validityBoundary: string; // The explicit conditions/environments where this rule is valid
  readonly prohibitedContexts: string; // Conditions where applying this rule causes NEGATIVE TRANSFER
  readonly boundaryKeywords: readonly string[]; // Tokens/keywords defining the valid domain
  readonly sourceEpisodeId?: string;
  readonly confidenceScore: number; // 0.0 to 1.0
  readonly createdAt: string;
}

export interface ContextGateDecision {
  readonly ruleId: string;
  readonly ruleTitle: string;
  readonly similarityScore: number; // 0.0 to 1.0
  readonly threshold: number; // e.g. 0.80
  readonly isApproved: boolean;
  readonly status: "APPROVED" | "BLOCKED_NEGATIVE_TRANSFER" | "BELOW_SIMILARITY_THRESHOLD";
  readonly reasoning: string;
  readonly prohibitedHits?: readonly string[];
  readonly matchedKeywords?: readonly string[];
  readonly transferRisk?: string;
}
