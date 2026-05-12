import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type StoryboardBody = {
  shotNo?: number;
  sceneName?: string;
  charactersJson?: Prisma.InputJsonValue;
  visualDescription?: string;
  dialogue?: string;
  cameraMovement?: string;
  durationSeconds?: number;
  imagePrompt?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  status?: string;
};

async function findOwnedStoryboard(storyboardId: string, userId: string) {
  return prisma.storyboard.findFirst({ where: { id: storyboardId, project: { userId } } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ storyboardId: string }> }) {
  try {
    const { storyboardId } = await params;
    const user = await requireUser();
    const existing = await findOwnedStoryboard(storyboardId, user.id);
    if (!existing) {
      return notFound("分镜不存在");
    }

    const body = await readJson<StoryboardBody>(request);
    if (body.visualDescription !== undefined && !body.visualDescription.trim()) {
      return badRequest("画面描述不能为空");
    }

    const storyboard = await prisma.storyboard.update({
      where: { id: storyboardId },
      data: {
        shotNo: body.shotNo ?? undefined,
        sceneName: body.sceneName ?? undefined,
        charactersJson: body.charactersJson ?? undefined,
        visualDescription: body.visualDescription ?? undefined,
        dialogue: body.dialogue ?? undefined,
        cameraMovement: body.cameraMovement ?? undefined,
        durationSeconds: body.durationSeconds ?? undefined,
        imagePrompt: body.imagePrompt ?? undefined,
        imageUrl: body.imageUrl ?? undefined,
        videoUrl: body.videoUrl ?? undefined,
        status: body.status ?? undefined
      }
    });

    return ok({ storyboard });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ storyboardId: string }> }) {
  try {
    const { storyboardId } = await params;
    const user = await requireUser();
    const existing = await findOwnedStoryboard(storyboardId, user.id);
    if (!existing) {
      return notFound("分镜不存在");
    }

    await prisma.storyboard.delete({ where: { id: storyboardId } });
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
