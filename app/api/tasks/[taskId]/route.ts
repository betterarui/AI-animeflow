import { requireUser } from "@/lib/auth";
import { advanceGenerationTask } from "@/lib/tasks";
import { notFound, ok, serverError, unauthorized } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const user = await requireUser();
    const task = await advanceGenerationTask(taskId, user.id);
    if (!task) {
      return notFound("任务不存在");
    }
    return ok({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
