import path from "path";
import { readFile, writeFile } from "fs/promises";
import { buildImageToVideoPrompt } from "@/lib/ai/video/prompt";
import {
  GeneratedStoryboardVideo,
  VideoGenerationInput,
  VideoProvider,
  VideoStoryboardInput
} from "@/lib/ai/video/types";
import { ensureStorageDir, publicAssetPath, storageUrl } from "@/lib/storage";
import { normalizeVideoFile, videoClipFileName } from "@/lib/video/render";

type WanRequestMode = "media" | "img_url";
type WanImageSource = "auto" | "url" | "base64";

type WanConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  requestMode: WanRequestMode;
  imageSource: WanImageSource;
  resolution: string;
  durationSeconds: number;
  promptExtend: boolean;
  watermark: boolean;
  audio: boolean;
  shotType?: string;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  concurrency: number;
  negativePrompt: string;
};

type WanTaskResponse = {
  request_id?: string;
  code?: string;
  message?: string;
  output?: {
    task_id?: string;
    task_status?: string;
    video_url?: string;
    code?: string;
    message?: string;
  };
  usage?: Record<string, unknown>;
};

function trimEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function boolEnv(name: string, fallback: boolean) {
  const value = trimEnv(name).toLowerCase();
  if (!value) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value);
}

function optionalBoolEnv(name: string) {
  const value = trimEnv(name).toLowerCase();
  if (!value) {
    return undefined;
  }
  return ["1", "true", "yes", "on"].includes(value);
}

function intEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(trimEnv(name));
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function getConfig(input: VideoGenerationInput): WanConfig {
  const apiKey = trimEnv("DASHSCOPE_API_KEY") || trimEnv("ALIYUN_DASHSCOPE_API_KEY");
  if (!apiKey) {
    throw new Error("Missing DASHSCOPE_API_KEY for Aliyun Wan video generation");
  }

  const requestMode = (trimEnv("ALIYUN_WAN_REQUEST_MODE") || "media") as WanRequestMode;
  if (!["media", "img_url"].includes(requestMode)) {
    throw new Error(`Unsupported ALIYUN_WAN_REQUEST_MODE: ${requestMode}`);
  }

  const imageSource = (trimEnv("ALIYUN_WAN_IMAGE_SOURCE") || "auto") as WanImageSource;
  if (!["auto", "url", "base64"].includes(imageSource)) {
    throw new Error(`Unsupported ALIYUN_WAN_IMAGE_SOURCE: ${imageSource}`);
  }

  return {
    apiKey,
    baseUrl: (trimEnv("ALIYUN_WAN_BASE_URL") || "https://dashscope.aliyuncs.com/api/v1").replace(/\/+$/, ""),
    model: input.options?.model || trimEnv("ALIYUN_WAN_MODEL") || "wan2.7-i2v",
    requestMode,
    imageSource,
    resolution: trimEnv("ALIYUN_WAN_RESOLUTION") || "720P",
    durationSeconds: intEnv("ALIYUN_WAN_DURATION", input.options?.durationSeconds || 5, 2, 20),
    promptExtend: boolEnv("ALIYUN_WAN_PROMPT_EXTEND", true),
    watermark: boolEnv("ALIYUN_WAN_WATERMARK", false),
    audio: optionalBoolEnv("ALIYUN_WAN_AUDIO") ?? true,
    shotType: trimEnv("ALIYUN_WAN_SHOT_TYPE"),
    pollIntervalMs: intEnv("ALIYUN_WAN_POLL_INTERVAL_MS", 15000, 3000, 60000),
    pollTimeoutMs: intEnv("ALIYUN_WAN_POLL_TIMEOUT_MS", 30 * 60 * 1000, 60 * 1000, 3 * 60 * 60 * 1000),
    concurrency: Math.max(1, Math.min(3, input.options?.concurrency || intEnv("VIDEO_GENERATION_CONCURRENCY", 1, 1, 3))),
    negativePrompt:
      trimEnv("ALIYUN_WAN_NEGATIVE_PROMPT") ||
      "subtitles, text overlay, logo, watermark, extra characters, scene cut, distorted face, low quality"
  };
}

