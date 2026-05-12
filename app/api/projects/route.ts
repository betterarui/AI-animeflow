import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { badRequest, ok, readJson, serverError, unauthorized } from "@/lib/http";

type ProjectBody = {
  title?: string;
  description?: string;
  type?: string;
  aspectRatio?: string;
  durationTarget?: string;
  stylePreset?: string;
  creationMode?: string;
};

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            assets: true,
            storyboards: true,
            generationTasks: true,
            exports: true
          }
        }
      }
    });

    return ok({ projects });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<ProjectBody>(request);
    const title = (body.title || "").trim();

    if (!title) {
      return badRequest("请输入项目名称");
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title,
        description: body.description || "",
        type: body.type || "education",
        aspectRatio: body.aspectRatio || "9:16",
        durationTarget: body.durationTarget || "30-60s",
        stylePreset: body.stylePreset || "儿童反诈漫画短视频",
        creationMode: body.creationMode || "AI 协作"
      }
    });

    await prisma.script.create({
      data: {
        projectId: project.id,
        originalIdea: "",
        scriptContent: "",
        status: "draft"
      }
    });

    return ok({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
