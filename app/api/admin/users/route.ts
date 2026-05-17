import { requireAdmin } from "@/lib/auth";
import { dailyUsageForUser, defaultDailyQuota, isAdminUser } from "@/lib/access-control";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, ok, readJson, serverError, unauthorized } from "@/lib/http";

type UpdateBody = {
  userId?: string;
  status?: string;
  role?: string;
  dailyQuota?: number;
};

function publicAdminUser(user: {
  id: string;
  email: string;
  nickname: string;
  role: string;
  status: string;
  dailyQuota: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { projects: number };
}) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    status: user.status,
    dailyQuota: user.dailyQuota,
    isAdmin: isAdminUser(user),
    projectCount: user._count?.projects || 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true } } }
    });

    const rows = await Promise.all(
      users.map(async (user) => {
        const usage = await dailyUsageForUser(user.id);
        return {
          ...publicAdminUser(user),
          usedToday: usage.used,
          tasksToday: usage.tasksToday,
          remainingToday: isAdminUser(user) ? null : Math.max(0, user.dailyQuota - usage.used)
        };
      })
    );

    return ok({ users: rows, defaultDailyQuota: defaultDailyQuota() });
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
    const admin = await requireAdmin();
    const body = await readJson<UpdateBody>(request);
    if (!body.userId) {
      return badRequest("Missing userId.");
    }

    const status = body.status || undefined;
    const role = body.role || undefined;
    const dailyQuota = Number(body.dailyQuota);
    if (status && !["active", "suspended"].includes(status)) {
      return badRequest("Invalid status.");
    }
    if (role && !["creator", "admin"].includes(role)) {
      return badRequest("Invalid role.");
    }
    if (body.dailyQuota !== undefined && (!Number.isFinite(dailyQuota) || dailyQuota < 0 || dailyQuota > 100000)) {
      return badRequest("Daily quota must be between 0 and 100000.");
    }
    if (body.userId === admin.id && status === "suspended") {
      return badRequest("You cannot suspend your own account.");
    }

    const user = await prisma.user.update({
      where: { id: body.userId },
      data: {
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
        ...(body.dailyQuota !== undefined ? { dailyQuota: Math.floor(dailyQuota) } : {})
      },
      include: { _count: { select: { projects: true } } }
    });
    const usage = await dailyUsageForUser(user.id);

    return ok({
      user: {
        ...publicAdminUser(user),
        usedToday: usage.used,
        tasksToday: usage.tasksToday,
        remainingToday: isAdminUser(user) ? null : Math.max(0, user.dailyQuota - usage.used)
      }
    });
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
