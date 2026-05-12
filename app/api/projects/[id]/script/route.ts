import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type ScriptBody = {
  originalIdea?: string;
  scriptContent?: string;
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

    const script = await prisma.script.findUnique({ where: { projectId: id } });
    return ok({ script });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return upsertScript(request, id);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return upsertScript(request, id);
}

async function upsertScript(request: Request, projectId: string) {
  try {
    const user = await requireUser();
    const project = await ensureProject(projectId, user.id);
    if (!project) {
      return notFound("项目不存在");
    }

    const body = await readJson<ScriptBody>(request);
    const script = await prisma.script.upsert({
      where: { projectId },
      create: {
        projectId,
        originalIdea: body.originalIdea || "",
        scriptContent: body.scriptContent || "",
        status: body.status || "draft"
      },
      update: {
        originalIdea: body.originalIdea ?? undefined,
        scriptContent: body.scriptContent ?? undefined,
        status: body.status ?? "saved",
        version: { increment: 1 }
      }
    });

    return ok({ script });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
