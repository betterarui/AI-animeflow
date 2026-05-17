import { VideoProjectContext, VideoStoryboardInput } from "@/lib/ai/video/types";

function compact(value?: string | null, maxLength = 420) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function charactersText(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }
  return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
}

export function buildImageToVideoPrompt(project: VideoProjectContext | undefined, shot: VideoStoryboardInput) {
  const parts = [
    "Use the reference image as the first frame.",
    "Generate an image-to-video clip only from this reference image.",
    "Keep character identity, outfit, environment, props, composition, and visual style consistent.",
    "Animate natural motion and camera movement without changing the scene design.",
    project?.title ? `Project: ${compact(project.title, 120)}.` : null,
    project?.stylePreset ? `Style: ${compact(project.stylePreset, 160)}.` : null,
    shot.sceneName ? `Scene: ${compact(shot.sceneName, 160)}.` : null,
    shot.visualDescription ? `Visual description: ${compact(shot.visualDescription)}.` : null,
    shot.cameraMovement ? `Camera movement: ${compact(shot.cameraMovement, 220)}.` : null,
    charactersText(shot.charactersJson) ? `Characters: ${compact(charactersText(shot.charactersJson), 180)}.` : null,
    shot.dialogue ? `Dialogue context, do not render text: ${compact(shot.dialogue, 200)}.` : null,
    "No subtitles, no text overlays, no logos, no watermarks, no extra characters, no scene cuts."
  ].filter(Boolean);

  return parts.join(" ");
}
