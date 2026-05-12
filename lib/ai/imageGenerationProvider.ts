import path from "path";
import { readFile, writeFile } from "fs/promises";
import { ensureStorageDir, publicAssetPath, storageUrl } from "@/lib/storage";
import { ProjectContext, StoryboardInput } from "@/lib/ai/types";

type ImageTarget = {
  id?: string;
  prompt: string;
  name: string;
  kind: "asset" | "storyboard";
  index: number;
  referenceImageUrls?: string[];
};

type AssetImageInput = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  assetType: string;
  imageUrl?: string | null;
};

type GeneratedImageResult = {
  targetId?: string;
  imageUrl: string | null;
  status: string;
  errorMessage?: string;
};

type VolcengineResponse = {
  data?: Array<{
    url?: string;
    b64_json?: string;
    error?: {
      code?: string;
      message?: string;
    };
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};

function providerName() {
  return (process.env.IMAGE_PROVIDER || "volcengine-seedream").trim();
}

function getEndpoint() {
  const baseUrl = (process.env.IMAGE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/+$/, "");
  return baseUrl.endsWith("/images/generations") ? baseUrl : `${baseUrl}/images/generations`;
}

function generationConcurrency() {
  const configured = Number(process.env.IMAGE_GENERATION_CONCURRENCY || 3);
  if (!Number.isFinite(configured)) {
    return 3;
  }
  return Math.max(1, Math.min(6, Math.floor(configured)));
}

function getRequiredConfig() {
  const apiKey = process.env.IMAGE_API_KEY?.trim() || process.env.VOLCENGINE_ARK_API_KEY?.trim();
  const model = process.env.IMAGE_MODEL?.trim();

  if (!apiKey) {
    throw new Error("缺少 IMAGE_API_KEY，无法调用火山引擎图片生成模型");
  }
  if (!model) {
    throw new Error("缺少 IMAGE_MODEL，请填写火山引擎 Seedream 4.5 的 Model ID 或 Endpoint ID");
  }

  return {
    apiKey,
    model,
    endpoint: getEndpoint(),
    watermark: (process.env.IMAGE_WATERMARK || "false").toLowerCase() === "true",
    responseFormat: process.env.IMAGE_RESPONSE_FORMAT || "url"
  };
}

function sizeForProject(project?: ProjectContext) {
  const configured = process.env.IMAGE_SIZE?.trim();
  if (configured) {
    return configured;
  }

  switch (project?.aspectRatio) {
    case "16:9":
      return "2848x1600";
    case "1:1":
      return "2048x2048";
    case "4:3":
      return "2304x1728";
    case "9:16":
    default:
      return "1600x2848";
  }
}

function compactPrompt(prompt: string, project?: ProjectContext) {
  const additions = [
    project?.stylePreset,
    project?.aspectRatio ? `${project.aspectRatio} 构图` : null,
    "主体清晰，画面完整，适合动画生产"
  ].filter(Boolean);
  const text = `${prompt}，${additions.join("，")}`.replace(/\s+/g, " ").trim();
  return text.length > 900 ? text.slice(0, 900) : text;
}

function enhancePrompt(target: ImageTarget, project?: ProjectContext) {
  const referenceInstruction = target.referenceImageUrls?.length
    ? "必须严格保持参考图中角色的身份、脸型、发型、服装主色、标志性道具和整体画风一致；不要改变角色设定，不要新增不相关角色。"
    : "";
  const assetInstruction =
    target.kind === "asset"
      ? "如果是角色资产图，请固定年龄段、发型、服装主色、标志性道具和正侧面识别特征，画面适合作为后续分镜参考图。"
      : "";

  return compactPrompt([target.prompt, referenceInstruction, assetInstruction].filter(Boolean).join("，"), project);
}

function safeFilePart(value: string) {
  return value
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "") || "image";
}

