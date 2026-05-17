import { Prisma } from "@prisma/client";
import { accessControlResponse, assertCanStartGeneration } from "@/lib/access-control";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { textGenerationProvider } from "@/lib/ai/textGenerationProvider";
import { completeGenerationTask, createDeferredGenerationTask, failGenerationTask } from "@/lib/tasks";
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
      include: { script: true, assets: true }
    });
    if (!project) {
      return notFound("Project not found");
    }

    const scriptContent = project.script?.scriptContent || project.description || project.title;
    const pendingInput = {
      scriptId: project.script?.id || null,
      assetCount: project.assets.length,
      provider: "pending"
    } as Prisma.InputJsonValue;
    const quota = await assertCanStartGeneration(user, "storyboards", pendingInput);
    const task = await createDeferredGenerationTask({
      projectId: project.id,
      taskType: "storyboards",
      inputJson: {
        scriptId: project.script?.id || null,
        assetCount: project.assets.length,
        provider: "pending",
        quotaCost: quota.cost
      } as Prisma.InputJsonValue,
      provider: "text-generation:pending",
      clientMessage: "Storyboard generation will write back to storyboards."
    });

    void (async () => {
      try {
        const generation = await textGenerationProvider.generateStoryboard({
          scriptContent,
          assets: project.assets,
          project
        });
        await completeGenerationTask(task.id, {
          inputJson: {
            scriptId: project.script?.id || null,
            assetCount: project.assets.length,
            provider: generation.provider,
            quotaCost: quota.cost
          } as Prisma.InputJsonValue,
          payload: { storyboards: generation.payload } as Prisma.InputJsonValue,
          provider: generation.provider
        });
      } catch (error) {
        await failGenerationTask(task.id, error);
      }
    })();

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
