import path from "path";
import { mkdir } from "fs/promises";

export const STORAGE_ROOT = path.join(process.cwd(), "storage");

export async function ensureStorageDir(...parts: string[]) {
  const dir = path.join(STORAGE_ROOT, ...parts);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function storagePath(...parts: string[]) {
  return path.join(STORAGE_ROOT, ...parts);
}

export function storageUrl(...parts: string[]) {
  return `/api/files/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
}

export function safeStoragePath(parts: string[]) {
  const target = path.resolve(STORAGE_ROOT, ...parts);
  const root = path.resolve(STORAGE_ROOT);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error("非法文件路径");
  }
  return target;
}

export function publicAssetPath(url?: string | null) {
  if (!url) {
    return null;
  }
  if (url.startsWith("/assets/")) {
    return path.join(process.cwd(), "public", url);
  }
  if (url.startsWith("/api/files/")) {
    const segments = url
      .replace("/api/files/", "")
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));
    return safeStoragePath(segments);
  }
  if (url.startsWith("/storage/")) {
    return safeStoragePath(url.replace("/storage/", "").split("/").filter(Boolean));
  }
  return null;
}
