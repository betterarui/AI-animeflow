import { Prisma } from "@prisma/client";
import { accessControlResponse, assertCanStartGeneration } from "@/lib/access-control";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mockProvider } from "@/lib/ai/providers/mockProvider";
import { createGenerationTask } from "@/lib/tasks";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type Body = {
  format?: string;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = await readJson<Body>(request);
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: { storyboards: { orderBy: { shotNo: "asc" } } }
    });
    if (!project) {
      return notFound("Project not found");
    }
    if (!project.storyboards.some((shot) => shot.videoUrl)) {
      return badRequest("Please generate at least one video clip first.");
    }

    const inputJson = {
      storyboardCount: project.storyboards.length,
      format: body.format || "mp4"
    } as Prisma.InputJsonValue;
    const quota = await assertCanStartGeneration(user, "export", inputJson);
    const exportPayload = mockProvider.exportFinalVideo({
      project,
      storyboards: project.storyboards,
      format: body.format || "mp4"
    });
    const task = await createGenerationTask({
      projectId: project.id,
      taskType: "export",
      inputJson: {
        storyboardCount: project.storyboards.length,
        format: body.format || "mp4",
        quotaCost: quota.cost
      } as Prisma.InputJsonValue,
      payload: exportPayload as Prisma.InputJsonValue,
      clientMessage: "Export results will write back to exports."
    });

    return ok({ task }, { status: 202 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    const accessResponse = accessControlResponse(error);
    if (accessResponse) {
      return accessResponse;
    }
    return serverError(error);
  }
}