function mimeTypeForFile(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  if (extension === ".bmp") {
    return "image/bmp";
  }
  return "image/jpeg";
}

async function localImageToDataUri(imageUrl: string) {
  const filePath = publicAssetPath(imageUrl);
  if (!filePath) {
    throw new Error(`Cannot locate local storyboard image: ${imageUrl}`);
  }
  const buffer = await readFile(filePath);
  return `data:${mimeTypeForFile(filePath)};base64,${buffer.toString("base64")}`;
}

function isProbablyPublicUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      ["http:", "https:"].includes(url.protocol) &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      host !== "0.0.0.0" &&
      host !== "::1"
    );
  } catch {
    return false;
  }
}

function getPublicBaseUrl() {
  return trimEnv("ALIYUN_WAN_PUBLIC_BASE_URL") || trimEnv("NEXT_PUBLIC_APP_URL");
}

function makePublicImageUrl(imageUrl: string) {
  if (isProbablyPublicUrl(imageUrl)) {
    return imageUrl;
  }

  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) {
    throw new Error("Aliyun Wan media mode needs a public app URL. Set ALIYUN_WAN_PUBLIC_BASE_URL or NEXT_PUBLIC_APP_URL.");
  }

  const absolute = new URL(imageUrl, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
  if (!isProbablyPublicUrl(absolute)) {
    throw new Error(`Aliyun Wan cannot fetch local image URL: ${absolute}`);
  }
  return absolute;
}

async function imageReferenceForWan(config: WanConfig, shot: VideoStoryboardInput) {
  if (config.imageSource === "base64" || (config.requestMode === "img_url" && config.imageSource === "auto")) {
    return localImageToDataUri(shot.imageUrl);
  }
  return makePublicImageUrl(shot.imageUrl);
}

