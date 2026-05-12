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

async function findOwnedAsset(assetId: string, userId: string) {
  return prisma.asset.findFirst({ where: { id: assetId, project: { userId } } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    const user = await requireUser();
    const existing = await findOwnedAsset(assetId, user.id);
    if (!existing) {
      return notFound("资产不存在");
    }

    const body = await readJson<AssetBody>(request);
    if (body.name !== undefined && !body.name.trim()) {
      return badRequest("资产名称不能为空");
    }

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        assetType: body.assetType ?? undefined,
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        prompt: body.prompt ?? undefined,
        imageUrl: body.imageUrl ?? undefined,
        audioUrl: body.audioUrl ?? undefined,
        metadataJson: body.metadataJson ?? undefined,
        status: body.status ?? undefined
      }
    });

    return ok({ asset });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    const user = await requireUser();
    const existing = await findOwnedAsset(assetId, user.id);
    if (!existing) {
      return notFound("资产不存在");
    }

    await prisma.asset.delete({ where: { id: assetId } });
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
