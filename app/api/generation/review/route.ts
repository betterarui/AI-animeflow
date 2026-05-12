import { Prisma } from "@prisma/client";
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
      return badRequest("缺少 projectId");
    }

    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId: user.id },
      include: { storyboards: { orderBy: { shotNo: "asc" } } }
    });
    if (!project) {
      return notFound("项目不存在");
    }
    if (!project.storyboards.length) {
      return badRequest("请先生成或创建分镜");
    }

    const review = mockProvider.reviewStoryboard({ storyboards: project.storyboards });
    const task = await createGenerationTask({
      projectId: project.id,
      taskType: "review",
      inputJson: { storyboardCount: project.storyboards.length } as Prisma.InputJsonValue,
      payload: review as Prisma.InputJsonValue,
      clientMessage: "审查完成后会写入 review_reports 表"
    });

    return ok({ task }, { status: 202 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