function durationForShot(config: WanConfig, shot: VideoStoryboardInput) {
  return Math.max(2, Math.min(20, Number(config.durationSeconds || shot.durationSeconds || 5)));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dashscopeFetch(config: WanConfig, endpoint: string, init?: RequestInit) {
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(init?.method === "POST" ? { "X-DashScope-Async": "enable" } : {}),
      ...(init?.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? ((JSON.parse(text) as WanTaskResponse) ?? {}) : {};
  if (!response.ok || data.code) {
    throw new Error(data.message || data.code || `Aliyun Wan request failed: HTTP ${response.status}`);
  }
  return data;
}

function buildWanPayload(config: WanConfig, shot: VideoStoryboardInput, prompt: string, imageReference: string) {
  const input =
    config.requestMode === "img_url"
      ? {
          prompt,
          negative_prompt: config.negativePrompt,
          img_url: imageReference
        }
      : {
          prompt,
          negative_prompt: config.negativePrompt,
          media: [{ type: "first_frame", url: imageReference }]
        };

  const parameters: Record<string, unknown> = {
    resolution: config.resolution,
    duration: durationForShot(config, shot),
    prompt_extend: config.promptExtend,
    watermark: config.watermark
  };
  parameters.audio = config.audio;
  if (config.shotType) {
    parameters.shot_type = config.shotType;
  }

  return {
    model: config.model,
    input,
    parameters
  };
}

async function createWanTask(config: WanConfig, shot: VideoStoryboardInput, prompt: string) {
  const imageReference = await imageReferenceForWan(config, shot);
  const payload = buildWanPayload(config, shot, prompt, imageReference);
  const data = await dashscopeFetch(config, "/services/aigc/video-generation/video-synthesis", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const taskId = data.output?.task_id;
  if (!taskId) {
    throw new Error(`Aliyun Wan did not return task_id for shot ${shot.shotNo}`);
  }
  return {
    taskId,
    requestId: data.request_id,
    imageReference
  };
}

async function waitForWanTask(config: WanConfig, taskId: string) {
  const started = Date.now();
  while (Date.now() - started < config.pollTimeoutMs) {
    const data = await dashscopeFetch(config, `/tasks/${encodeURIComponent(taskId)}`, { method: "GET" });
    const output = data.output || {};
    const status = String(output.task_status || "").toUpperCase();

    if (status === "SUCCEEDED") {
      if (!output.video_url) {
        throw new Error(`Aliyun Wan task ${taskId} succeeded without video_url`);
      }
      return {
        videoUrl: output.video_url,
        requestId: data.request_id,
        usage: data.usage
      };
    }

    if (["FAILED", "CANCELED", "UNKNOWN"].includes(status)) {
      throw new Error(output.message || output.code || `Aliyun Wan task ${taskId} ended with ${status}`);
    }

    await sleep(config.pollIntervalMs);
  }

  throw new Error(`Timed out waiting for Aliyun Wan task ${taskId}`);
}

async function downloadVideo(remoteUrl: string, outputPath: string) {
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Aliyun Wan video: HTTP ${response.status}`);
  }
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
}

function rawClipFileName(shot: VideoStoryboardInput, outputToken?: string) {
  const token = (outputToken || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  return `shot-${String(shot.shotNo).padStart(2, "0")}-${shot.id}${token ? `-${token}` : ""}-aliyun-wan-raw.mp4`;
}

async function generateOne(input: VideoGenerationInput, config: WanConfig, shot: VideoStoryboardInput) {
  const providerLabel = `aliyun-wan:${config.model}`;
  const prompt = [
    buildImageToVideoPrompt(input.project, shot),
    config.audio
      ? "Generate synchronized natural ambient sound and light cinematic sound effects matching the scene. Avoid subtitles or visible text."
      : null
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const created = await createWanTask(config, shot, prompt);
    const completed = await waitForWanTask(config, created.taskId);
    const dir = await ensureStorageDir("videos", input.projectId);
    const outputToken = input.options?.outputToken;
    const outputName = videoClipFileName(shot, outputToken);
    const rawPath = path.join(dir, rawClipFileName(shot, outputToken));
    const outputPath = path.join(dir, outputName);
    const durationSeconds = durationForShot(config, shot);

    await downloadVideo(completed.videoUrl, rawPath);
    await normalizeVideoFile(rawPath, outputPath, {
      aspectRatio: input.project?.aspectRatio,
      durationSeconds,
      preserveAudio: config.audio
    });

    return {
      storyboardId: shot.id,
      videoUrl: storageUrl("videos", input.projectId, outputName),
      status: "video_ready",
      provider: providerLabel,
      model: config.model,
      remoteTaskId: created.taskId,
      durationSeconds,
      metadataJson: {
        requestMode: config.requestMode,
        resolution: config.resolution,
        promptExtend: config.promptExtend,
        watermark: config.watermark,
        audio: config.audio,
        shotType: config.shotType,
        createRequestId: created.requestId,
        resultRequestId: completed.requestId,
        imageSource: config.imageSource,
        imageReference: created.imageReference,
        usage: completed.usage || {}
      }
    } satisfies GeneratedStoryboardVideo;
  } catch (error) {
    return {
      storyboardId: shot.id,
      videoUrl: null,
      status: "video_failed",
      provider: providerLabel,
      model: config.model,
      durationSeconds: durationForShot(config, shot),
      errorMessage: error instanceof Error ? error.message : "Aliyun Wan video generation failed"
    } satisfies GeneratedStoryboardVideo;
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index]);
      }
    })
  );

  return results;
}

export const aliyunWanProvider: VideoProvider = {
  name: "aliyun-wan",

  async generateStoryboardVideos(input) {
    const config = getConfig(input);
    const results = await mapWithConcurrency(input.storyboards, config.concurrency, (shot) =>
      generateOne(input, config, shot)
    );

    return {
      provider: `aliyun-wan:${config.model}`,
      results
    };
  }
};
