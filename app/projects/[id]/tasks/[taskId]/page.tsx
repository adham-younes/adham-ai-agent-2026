import { EngineeringWorkspace } from "@/app/_components/engineering-workspace";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  return (
    <EngineeringWorkspace
      key={`${id}:${taskId}`}
      projectId={id}
      taskId={taskId}
    />
  );
}
