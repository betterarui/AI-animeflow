import { aliyunWanProvider } from "@/lib/ai/video/providers/aliyunWanProvider";
import { generateFfmpegFallbackVideos } from "@/lib/ai/video/providers/ffmpegFallbackProvider";
import {
  GeneratedStoryboardVideo,
  VideoFallbackMode,
  VideoGenerationInput,
  VideoGenerationResult,
  VideoProvider
} from "@/lib/ai/video/types";

const providers: Record<string, VideoProvider> = {
  "aliyun-wan": aliyunWanProvider
};

function providerName(input?: VideoGenerationInput) {
  return input?.options?.provider || process.env.VIDEO_PROVIDER?.trim() || "aliyun-wan";
}

function fallbackMode(input?: VideoGenerationInput): VideoFallbackMode {
  const configured = input?.options?.fallbackMode || (process.env.VIDEO_FALLBACK_MODE?.trim() as VideoFallbackMode) || "ffmpeg";
  return configured === "error" ? "error" : "ffmpeg";
}

function getProvider(input: VideoGenerationInput) {
  const name = providerName(input);
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unsupported VIDEO_PROVIDER: ${name}`);
  }
  return provider;
}

function failedShotIds(results: GeneratedStoryboardVideo[]) {
  return new Set(results.filter((item) => item.status !== "video_ready" || !item.videoUrl).map((item) => item.storyboardId));
}

function mergeResults(primary: GeneratedStoryboardVideo[], fallback: GeneratedStoryboardVideo[]) {
  const fallbackById = new Map(fallback.map((item) => [item.storyboardId, item]));
  return primary.map((item) => fallbackById.get(item.storyboardId) || item);
}

async function fallbackForFailures(input: VideoGenerationInput, primary: VideoGenerationResult) {
  const failedIds = failedShotIds(primary.results);
  if (!failedIds.size) {
    return primary;
  }

  if (fallbackMode(input) === "error") {
    const firstFailure = primary.results.find((item) => failedIds.has(item.storyboardId));
    throw new Error(firstFailure?.errorMessage || "Video generation failed");
  }

  const failedStoryboards = input.storyboards.filter((shot) => failedIds.has(shot.id));
  const fallbackResults = await generateFfmpegFallbackVideos(
    { ...input, storyboards: failedStoryboards },
    `Primary provider ${primary.provider} failed for this storyboard`
  );

  return {
    provider: `${primary.provider}+ffmpeg-fallback`,
    results: mergeResults(primary.results, fallbackResults)
  };
}

export const videoGenerationProvider = {
  async generateStoryboardVideos(input: VideoGenerationInput): Promise<VideoGenerationResult> {
    try {
      const primary = await getProvider(input).generateStoryboardVideos(input);
      return fallbackForFailures(input, primary);
    } catch (error) {
      if (fallbackMode(input) === "error") {
        throw error;
      }

      const fallbackReason = error instanceof Error ? error.message : "Primary video provider failed";
      const results = await generateFfmpegFallbackVideos(input, fallbackReason);
      return {
        provider: "ffmpeg-fallback",
        results
      };
    }
  }
};
