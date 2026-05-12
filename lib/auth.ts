import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const AUTH_COOKIE = "animeflow_user";

export function hashPassword(password: string) {
  return createHash("sha256").update(`animeflow:${password}`).digest("hex");
}

export function setAuthCookie(response: NextResponse, userId: string) {
  response.cookies.set(AUTH_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(AUTH_COOKIE)?.value;
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function publicUser(user: {
  id: string;
  email: string;
  nickname: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