async function fetchArrayBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载生成图片失败：HTTP ${response.status}`);
  }
  return response.arrayBuffer();
}

function mimeTypeForFile(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  if (extension === ".gif") {
    return "image/gif";
  }
  if (extension === ".bmp") {
    return "image/bmp";
  }
  return "image/jpeg";
}

async function localImageUrlToDataUri(imageUrl: string) {
  const filePath = publicAssetPath(imageUrl);
  if (!filePath) {
    return null;
  }

  const buffer = await readFile(filePath);
  return `data:${mimeTypeForFile(filePath)};base64,${buffer.toString("base64")}`;
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, "").replace(/[《》「」“”"'，。！？、：；,.!?;:()（）\[\]【】]/g, "").toLowerCase();
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function findMatchingAsset(name: string, assets: AssetImageInput[], assetType?: string) {
  const normalizedName = normalizeName(name);
  const candidates = assetType ? assets.filter((asset) => asset.assetType === assetType) : assets;
  return (
    candidates.find((asset) => normalizeName(asset.name) === normalizedName) ||
    candidates.find((asset) => {
      const normalizedAssetName = normalizeName(asset.name);
      return normalizedName.includes(normalizedAssetName) || normalizedAssetName.includes(normalizedName);
    })
  );
}

function referenceImagesForShot(shot: StoryboardInput, assets: AssetImageInput[]) {
  const characterNames = asStringArray(shot.charactersJson);
  const roleRefs = characterNames
    .map((name) => findMatchingAsset(name, assets, "role"))
    .filter((asset): asset is AssetImageInput => Boolean(asset?.imageUrl))
    .map((asset) => asset.imageUrl as string);

  const sceneRefs = assets
    .filter((asset) => asset.assetType === "scene" && asset.imageUrl)
    .filter((asset) => {
      const sceneName = normalizeName(shot.sceneName || "");
      const assetName = normalizeName(asset.name);
      return sceneName.includes(assetName) || assetName.includes(sceneName);
    })
    .map((asset) => asset.imageUrl as string);

  return [...new Set([...roleRefs, ...sceneRefs])].slice(0, 4);
}

async function saveImage(input: {
  projectId: string;
  target: ImageTarget;
  url?: string;
  b64Json?: string;
  format?: string;
}) {
  const dir = await ensureStorageDir("images", input.projectId);
  const extension = input.format || (input.b64Json ? "png" : "jpg");
  const fileName = `${input.target.kind}-${String(input.target.index + 1).padStart(2, "0")}-${safeFilePart(input.target.name)}-${Date.now()}.${extension}`;
  const filePath = path.join(dir, fileName);

  const buffer = input.b64Json
    ? Buffer.from(input.b64Json.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ""), "base64")
    : Buffer.from(await fetchArrayBuffer(input.url || ""));

  await writeFile(filePath, buffer);
  return storageUrl("images", input.projectId, fileName);
}

async function generateOne(projectId: string, target: ImageTarget, project?: ProjectContext): Promise<GeneratedImageResult> {
  const config = getRequiredConfig();
  const referenceImages = (
    await Promise.all((target.referenceImageUrls || []).map((imageUrl) => localImageUrlToDataUri(imageUrl)))
  ).filter((image): image is string => Boolean(image));
  const payload: Record<string, unknown> = {
    model: config.model,
    prompt: enhancePrompt(target, project),
    size: sizeForProject(project),
    sequential_image_generation: "disabled",
    response_format: config.responseFormat,
    watermark: config.watermark
  };
  if (referenceImages.length === 1) {
    payload.image = referenceImages[0];
  } else if (referenceImages.length > 1) {
    payload.image = referenceImages;
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json().catch(() => ({}))) as VolcengineResponse;
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `图片生成失败：HTTP ${response.status}`);
  }

  const first = data.data?.[0];
  if (!first) {
    throw new Error("图片生成响应缺少 data[0]");
  }
  if (first.error) {
    throw new Error(first.error.message || first.error.code || "图片生成失败");
  }
  if (!first.url && !first.b64_json) {
    throw new Error("图片生成响应缺少 url 或 b64_json");
  }

  const imageUrl = await saveImage({
    projectId,
    target,
    url: first.url,
    b64Json: first.b64_json,
    format: config.responseFormat === "b64_json" ? "png" : "jpg"
  });

  return {
    targetId: target.id,
    imageUrl,
    status: "image_ready"
  };
}

async function generateBatch(projectId: string, targets: ImageTarget[], project?: ProjectContext) {
  if (providerName() !== "volcengine-seedream") {
    throw new Error(`不支持的 IMAGE_PROVIDER：${providerName()}`);
  }
  getRequiredConfig();

  const results: GeneratedImageResult[] = new Array(targets.length);
  let nextIndex = 0;
  const workerCount = Math.min(generationConcurrency(), targets.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < targets.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const target = targets[currentIndex];

        try {
          results[currentIndex] = await generateOne(projectId, target, project);
        } catch (error) {
          results[currentIndex] = {
            targetId: target.id,
            imageUrl: null,
            status: "image_failed",
            errorMessage: error instanceof Error ? error.message : "图片生成失败"
          };
        }
      }
    })
  );

  return {
    provider: `volcengine-seedream:${process.env.IMAGE_MODEL || "unknown-model"}`,
    results
  };
}

export const imageGenerationProvider = {
  async generateStoryboardImages(input: {
    projectId: string;
    project?: ProjectContext;
    storyboards: StoryboardInput[];
    assets?: AssetImageInput[];
  }) {
    const targets = input.storyboards.map((shot, index) => ({
      id: shot.id,
      prompt: shot.imagePrompt || shot.visualDescription,
      name: shot.sceneName || `shot-${index + 1}`,
      kind: "storyboard" as const,
      index,
      referenceImageUrls: referenceImagesForShot(shot, input.assets || [])
    }));

    return generateBatch(input.projectId, targets, input.project);
  },

  async generateAssetImages(input: {
    projectId: string;
    project?: ProjectContext;
    assets: AssetImageInput[];
  }) {
    const visualAssets = input.assets.filter((asset) => ["role", "scene", "prop"].includes(asset.assetType));
    const targets = visualAssets.map((asset, index) => ({
      id: asset.id,
      prompt:
        asset.prompt ||
        `${asset.name}，${asset.description}，角色/场景/道具设定图，主体完整清晰，固定颜色、外形和标志性细节`,
      name: asset.name,
      kind: "asset" as const,
      index
    }));

    return generateBatch(input.projectId, targets, input.project);
  }
};
