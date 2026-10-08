import { PublicAgentChat } from "@/app/_components/public-agent-chat";

export default async function SessionPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <PublicAgentChat sessionId={sessionId} />;
}
