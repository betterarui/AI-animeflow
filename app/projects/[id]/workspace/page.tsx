import { WorkspaceClient } from "@/components/workspace-client";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceClient projectId={id} />;
}
