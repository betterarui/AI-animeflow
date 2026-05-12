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
      include: {
        storyboards: { orderBy: { shotNo: "asc" } },
        reviewReports: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!project) {
      return notFound("项目不存在");
    }
    if (!project.storyboards.length) {
      return badRequest("请先生成分镜");
    }
    const latestReview = project.reviewReports[0];
    if (!latestReview) {
      return badRequest("请先运行创意审查门禁");
    }
    if (latestReview.riskLevel === "high") {
      return badRequest("当前审查为高风险，已阻止进入视频生成");
    }

    const videos = mockProvider.generateVideo({ storyboards: project.storyboards });
    const task = await createGenerationTask({
      projectId: project.id,
      taskType: "videos",
      inputJson: {
        storyboardCount: project.storyboards.length,
        reviewId: latestReview.id,
        riskLevel: latestReview.riskLevel
      } as Prisma.InputJsonValue,
      payload: { videos } as Prisma.InputJsonValue,
      clientMessage: "视频生成完成后会回写 storyboards.video_url"
    });

    return ok({ task }, { status: 202 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
