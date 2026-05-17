import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { safeStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg"
};

function streamFile(filePath: string, start?: number, end?: number) {
  const stream = createReadStream(filePath, start !== undefined && end !== undefined ? { start, end } : undefined);
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (error) => controller.error(error));
    },
    cancel() {
      stream.destroy();
    }
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: parts } = await params;
    const filePath = safeStoragePath(parts || []);
    const info = await stat(filePath);
    const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
    const contentType = contentTypes[ext] || "application/octet-stream";
    const range = request.headers.get("range");

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : info.size - 1;
        return new NextResponse(streamFile(filePath, start, end), {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(end - start + 1),
            "Content-Range": `bytes ${start}-${end}/${info.size}`,
            "Accept-Ranges": "bytes"
          }
        });
      }
    }

    return new NextResponse(streamFile(filePath), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Accept-Ranges": "bytes"
      }
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
