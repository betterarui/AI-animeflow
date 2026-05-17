import { Prisma } from "@prisma/client";
import { accessControlResponse, assertCanStartGeneration } from "@/lib/access-control";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mockProvider } from "@/lib/ai/providers/mockProvider";
import { createGenerationTask } from "@/lib/tasks";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type Body = {
  projectId?: string;
};

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<Body>(request);
    if (!body.projectId) {
      return badRequest("Missing projectId");
    }

    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId: user.id },
      include: { storyboards: { orderBy: { shotNo: "asc" } } }
    });
    if (!project) {
      return notFound("Project not found");
    }
    if (!project.storyboards.length) {
      return badRequest("Please generate or create storyboards first.");
    }

    const inputJson = { storyboardCount: project.storyboards.length } as Prisma.InputJsonValue;
    const quota = await assertCanStartGeneration(user, "review", inputJson);
    const review = mockProvider.reviewStoryboard({ storyboards: project.storyboards });
    const task = await createGenerationTask({
      projectId: project.id,
      taskType: "review",
      inputJson: { storyboardCount: project.storyboards.length, quotaCost: quota.cost } as Prisma.InputJsonValue,
      payload: review as Prisma.InputJsonValue,
      clientMessage: "Review results will write back to review_reports."
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
