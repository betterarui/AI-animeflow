import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Please sign in first") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function tooManyRequests<T extends Record<string, unknown>>(message: string, data?: T) {
  return NextResponse.json({ error: message, ...(data || {}) }, { status: 429 });
}

export function notFound(message = "Resource not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Server error";
  if (message === "UNAUTHORIZED") {
    return unauthorized();
  }
  if (message === "FORBIDDEN") {
    return forbidden("需要管理员权限");
  }
  if (message === "ACCOUNT_DISABLED") {
    return forbidden("账号已被停用，请联系管理员");
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
