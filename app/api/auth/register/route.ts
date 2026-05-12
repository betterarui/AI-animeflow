import { NextResponse } from "next/server";
import { hashPassword, publicUser, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { badRequest, readJson, serverError } from "@/lib/http";

type RegisterBody = {
  email?: string;
  account?: string;
  password?: string;
  nickname?: string;
};

function normalizeAccount(value?: string) {
  const account = (value || "").trim().toLowerCase();
  return account.includes("@") ? account : `${account}@phone.animeflow.local`;
}

export async function POST(request: Request) {
  try {
    const body = await readJson<RegisterBody>(request);
    const email = normalizeAccount(body.email || body.account);
    const password = (body.password || "").trim();
    const nickname = (body.nickname || "AnimeFlow 创作者").trim();

    if (!email || email.startsWith("@")) {
      return badRequest("请输入邮箱或手机号");
    }
    if (password.length < 4) {
      return badRequest("开发环境密码至少 4 位");
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        nickname
      }
    });

    const response = NextResponse.json({ user: publicUser(user) });
    setAuthCookie(response, user.id);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return badRequest("该账号已注册，请直接登录");
    }
    return serverError(error);
  }
}
