import { Prisma } from "@prisma/client";
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
      return notFound("项目不存在");
    }
    if (!project.storyboards.some((shot) => shot.videoUrl)) {
      return badRequest("请先生成至少一个视频片段");
    }

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
        format: body.format || "mp4"
      } as Prisma.InputJsonValue,
      payload: exportPayload as Prisma.InputJsonValue,
      clientMessage: "导出完成后会写入 exports 表"
    });

    return ok({ task }, { status: 202 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
