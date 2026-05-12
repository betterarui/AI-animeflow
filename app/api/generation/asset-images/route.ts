import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { imageGenerationProvider } from "@/lib/ai/imageGenerationProvider";
import { completeGenerationTask, createDeferredGenerationTask, failGenerationTask } from "@/lib/tasks";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type Body = {
  projectId?: string;
  assetId?: string;
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
      include: { assets: { orderBy: [{ assetType: "asc" }, { createdAt: "asc" }] } }
    });
    if (!project) {
      return notFound("项目不存在");
    }

    const visualAssets = project.assets.filter(
      (asset) => ["role", "scene", "prop"].includes(asset.assetType) && (!body.assetId || asset.id === body.assetId)
    );
    if (!visualAssets.length) {
      return badRequest(body.assetId ? "资产不存在或不是可生成图片的视觉资产" : "请先生成角色、场景或道具资产");
    }

    const pendingInput = {
      assetCount: visualAssets.length,
      assetId: body.assetId || null,
      provider: "pending"
    } as Prisma.InputJsonValue;
    const task = await createDeferredGenerationTask({
      projectId: project.id,
      taskType: "asset_images",
      inputJson: pendingInput,
      provider: "image-generation:pending",
      clientMessage: "资产图片生成完成后会回写 assets.image_url"
    });

    void (async () => {
      try {
        const generation = await imageGenerationProvider.generateAssetImages({
          projectId: project.id,
          project,
          assets: visualAssets
        });
        await completeGenerationTask(task.id, {
          inputJson: {
            assetCount: visualAssets.length,
            assetId: body.assetId || null,
            provider: generation.provider
          } as Prisma.InputJsonValue,
          payload: { assetImages: generation.results } as Prisma.InputJsonValue,
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
    return serverError(error);
  }
}
