import { renderStoryboardVideos } from "@/lib/video/render";
import { GeneratedStoryboardVideo, VideoGenerationInput, VideoProvider } from "@/lib/ai/video/types";

export async function generateFfmpegFallbackVideos(input: VideoGenerationInput, fallbackReason?: string) {
  const rendered = await renderStoryboardVideos(input.projectId, input.storyboards, {
    aspectRatio: input.project?.aspectRatio,
    provider: "ffmpeg-fallback",
    fallbackReason,
    outputToken: input.options?.outputToken
  });

  return rendered.map(
    (item): GeneratedStoryboardVideo => ({
      storyboardId: item.storyboardId,
      videoUrl: item.videoUrl,
      status: "video_ready",
      provider: "ffmpeg-fallback",
      durationSeconds: input.storyboards.find((shot) => shot.id === item.storyboardId)?.durationSeconds,
      fallbackReason
    })
  );
}

export const ffmpegFallbackProvider: VideoProvider = {
  name: "ffmpeg-fallback",

  async generateStoryboardVideos(input) {
    return {
      provider: "ffmpeg-fallback",
      results: await generateFfmpegFallbackVideos(input, "Primary video provider was not used")
    };
  }
};
