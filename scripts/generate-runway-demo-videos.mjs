import { execFile } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { copyFile, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import { PrismaClient } from "@prisma/client";

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

const ROOT = process.cwd();
const STORAGE_ROOT = path.join(ROOT, "storage");
const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_API_VERSION = "2024-11-06";
const DEFAULT_MODEL = "gen4.5";
const DEFAULT_RATIO = "720:1280";
const TARGET_TITLE = "全民反诈守护";
const TARGET_STYLE = "儿童反诈漫画短视频";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
const reuseSource = args.has("--reuse-source");

const shots = [
  {
    shotNo: 1,
    duration: 6,
    imageUrl: "/assets/fanzha/场景1.jpg",
    promptText:
      "reference image as first frame; warm cartoon living room at night, cute boy notices a red packet link on his phone, blue shield warning bubble appears, child-friendly anti-fraud short video, no captions/text."
  },
  {
    shotNo: 2,
    duration: 11,
    imageUrl: "/assets/fanzha/场景2.jpg",
    promptText:
      "cute boy walks from home to a street milk tea shop, qr-code red-packet sign attracts attention, sly fox scam character peeks from behind the sign, playful cartoon anti-fraud style, no captions/text."
  },
  {
    shotNo: 3,
    duration: 10,
    imageUrl: "/assets/fanzha/场景2.jpg",
    promptText:
      "phone camera nearly scans unknown qr code, cute boy suddenly realizes danger, pulls phone back and locks screen, fox scam character collapses dramatically, child-friendly cartoon style, no captions/text."
  },
  {
    shotNo: 4,
    duration: 9,
    imageUrl: "/assets/fanzha/场景2.jpg",
    promptText:
      "cute boy walks away in sunlight outside milk tea shop, fox scam character deflates and rolls away, upbeat anti-fraud ending with bright positive mood, no captions/text."
  }
];

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) {
    return;
  }
  const content = String(readFileSync(envPath));
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) {
      continue;
    }
    process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}

function assertInsideStorage(target) {
  const resolved = path.resolve(target);
  const root = path.resolve(STORAGE_ROOT);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to touch path outside storage: ${resolved}`);
  }
  return resolved;
}

function storageUrl(...parts) {
  return `/api/files/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
}

function storagePathFromUrl(url) {
  if (!url.startsWith("/api/files/")) {
    throw new Error(`Unsupported storage URL: ${url}`);
  }
  const parts = url.replace("/api/files/", "").split("/").filter(Boolean).map(decodeURIComponent);
  return assertInsideStorage(path.join(STORAGE_ROOT, ...parts));
}

function publicAssetPath(url) {
  if (!url.startsWith("/assets/")) {
    throw new Error(`Unsupported public asset URL: ${url}`);
  }
  return path.join(ROOT, "public", url);
}

function sourceDir() {
  return assertInsideStorage(path.join(STORAGE_ROOT, "videos", "fanzha-source"));
}

function sourceRawPath(shotNo) {
  return path.join(sourceDir(), `shot-${String(shotNo).padStart(2, "0")}-runway-raw.mp4`);
}

function sourceNormalizedPath(shotNo) {
  return path.join(sourceDir(), `shot-${String(shotNo).padStart(2, "0")}-runway.mp4`);
}

function projectClipName(shot) {
  return `shot-${String(shot.shotNo).padStart(2, "0")}-${shot.id}.mp4`;
}

function getFfmpegPath() {
  const candidates = [
    typeof ffmpegPath === "string" ? ffmpegPath : "",
    path.join(ROOT, "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg")
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`ffmpeg-static not found. Checked: ${candidates.join(" | ")}`);
  }
  return found;
}

async function runFfmpeg(args) {
  try {
    await execFileAsync(getFfmpegPath(), args, {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 20
    });
  } catch (error) {
    const details = [error?.message, error?.stderr, error?.stdout].filter(Boolean).join("\n");
    throw new Error(`FFmpeg failed: ${details}`);
  }
}

