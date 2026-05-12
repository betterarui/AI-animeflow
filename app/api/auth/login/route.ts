import { NextResponse } from "next/server";
import { hashPassword, publicUser, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { badRequest, readJson, serverError } from "@/lib/http";

type LoginBody = {
  email?: string;
  account?: string;
  password?: string;
};

function normalizeAccount(value?: string) {
  const account = (value || "").trim().toLowerCase();
  return account.includes("@") ? account : `${account}@phone.animeflow.local`;
}

export async function POST(request: Request) {
  try {
    const body = await readJson<LoginBody>(request);
    const email = normalizeAccount(body.email || body.account);
    const password = (body.password || "").trim();

    if (!email || !password) {
      return badRequest("请输入账号和密码");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== hashPassword(password)) {
      return badRequest("账号或密码不正确");
    }

    const response = NextResponse.json({ user: publicUser(user) });
    setAuthCookie(response, user.id);
    return response;
  } catch (error) {
    return serverError(error);
  }
}
