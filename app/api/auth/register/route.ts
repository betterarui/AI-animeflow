import { NextResponse } from "next/server";
import { canRegisterWithoutInvite, defaultDailyQuota, isAdminEmail, registrationMode } from "@/lib/access-control";
import { hashPassword, publicUser, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { badRequest, readJson, serverError } from "@/lib/http";
import { findUsableInviteCode, InviteCodeError, markInviteCodeUsed } from "@/lib/invite-codes";

type RegisterBody = {
  email?: string;
  account?: string;
  password?: string;
  nickname?: string;
  inviteCode?: string;
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
    const nickname = (body.nickname || "AnimeFlow Creator").trim();

    if (!email || email.startsWith("@")) {
      return badRequest("Please enter an email or phone number.");
    }
    if (password.length < 4) {
      return badRequest("Password must be at least 4 characters.");
    }
    const user = await prisma.$transaction(async (tx) => {
      let inviteCodeId: string | null = null;

      if (!canRegisterWithoutInvite(email)) {
        if (registrationMode() === "closed") {
          throw new InviteCodeError("Registration is currently closed.");
        }

        const inviteCode = await findUsableInviteCode(tx, { email, inviteCode: body.inviteCode });
        inviteCodeId = inviteCode.id;
      }

      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash: hashPassword(password),
          nickname,
          role: isAdminEmail(email) ? "admin" : "creator",
          status: "active",
          dailyQuota: defaultDailyQuota()
        }
      });

      if (inviteCodeId) {
        await markInviteCodeUsed(tx, {
          inviteCodeId,
          userId: createdUser.id,
          email
        });
      }

      return createdUser;
    });

    const response = NextResponse.json({ user: publicUser(user) });
    setAuthCookie(response, user.id);
    return response;
  } catch (error) {
    if (error instanceof InviteCodeError) {
      return badRequest(error.message);
    }
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return badRequest("This account is already registered. Please sign in.");
    }
    return serverError(error);
  }
}