function concatEscape(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function promptImageDataUri(imagePath) {
  const bytes = readFileSync(imagePath);
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

async function runwayFetch(endpoint, options = {}) {
  const secret = process.env.RUNWAYML_API_SECRET;
  if (!secret) {
    throw new Error("RUNWAYML_API_SECRET is missing. Set it in the environment or .env before running without --dry-run.");
  }
  const response = await fetch(`${RUNWAY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "X-Runway-Version": RUNWAY_API_VERSION,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  if (!response.ok) {
    throw new Error(`Runway API ${response.status} ${response.statusText}: ${text}`);
  }
  return json || {};
}

function extractTaskId(payload) {
  return payload.id || payload.task?.id || payload.data?.id;
}

function extractTaskStatus(payload) {
  return String(payload.status || payload.task?.status || payload.data?.status || "").toUpperCase();
}

function extractOutputUrl(payload) {
  const output = payload.output || payload.task?.output || payload.data?.output;
  if (Array.isArray(output)) {
    return output.find((item) => typeof item === "string") || output[0]?.url;
  }
  if (typeof output === "string") {
    return output;
  }
  if (output?.url) {
    return output.url;
  }
  return null;
}

async function createRunwayTask(shot) {
  const imagePath = publicAssetPath(shot.imageUrl);
  const payload = {
    model: process.env.RUNWAY_MODEL || DEFAULT_MODEL,
    promptImage: promptImageDataUri(imagePath),
    promptText: shot.promptText,
    ratio: process.env.RUNWAY_RATIO || DEFAULT_RATIO,
    duration: shot.duration
  };
  const created = await runwayFetch("/image_to_video", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const taskId = extractTaskId(created);
  if (!taskId) {
    throw new Error(`Runway did not return a task id for shot ${shot.shotNo}: ${JSON.stringify(created)}`);
  }
  return taskId;
}

async function waitForRunwayTask(taskId, shotNo) {
  const timeoutMs = Number(process.env.RUNWAY_POLL_TIMEOUT_MS || 45 * 60 * 1000);
  const intervalMs = Number(process.env.RUNWAY_POLL_INTERVAL_MS || 10 * 1000);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const task = await runwayFetch(`/tasks/${taskId}`, { method: "GET" });
    const status = extractTaskStatus(task);
    const outputUrl = extractOutputUrl(task);
    console.log(`shot ${shotNo}: ${status || "UNKNOWN"}`);

    if (["SUCCEEDED", "COMPLETED", "SUCCESS"].includes(status)) {
      if (!outputUrl) {
        throw new Error(`Runway task ${taskId} succeeded but returned no output URL.`);
      }
      return outputUrl;
    }
    if (["FAILED", "CANCELLED", "CANCELED", "ERROR"].includes(status)) {
      throw new Error(`Runway task ${taskId} failed: ${JSON.stringify(task)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for Runway task ${taskId} for shot ${shotNo}.`);
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, bytes);
}

async function normalizeVideo(inputPath, outputPath, duration) {
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=24,format=yuv420p",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-movflags",
    "+faststart",
    outputPath
  ]);
}

async function probeVideo(filePath) {
  await runFfmpeg(["-hide_banner", "-i", filePath, "-f", "null", "-"]);
}

async function ensureRunwaySourceVideos() {
  mkdirSync(sourceDir(), { recursive: true });

  for (const shot of shots) {
    const normalized = sourceNormalizedPath(shot.shotNo);
    const raw = sourceRawPath(shot.shotNo);
    if (!force && existsSync(normalized)) {
      console.log(`shot ${shot.shotNo}: using existing ${normalized}`);
      continue;
    }
    if (reuseSource && existsSync(raw)) {
      console.log(`shot ${shot.shotNo}: normalizing existing raw source`);
      await normalizeVideo(raw, normalized, shot.duration);
      await probeVideo(normalized);
      continue;
    }

    console.log(`shot ${shot.shotNo}: creating Runway image_to_video task`);
    const taskId = await createRunwayTask(shot);
    console.log(`shot ${shot.shotNo}: task ${taskId}`);
    const outputUrl = await waitForRunwayTask(taskId, shot.shotNo);
    console.log(`shot ${shot.shotNo}: downloading Runway output`);
    await downloadFile(outputUrl, raw);
    await normalizeVideo(raw, normalized, shot.duration);
    await probeVideo(normalized);
  }
}

async function findTargetProjects() {
  const candidates = await prisma.project.findMany({
    where: {
      title: TARGET_TITLE,
      stylePreset: TARGET_STYLE
    },
    orderBy: { updatedAt: "desc" },
    include: {
      storyboards: { orderBy: { shotNo: "asc" } }
    }
  });

  return candidates.filter((project) => project.storyboards.length === shots.length);
}

async function renderFinalVideo(project, storyboards) {
  const exportDir = assertInsideStorage(path.join(STORAGE_ROOT, "exports", project.id));
  mkdirSync(exportDir, { recursive: true });
  const listPath = path.join(exportDir, "concat-list.txt");
  const outputName = `animeflow-${project.id}-${Date.now()}.mp4`;
  const outputPath = path.join(exportDir, outputName);
  const list = storyboards
    .map((shot) => {
      const clipPath = storagePathFromUrl(shot.videoUrl);
      return `file '${concatEscape(clipPath)}'`;
    })
    .join("\n");

  await writeFile(listPath, list, "utf8");
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", outputPath]);
  await probeVideo(outputPath);

  return {
    fileUrl: storageUrl("exports", project.id, outputName),
    format: "mp4",
    status: "completed",
    clipCount: storyboards.length
  };
}

async function replaceProjectVideos(project) {
  if (project.storyboards.length !== shots.length) {
    throw new Error(`Project ${project.id} has ${project.storyboards.length} storyboards, expected ${shots.length}.`);
  }

  const projectVideoDir = assertInsideStorage(path.join(STORAGE_ROOT, "videos", project.id));
  const projectExportDir = assertInsideStorage(path.join(STORAGE_ROOT, "exports", project.id));
  rmSync(projectVideoDir, { recursive: true, force: true });
  rmSync(projectExportDir, { recursive: true, force: true });
  mkdirSync(projectVideoDir, { recursive: true });

  const renderedVideos = [];
  const updatedStoryboards = [];

  for (const storyboard of project.storyboards) {
    const shot = shots.find((item) => item.shotNo === storyboard.shotNo);
    if (!shot) {
      throw new Error(`Unexpected storyboard shot number ${storyboard.shotNo} in project ${project.id}.`);
    }
    if (storyboard.imageUrl !== shot.imageUrl) {
      throw new Error(`Storyboard ${storyboard.id} image mismatch. Expected ${shot.imageUrl}, got ${storyboard.imageUrl}.`);
    }

    const outputName = projectClipName(storyboard);
    const outputPath = path.join(projectVideoDir, outputName);
    await copyFile(sourceNormalizedPath(shot.shotNo), outputPath);
    await probeVideo(outputPath);
    const videoUrl = storageUrl("videos", project.id, outputName);
    await prisma.storyboard.update({
      where: { id: storyboard.id },
      data: { videoUrl, status: "video_ready" }
    });
    renderedVideos.push({
      storyboardId: storyboard.id,
      videoUrl,
      status: "video_ready",
      provider: "runway"
    });
    updatedStoryboards.push({ ...storyboard, videoUrl, status: "video_ready" });
  }

  await prisma.export.deleteMany({ where: { projectId: project.id } });
  await prisma.generationTask.deleteMany({
    where: {
      projectId: project.id,
      taskType: { in: ["videos", "export"] }
    }
  });

  const renderedExport = await renderFinalVideo(project, updatedStoryboards);
  await prisma.export.create({
    data: {
      projectId: project.id,
      fileUrl: renderedExport.fileUrl,
      format: renderedExport.format,
      status: renderedExport.status
    }
  });

  await prisma.generationTask.create({
    data: {
      projectId: project.id,
      taskType: "videos",
      provider: "runway",
      inputJson: {
        storyboardCount: shots.length,
        model: process.env.RUNWAY_MODEL || DEFAULT_MODEL,
        ratio: process.env.RUNWAY_RATIO || DEFAULT_RATIO
      },
      outputJson: {
        applied: true,
        payload: { videos: renderedVideos },
        clientMessage: "Runway AI 视频已生成并回写 storyboards.video_url"
      },
      status: "completed",
      progress: 100
    }
  });

  await prisma.generationTask.create({
    data: {
      projectId: project.id,
      taskType: "export",
      provider: "runway",
      inputJson: { format: "mp4" },
      outputJson: {
        applied: true,
        payload: renderedExport,
        clientMessage: "Runway 分镜视频已合成为最终 demo MP4"
      },
      status: "completed",
      progress: 100
    }
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { currentStep: "edit", status: "exported" }
  });

  return renderedExport;
}

async function dryRunChecks() {
  const candidates = await prisma.project.findMany({
    where: {
      title: TARGET_TITLE,
      stylePreset: TARGET_STYLE
    },
    orderBy: { updatedAt: "desc" },
    include: {
      storyboards: { orderBy: { shotNo: "asc" } }
    }
  });
  const projects = candidates.filter((project) => project.storyboards.length === shots.length);
  const skippedProjects = candidates.filter((project) => project.storyboards.length !== shots.length);
  const missingImages = shots
    .map((shot) => publicAssetPath(shot.imageUrl))
    .filter((imagePath) => !existsSync(imagePath));
  const invalidDurations = shots.filter((shot) => shot.duration < 2 || shot.duration > 10);
  const longPrompts = shots.filter((shot) => shot.promptText.length > 900);
  const imageMismatches = projects.flatMap((project) =>
    project.storyboards
      .map((storyboard) => {
        const expected = shots.find((shot) => shot.shotNo === storyboard.shotNo)?.imageUrl;
        return expected && storyboard.imageUrl !== expected
          ? {
              projectId: project.id,
              shotNo: storyboard.shotNo,
              expected,
              actual: storyboard.imageUrl
            }
          : null;
      })
      .filter(Boolean)
  );

  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        runwaySecretPresent: Boolean(process.env.RUNWAYML_API_SECRET),
        model: process.env.RUNWAY_MODEL || DEFAULT_MODEL,
        ratio: process.env.RUNWAY_RATIO || DEFAULT_RATIO,
        targetProjects: projects.map((project) => project.id),
        skippedProjects: skippedProjects.map((project) => ({
          projectId: project.id,
          storyboardCount: project.storyboards.length
        })),
        sourceDir: sourceDir(),
        missingImages,
        invalidDurations,
        longPromptShots: longPrompts.map((shot) => shot.shotNo),
        imageMismatches
      },
      null,
      2
    )
  );

  if (!projects.length) {
    throw new Error(`No complete target projects found for title ${TARGET_TITLE}, style ${TARGET_STYLE}, and ${shots.length} storyboards.`);
  }
  if (missingImages.length || invalidDurations.length || longPrompts.length || imageMismatches.length) {
    throw new Error("Dry-run checks failed.");
  }
}

async function main() {
  loadDotEnv();
  await dryRunChecks();
  if (dryRun) {
    return;
  }

  await ensureRunwaySourceVideos();
  const projects = await findTargetProjects();
  const exports = [];
  for (const project of projects) {
    console.log(`updating project ${project.id}`);
    exports.push({
      projectId: project.id,
      export: await replaceProjectVideos(project)
    });
  }

  console.log(JSON.stringify({ updatedProjects: exports }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
