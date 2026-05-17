import { createHash, randomBytes } from "crypto";
import { InviteCode, Prisma } from "@prisma/client";

type InviteCodeDb = Prisma.TransactionClient;

export class InviteCodeError extends Error {}

export function normalizeInviteEmail(value?: string | null) {
  const email = (value || "").trim().toLowerCase();
  return email || null;
}

export function normalizeInviteCode(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function generateInviteCode() {
  return `af_${randomBytes(16).toString("hex")}`;
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(`animeflow-invite:${normalizeInviteCode(code)}`).digest("hex");
}

export function codePrefixFor(code: string) {
  return normalizeInviteCode(code).slice(0, 9);
}

export async function findUsableInviteCode(
  db: InviteCodeDb,
  input: { email: string; inviteCode?: string }
) {
  const code = normalizeInviteCode(input.inviteCode);
  if (!code) {
    throw new InviteCodeError("Registration is invite-only. Please ask the administrator for an invite code.");
  }

  const inviteCode = await db.inviteCode.findUnique({
    where: { codeHash: hashInviteCode(code) }
  });

  if (!inviteCode || inviteCode.status !== "unused") {
    throw new InviteCodeError("Invite code is invalid, revoked, or already used.");
  }

  const email = normalizeInviteEmail(input.email);
  if (inviteCode.targetEmail && inviteCode.targetEmail !== email) {
    throw new InviteCodeError("This invite code is only valid for its assigned email.");
  }

  return inviteCode;
}

export async function markInviteCodeUsed(
  db: InviteCodeDb,
  input: { inviteCodeId: string; userId: string; email: string }
) {
  const result = await db.inviteCode.updateMany({
    where: {
      id: input.inviteCodeId,
      status: "unused"
    },
    data: {
      status: "used",
      codeValue: null,
      usedById: input.userId,
      usedEmail: normalizeInviteEmail(input.email),
      usedAt: new Date()
    }
  });

  if (result.count !== 1) {
    throw new InviteCodeError("Invite code was already used. Please ask the administrator for a new code.");
  }
}

export function publicInviteCode(
  inviteCode: InviteCode & {
    createdBy?: { id: string; email: string; nickname: string } | null;
    usedBy?: { id: string; email: string; nickname: string } | null;
  }
) {
  return {
    id: inviteCode.id,
    code: inviteCode.status === "unused" ? inviteCode.codeValue : null,
    codePrefix: inviteCode.codePrefix,
    status: inviteCode.status,
    targetEmail: inviteCode.targetEmail,
    note: inviteCode.note,
    createdAt: inviteCode.createdAt,
    usedAt: inviteCode.usedAt,
    usedEmail: inviteCode.usedEmail,
    createdBy: inviteCode.createdBy
      ? {
          id: inviteCode.createdBy.id,
          email: inviteCode.createdBy.email,
          nickname: inviteCode.createdBy.nickname
        }
      : null,
    usedBy: inviteCode.usedBy
      ? {
          id: inviteCode.usedBy.id,
          email: inviteCode.usedBy.email,
          nickname: inviteCode.usedBy.nickname
        }
      : null
  };
}
