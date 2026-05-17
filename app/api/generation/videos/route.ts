import { Prisma } from "@prisma/client";
import { accessControlResponse, assertCanStartGeneration } from "@/lib/access-control";
import { requireUser } from "@/lib/auth";
import { videoGenerationProvider } from "@/lib/ai/video/videoGenerationProvider";
import { prisma } from "@/lib/db";
import { completeGenerationTask, createDeferredGenerationTask, failGenerationTask } from "@/lib/tasks";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type Body = {
  projectId?: string;
  storyboardId?: string;
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
      include: {
        storyboards: { orderBy: { shotNo: "asc" } },
        reviewReports: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!project) {
      return notFound("Project not found");
    }
    if (!project.storyboards.length) {
      return badRequest("Please generate storyboards first.");
    }

    const latestReview = project.reviewReports[0];
    if (!latestReview) {
      return badRequest("Please run creative review before video generation.");
    }
    if (latestReview.riskLevel === "high") {
      return badRequest("High-risk review blocks video generation.");
    }

    const targetStoryboards = body.storyboardId
      ? project.storyboards.filter((shot) => shot.id === body.storyboardId)
      : project.storyboards;
    if (body.storyboardId && !targetStoryboards.length) {
      return notFound("Storyboard not found in this project.");
    }

    const missingImages = targetStoryboards.filter((shot) => !shot.imageUrl).map((shot) => `#${shot.shotNo}`);
    if (missingImages.length) {
      return badRequest(`Please generate storyboard images first: ${missingImages.join(", ")}`);
    }

    const runningVideoTask = await prisma.generationTask.findFirst({
      where: {
        projectId: project.id,
        taskType: "videos",
        status: { in: ["pending", "running"] }
      },
      select: { id: true }
    });
    if (runningVideoTask) {
      return badRequest("Video generation is already running.");
    }

    const pendingInput = {
      storyboardCount: targetStoryboards.length,
      storyboardId: body.storyboardId || null,
      reviewId: latestReview.id,
      riskLevel: latestReview.riskLevel,
      provider: process.env.VIDEO_PROVIDER || "aliyun-wan",
      fallbackMode: process.env.VIDEO_FALLBACK_MODE || "ffmpeg"
    } as Prisma.InputJsonValue;
    const quota = await assertCanStartGeneration(user, "videos", pendingInput);
    const task = await createDeferredGenerationTask({
      projectId: project.id,
      taskType: "videos",
      inputJson: {
        storyboardCount: targetStoryboards.length,
        storyboardId: body.storyboardId || null,
        reviewId: latestReview.id,
        riskLevel: latestReview.riskLevel,
        provider: process.env.VIDEO_PROVIDER || "aliyun-wan",
        fallbackMode: process.env.VIDEO_FALLBACK_MODE || "ffmpeg",
        quotaCost: quota.cost
      } as Prisma.InputJsonValue,
      provider: "video-generation:pending",
      clientMessage: "Video generation will write results back to storyboards.video_url."
    });

    void (async () => {
      try {
        const generation = await videoGenerationProvider.generateStoryboardVideos({
          projectId: project.id,
          project,
          storyboards: targetStoryboards.map((shot) => ({
            ...shot,
            imageUrl: shot.imageUrl as string
          })),
          options: { outputToken: task.id }
        });

        await completeGenerationTask(task.id, {
          inputJson: {
            storyboardCount: targetStoryboards.length,
            storyboardId: body.storyboardId || null,
            reviewId: latestReview.id,
            riskLevel: latestReview.riskLevel,
            provider: generation.provider,
            fallbackMode: process.env.VIDEO_FALLBACK_MODE || "ffmpeg",
            quotaCost: quota.cost
          } as Prisma.InputJsonValue,
          payload: { videos: generation.results } as Prisma.InputJsonValue,
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
