import { EngineeringWorkspace } from "@/app/_components/engineering-workspace";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EngineeringWorkspace key={id} projectId={id} />;
}
