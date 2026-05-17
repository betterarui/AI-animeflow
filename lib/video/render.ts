import { execFile } from "child_process";
import { existsSync } from "fs";
import { access, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import { ensureStorageDir, publicAssetPath, storagePath, storageUrl } from "@/lib/storage";

const execFileAsync = promisify(execFile);

type RenderStoryboard = {
  id: string;
  shotNo: number;
  sceneName: string;
  visualDescription: string;
  dialogue?: string;
  durationSeconds: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

type RenderProject = {
  id: string;
  title: string;
};

type RenderOptions = {
  aspectRatio?: string;
  provider?: string;
  fallbackReason?: string;
  outputToken?: string;
};

type NormalizeOptions = {
  aspectRatio?: string;
  durationSeconds?: number;
  preserveAudio?: boolean;
};

function getFfmpegPath() {
  const candidates = [
    typeof ffmpegPath === "string" ? ffmpegPath : "",
    path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg")
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`ffmpeg-static 未提供可执行文件，已检查：${candidates.join(" | ")}`);
  }
  return found;
}

async function assertReadable(filePath: string) {
  await access(filePath);
  return filePath;
}

function pickImage(shot: RenderStoryboard) {
  return publicAssetPath(shot.imageUrl);
}

function safeFileToken(value?: string) {
  return (value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

export function videoClipFileName(shot: Pick<RenderStoryboard, "id" | "shotNo">, outputToken?: string) {
  const token = safeFileToken(outputToken);
  return `shot-${String(shot.shotNo).padStart(2, "0")}-${shot.id}${token ? `-${token}` : ""}.mp4`;
}

function dimensionsForAspectRatio(aspectRatio?: string) {
  switch (aspectRatio) {
    case "16:9":
      return { width: 1280, height: 720 };
    case "4:3":
      return { width: 960, height: 720 };
    case "1:1":
      return { width: 720, height: 720 };
    case "9:16":
    default:
      return { width: 720, height: 1280 };
  }
}

function concatEscape(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

async function runFfmpeg(args: string[]) {
  try {
    await execFileAsync(getFfmpegPath(), args, {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 10
    });
  } catch (error: any) {
    const details = [error?.message, error?.stderr, error?.stdout].filter(Boolean).join("\n");
    throw new Error(`FFmpeg 渲染失败：${details}`);
  }
}

export async function normalizeVideoFile(inputPath: string, outputPath: string, options: NormalizeOptions = {}) {
  const { width, height } = dimensionsForAspectRatio(options.aspectRatio);
  const duration = options.durationSeconds ? Math.max(2, Math.min(20, Number(options.durationSeconds))) : null;
  const durationArgs = duration ? ["-t", String(duration)] : [];
  const audioArgs = options.preserveAudio
    ? ["-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2"]
    : ["-an"];

  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    ...durationArgs,
    "-vf",
    `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=24,format=yuv420p`,
    "-c:v",
    "libx264",
    ...audioArgs,
    "-preset",
    "veryfast",
    "-movflags",
    "+faststart",
    outputPath
  ]);
}

export async function renderStoryboardVideos(projectId: string, storyboards: RenderStoryboard[], options: RenderOptions = {}) {
  const dir = await ensureStorageDir("videos", projectId);
  const rendered = [];
  const { width, height } = dimensionsForAspectRatio(options.aspectRatio);

  for (const shot of storyboards) {
    const pickedImage = pickImage(shot);
    const imagePath = pickedImage ? await assertReadable(pickedImage) : null;
    const fileName = videoClipFileName(shot, options.outputToken);
    const outputPath = path.join(dir, fileName);
    const duration = Math.max(2, Math.min(20, Number(shot.durationSeconds) || 6));

    const args = imagePath
      ? [
          "-y",
          "-loop",
          "1",
          "-t",
          String(duration),
          "-i",
          imagePath,
          "-vf",
          `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
          "-r",
          "24",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-movflags",
          "+faststart",
          outputPath
        ]
      : [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `color=c=0f172a:s=${width}x${height}:d=${duration}`,
          "-vf",
          "format=yuv420p",
          "-r",
          "24",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-movflags",
          "+faststart",
          outputPath
        ];

    await runFfmpeg(args);

    rendered.push({
      storyboardId: shot.id,
      videoUrl: storageUrl("videos", projectId, fileName),
      status: "video_ready",
      provider: options.provider,
      fallbackReason: options.fallbackReason
    });
  }

  return rendered;
}

export async function renderFinalVideo(project: RenderProject, storyboards: RenderStoryboard[], format = "mp4") {
  const clips = storyboards.filter((shot) => shot.videoUrl);
  if (!clips.length) {
    throw new Error("没有可合成的视频片段，请先生成分镜视频");
  }

  const exportDir = await ensureStorageDir("exports", project.id);
  const listPath = storagePath("exports", project.id, "concat-list.txt");
  const outputName = `animeflow-${project.id}-${Date.now()}.${format}`;
  const outputPath = storagePath("exports", project.id, outputName);

  const list = clips
    .map((shot) => {
      const clipPath = publicAssetPath(shot.videoUrl);
      if (!clipPath) {
        throw new Error(`无法定位视频片段：${shot.videoUrl}`);
      }
      return `file '${concatEscape(clipPath)}'`;
    })
    .join("\n");

  await writeFile(listPath, list, "utf8");

  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    outputPath
  ]);

  return {
    fileUrl: storageUrl("exports", project.id, outputName),
    format,
    status: "completed",
    clipCount: clips.length
  };
}
