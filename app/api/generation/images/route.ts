import { Prisma } from "@prisma/client";
import { accessControlResponse, assertCanStartGeneration } from "@/lib/access-control";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { imageGenerationProvider } from "@/lib/ai/imageGenerationProvider";
import { completeGenerationTask, createDeferredGenerationTask, failGenerationTask } from "@/lib/tasks";
import { badRequest, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";

type Body = {
  projectId?: string;
  storyboardId?: string;
};

type AssetForReference = {
  id: string;
  name: string;
  assetType: string;
  imageUrl?: string | null;
};

function normalizeName(value: string) {
  return value.replace(/\s+/g, "").replace(/[，。！？、：；.!?;:()[\]]/g, "").toLowerCase();
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function isNonVisualCharacter(name: string) {
  return /^(旁白|空镜|背景|环境|none|n\/a)$/i.test(name.trim());
}

function findRoleAsset(name: string, assets: AssetForReference[]) {
  const normalizedName = normalizeName(name);
  const roles = assets.filter((asset) => asset.assetType === "role");
  return (
    roles.find((asset) => normalizeName(asset.name) === normalizedName) ||
    roles.find((asset) => {
      const assetName = normalizeName(asset.name);
      return normalizedName.includes(assetName) || assetName.includes(normalizedName);
    })
  );
}

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
        assets: { orderBy: [{ assetType: "asc" }, { createdAt: "asc" }] }
      }
    });
    if (!project) {
      return notFound("Project not found");
    }

    const storyboards = body.storyboardId
      ? project.storyboards.filter((shot) => shot.id === body.storyboardId)
      : project.storyboards;
    if (!storyboards.length) {
      return badRequest("Please generate storyboards first.");
    }

    const missingRoleImages = new Set<string>();
    for (const shot of storyboards) {
      for (const characterName of asStringArray(shot.charactersJson)) {
        if (isNonVisualCharacter(characterName)) {
          continue;
        }
        const roleAsset = findRoleAsset(characterName, project.assets);
        if (!roleAsset?.imageUrl) {
          missingRoleImages.add(characterName);
        }
      }
    }
    if (missingRoleImages.size) {
      return badRequest(`Please generate role asset images first: ${[...missingRoleImages].join(", ")}`);
    }

    const pendingInput = {
      storyboardCount: storyboards.length,
      storyboardId: body.storyboardId || null,
      provider: "pending"
    } as Prisma.InputJsonValue;
    const quota = await assertCanStartGeneration(user, "images", pendingInput);
    const task = await createDeferredGenerationTask({
      projectId: project.id,
      taskType: "images",
      inputJson: {
        storyboardCount: storyboards.length,
        storyboardId: body.storyboardId || null,
        provider: "pending",
        quotaCost: quota.cost
      } as Prisma.InputJsonValue,
      provider: "image-generation:pending",
      clientMessage: "Storyboard image generation will write back to storyboards.image_url."
    });

    void (async () => {
      try {
        const generation = await imageGenerationProvider.generateStoryboardImages({
          projectId: project.id,
          project,
          storyboards,
          assets: project.assets
        });
        await completeGenerationTask(task.id, {
          inputJson: {
            storyboardCount: storyboards.length,
            storyboardId: body.storyboardId || null,
            provider: generation.provider,
            quotaCost: quota.cost
          } as Prisma.InputJsonValue,
          payload: { images: generation.results } as Prisma.InputJsonValue,
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
