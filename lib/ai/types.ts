export type ProjectContext = {
  title?: string;
  type?: string;
  aspectRatio?: string;
  durationTarget?: string;
  stylePreset?: string;
};

export type AssetInput = {
  name: string;
  assetType: string;
};

export type StoryboardInput = {
  id?: string;
  shotNo: number;
  sceneName: string;
  charactersJson?: unknown;
  visualDescription: string;
  dialogue?: string;
  cameraMovement?: string;
  durationSeconds: number;
  imagePrompt?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  status?: string;
};

export type GeneratedScript = {
  originalIdea: string;
  scriptContent: string;
  version: number;
  status: string;
};

export type GeneratedAsset = {
  assetType: "role" | "scene" | "prop" | "voice" | "music";
  name: string;
  description: string;
  prompt: string;
  imageUrl: string | null;
  audioUrl: string | null;
  metadataJson: Record<string, unknown>;
  status: string;
};

export type GeneratedStoryboard = {
  shotNo: number;
  sceneName: string;
  charactersJson: string[];
  visualDescription: string;
  dialogue: string;
  cameraMovement: string;
  durationSeconds: number;
  imagePrompt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  status: string;
};

export type ProviderResult<T> = {
  provider: string;
  payload: T;
};
