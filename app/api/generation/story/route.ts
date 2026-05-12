import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { textGenerationProvider } from "@/lib/ai/textGenerationProvider";
import { completeGenerationTask, createDeferredGenerationTask, failGenerationTask } from "@/lib/tasks";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type Body = {
  projectId?: string;
  idea?: string;
};

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<Body>(request);
    if (!body.projectId) {
      return badRequest("缺少 projectId");
    }

    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId: user.id },
      include: { script: true }
    });
    if (!project) {
      return notFound("项目不存在");
    }

    const idea = body.idea || project.script?.originalIdea || project.description || project.title;
    const task = await createDeferredGenerationTask({
      projectId: project.id,
      taskType: "story",
      inputJson: { idea, provider: "pending" } as Prisma.InputJsonValue,
      provider: "text-generation:pending",
      clientMessage: "剧本生成完成后会写入 scripts 表"
    });

    void (async () => {
      try {
        const generation = await textGenerationProvider.generateScript({ idea, project });
        await completeGenerationTask(task.id, {
          inputJson: { idea, provider: generation.provider } as Prisma.InputJsonValue,
          payload: generation.payload as Prisma.InputJsonValue,
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
    return serverError(error);
  }
}
