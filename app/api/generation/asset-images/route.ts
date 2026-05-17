import { Prisma } from "@prisma/client";
import { accessControlResponse, assertCanStartGeneration } from "@/lib/access-control";
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
      return badRequest("Missing projectId");
    }

    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId: user.id },
      include: { assets: { orderBy: [{ assetType: "asc" }, { createdAt: "asc" }] } }
    });
    if (!project) {
      return notFound("Project not found");
    }

    const visualAssets = project.assets.filter(
      (asset) => ["role", "scene", "prop"].includes(asset.assetType) && (!body.assetId || asset.id === body.assetId)
    );
    if (!visualAssets.length) {
      return badRequest(body.assetId ? "Asset not found or not visual." : "Please generate visual assets first.");
    }

    const pendingInput = {
      assetCount: visualAssets.length,
      assetId: body.assetId || null,
      provider: "pending"
    } as Prisma.InputJsonValue;
    const quota = await assertCanStartGeneration(user, "asset_images", pendingInput);
    const task = await createDeferredGenerationTask({
      projectId: project.id,
      taskType: "asset_images",
      inputJson: {
        assetCount: visualAssets.length,
        assetId: body.assetId || null,
        provider: "pending",
        quotaCost: quota.cost
      } as Prisma.InputJsonValue,
      provider: "image-generation:pending",
      clientMessage: "Asset image generation will write back to assets.image_url."
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
            provider: generation.provider,
            quotaCost: quota.cost
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
    const accessResponse = accessControlResponse(error);
    if (accessResponse) {
      return accessResponse;
    }
    return serverError(error);
  }
}
