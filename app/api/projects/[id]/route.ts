import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProjectBundle } from "@/lib/project";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type ProjectBody = {
  title?: string;
  description?: string;
  type?: string;
  aspectRatio?: string;
  durationTarget?: string;
  stylePreset?: string;
  creationMode?: string;
  currentStep?: string;
  status?: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const project = await getProjectBundle(id, user.id);
    if (!project) {
      return notFound("项目不存在");
    }
    return ok({ project });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return notFound("项目不存在");
    }

    const body = await readJson<ProjectBody>(request);
    if (body.title !== undefined && !body.title.trim()) {
      return badRequest("项目名称不能为空");
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        type: body.type ?? undefined,
        aspectRatio: body.aspectRatio ?? undefined,
        durationTarget: body.durationTarget ?? undefined,
        stylePreset: body.stylePreset ?? undefined,
        creationMode: body.creationMode ?? undefined,
        currentStep: body.currentStep ?? undefined,
        status: body.status ?? undefined
      }
    });

    return ok({ project });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return notFound("项目不存在");
    }
    await prisma.project.delete({ where: { id } });
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
