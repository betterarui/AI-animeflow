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

async function ensureProject(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const project = await ensureProject(id, user.id);
    if (!project) {
      return notFound("项目不存在");
    }

    const storyboards = await prisma.storyboard.findMany({
      where: { projectId: id },
      orderBy: { shotNo: "asc" }
    });

    return ok({ storyboards });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const project = await ensureProject(id, user.id);
    if (!project) {
      return notFound("项目不存在");
    }

    const body = await readJson<StoryboardBody>(request);
    if (!body.visualDescription?.trim()) {
      return badRequest("画面描述不能为空");
    }

    const count = await prisma.storyboard.count({ where: { projectId: id } });
    const storyboard = await prisma.storyboard.create({
      data: {
        projectId: id,
        shotNo: body.shotNo || count + 1,
        sceneName: body.sceneName || "未命名场景",
        charactersJson: body.charactersJson || [],
        visualDescription: body.visualDescription,
        dialogue: body.dialogue || "",
        cameraMovement: body.cameraMovement || "静态镜头",
        durationSeconds: body.durationSeconds || 6,
        imagePrompt: body.imagePrompt || body.visualDescription,
        imageUrl: body.imageUrl || null,
        videoUrl: body.videoUrl || null,
        status: body.status || "draft"
      }
    });

    return ok({ storyboard }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
