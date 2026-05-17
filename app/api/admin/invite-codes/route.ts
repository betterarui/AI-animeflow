import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, readJson, serverError, unauthorized } from "@/lib/http";
import {
  codePrefixFor,
  generateInviteCode,
  hashInviteCode,
  normalizeInviteEmail,
  publicInviteCode
} from "@/lib/invite-codes";

type CreateBody = {
  quantity?: number;
  targetEmail?: string;
  note?: string;
};

type UpdateBody = {
  id?: string;
  inviteCodeId?: string;
  status?: string;
  action?: string;
};

const USER_SELECT = {
  id: true,
  email: true,
  nickname: true
};

export async function GET() {
  try {
    await requireAdmin();
    const inviteCodes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: USER_SELECT },
        usedBy: { select: USER_SELECT }
      }
    });

    return ok({ inviteCodes: inviteCodes.map(publicInviteCode) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden("Admin access required.");
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await readJson<CreateBody>(request);
    const quantity = Math.floor(Number(body.quantity ?? 1));
    const targetEmail = normalizeInviteEmail(body.targetEmail);
    const note = (body.note || "").trim().slice(0, 200);

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100) {
      return badRequest("Quantity must be between 1 and 100.");
    }
    if (body.targetEmail && (!targetEmail || !targetEmail.includes("@"))) {
      return badRequest("Invalid target email.");
    }

    const inviteCodes = await prisma.$transaction(async (tx) => {
      const created: Array<ReturnType<typeof publicInviteCode> & { code: string }> = [];

      for (let index = 0; index < quantity; index += 1) {
        const code = generateInviteCode();
        const inviteCode = await tx.inviteCode.create({
          data: {
            codeHash: hashInviteCode(code),
            codeValue: code,
            codePrefix: codePrefixFor(code),
            status: "unused",
            targetEmail,
            note,
            createdById: admin.id
          }
        });

        created.push({
          ...publicInviteCode(inviteCode),
          code
        });
      }

      return created;
    });

    return ok({ inviteCodes });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden("Admin access required.");
    }
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await readJson<UpdateBody>(request);
    const id = body.inviteCodeId || body.id;
    const shouldRevoke = body.action === "revoke" || body.status === "revoked";

    if (!id) {
      return badRequest("Missing invite code id.");
    }
    if (!shouldRevoke) {
      return badRequest("Only revoking unused invite codes is supported.");
    }

    const inviteCode = await prisma.inviteCode.findUnique({
      where: { id },
      include: {
        createdBy: { select: USER_SELECT },
        usedBy: { select: USER_SELECT }
      }
    });

    if (!inviteCode) {
      return notFound("Invite code not found.");
    }
    if (inviteCode.status !== "unused") {
      return badRequest("Only unused invite codes can be revoked.");
    }

    const updated = await prisma.inviteCode.update({
      where: { id },
      data: { status: "revoked", codeValue: null },
      include: {
        createdBy: { select: USER_SELECT },
        usedBy: { select: USER_SELECT }
      }
    });

    return ok({ inviteCode: publicInviteCode(updated) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden("Admin access required.");
    }
    return serverError(error);
  }
}
