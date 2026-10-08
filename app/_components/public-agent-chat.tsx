import { AgentChat } from "./agent-chat";

export function PublicAgentChat({
  sessionId,
}: {
  readonly sessionId?: string;
}) {
  return <AgentChat sessionId={sessionId} />;
}
