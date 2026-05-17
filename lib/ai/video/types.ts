export type VideoProjectContext = {
  title?: string;
  type?: string;
  aspectRatio?: string;
  durationTarget?: string;
  stylePreset?: string;
};

export type VideoStoryboardInput = {
  id: string;
  shotNo: number;
  sceneName: string;
  charactersJson?: unknown;
  visualDescription: string;
  dialogue?: string;
  cameraMovement?: string;
  durationSeconds: number;
  imagePrompt?: string;
  imageUrl: string;
  videoUrl?: string | null;
};

export type VideoFallbackMode = "ffmpeg" | "error";

export type VideoProviderOptions = {
  provider?: string;
  model?: string;
  ratio?: string;
  durationSeconds?: number;
  concurrency?: number;
  fallbackMode?: VideoFallbackMode;
  outputToken?: string;
};

export type VideoGenerationInput = {
  projectId: string;
  project?: VideoProjectContext;
  storyboards: VideoStoryboardInput[];
  options?: VideoProviderOptions;
};

export type GeneratedStoryboardVideo = {
  storyboardId: string;
  videoUrl: string | null;
  status: "video_ready" | "video_failed";
  errorMessage?: string;
  provider: string;
  model?: string;
  remoteTaskId?: string;
  durationSeconds?: number;
  fallbackReason?: string;
  metadataJson?: Record<string, unknown>;
};

export type VideoGenerationResult = {
  provider: string;
  results: GeneratedStoryboardVideo[];
};

export type VideoProvider = {
  name: string;
  generateStoryboardVideos(input: VideoGenerationInput): Promise<VideoGenerationResult>;
};
