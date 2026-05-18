import { requireUser } from "@/lib/auth";
import { notFound, ok, serverError, unauthorized } from "@/lib/http";
import { advanceGenerationTask } from "@/lib/tasks";

export async function GET(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const user = await requireUser();
    const task = await advanceGenerationTask(taskId, user.id);
    if (!task) {
      return notFound("Task not found");
    }
    return ok({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
