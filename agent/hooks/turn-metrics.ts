import { defineHook } from "eve/hooks";
import { turnMetrics } from "../lib/turn-metrics";

export default defineHook({
  events: {
    "turn.started"() {
      turnMetrics.update(() => ({ startedAt: Date.now(), toolCalls: 0, toolErrors: 0 }));
    },
    "action.result"(event) {
      turnMetrics.update((current) => ({
        ...current,
        toolCalls: current.toolCalls + 1,
        toolErrors: current.toolErrors + (event.data.result.isError ? 1 : 0),
      }));
    },
    "turn.completed"(_event, ctx) {
      const metrics = turnMetrics.get();
      console.info("agent.turn", {
        sessionId: ctx.session.id,
        outcome: "completed",
        durationMs: Math.max(0, Date.now() - metrics.startedAt),
        toolCalls: metrics.toolCalls,
        toolErrors: metrics.toolErrors,
      });
    },
    "turn.failed"(_event, ctx) {
      const metrics = turnMetrics.get();
      console.warn("agent.turn", {
        sessionId: ctx.session.id,
        outcome: "failed",
        durationMs: Math.max(0, Date.now() - metrics.startedAt),
        toolCalls: metrics.toolCalls,
        toolErrors: metrics.toolErrors,
      });
    },
  },
});
