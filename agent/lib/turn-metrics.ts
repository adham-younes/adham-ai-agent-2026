import { defineState } from "eve/context";

export const turnMetrics = defineState("adham-agent.turn-metrics.v1", () => ({
  startedAt: 0,
  toolCalls: 0,
  toolErrors: 0,
}));
