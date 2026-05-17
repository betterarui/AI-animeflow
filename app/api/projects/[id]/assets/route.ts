import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type AssetBody = {
  assetType?: string;
  name?: string;
  description?: string;
  prompt?: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  metadataJson?: Prisma.InputJsonValue;
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

    const assets = await prisma.asset.findMany({
      where: { projectId: id },
      orderBy: [{ assetType: "asc" }, { createdAt: "asc" }]
    });
    return ok({ assets });
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

    const body = await readJson<AssetBody>(request);
    if (!body.name?.trim()) {
      return badRequest("资产名称不能为空");
    }

    const asset = await prisma.asset.create({
      data: {
        projectId: id,
        assetType: body.assetType || "role",
        name: body.name,
        description: body.description || "",
        prompt: body.prompt || "",
        imageUrl: body.imageUrl || null,
        audioUrl: body.audioUrl || null,
        metadataJson: body.metadataJson || {},
        status: body.status || "draft"
      }
    });

    return ok({ asset }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
