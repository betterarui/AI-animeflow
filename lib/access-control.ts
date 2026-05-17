import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { forbidden, tooManyRequests } from "@/lib/http";

type UserAccess = {
  id: string;
  email: string;
  role: string;
  status?: string;
  dailyQuota?: number;
};

export class AccessControlError extends Error {
  constructor(
    message: string,
    public status: 403 | 429,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

function splitList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function defaultDailyQuota() {
  const configured = Number(process.env.DEFAULT_DAILY_QUOTA || 100);
  return Number.isFinite(configured) ? Math.max(0, Math.floor(configured)) : 100;
}

export function isAdminEmail(email: string) {
  return splitList(process.env.ADMIN_EMAILS).includes(email.trim().toLowerCase());
}

export function registrationMode() {
  return (process.env.REGISTRATION_MODE || "open").trim().toLowerCase();
}

export function isAllowedRegistrationEmail(email: string) {
  return splitList(process.env.ALLOWED_REGISTRATION_EMAILS).includes(email.trim().toLowerCase());
}

export function isAdminUser(user: UserAccess) {
  return user.role === "admin" || isAdminEmail(user.email);
}

export function canRegisterWithoutInvite(input: { email: string } | string) {
  const email = (typeof input === "string" ? input : input.email).trim().toLowerCase();
  return isAdminEmail(email) || isAllowedRegistrationEmail(email) || registrationMode() === "open";
}

export function canRegisterWithInvite(input: { email: string; inviteCode?: string }) {
  return canRegisterWithoutInvite(input);
}

export function quotaCostForTask(taskType: string, inputJson: unknown) {
  const input = asRecord(inputJson);
  const storyboardCount = Math.max(1, asNumber(input.storyboardCount, 1));
  const assetCount = Math.max(1, asNumber(input.assetCount, 1));

  switch (taskType) {
    case "story":
    case "assets":
      return 2;
    case "storyboards":
      return 3;
    case "asset_images":
      return assetCount * 5;
    case "images":
      return storyboardCount * 8;
    case "videos":
      return storyboardCount * 20;
    case "export":
      return 1;
    case "review":
    default:
      return 0;
  }
}

export async function dailyUsageForUser(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    select: {
      generationTasks: {
        where: { createdAt: { gte: startOfToday() } },
        select: {
          id: true,
          taskType: true,
          inputJson: true,
          status: true,
          createdAt: true
        }
      }
    }
  });

  const tasks = projects.flatMap((project) => project.generationTasks);
  const used = tasks.reduce((sum, task) => sum + quotaCostForTask(task.taskType, task.inputJson), 0);
  return { used, tasksToday: tasks.length };
}

export async function assertCanStartGeneration(user: UserAccess, taskType: string, inputJson: Prisma.InputJsonValue) {
  if ((user.status || "active") !== "active") {
    throw new AccessControlError("Your account is disabled. Contact the site administrator.", 403);
  }

  const cost = quotaCostForTask(taskType, inputJson);
  if (isAdminUser(user)) {
    return { cost, used: 0, quota: null as number | null, remaining: null as number | null };
  }

  const quota = Number.isFinite(user.dailyQuota) ? Math.max(0, Number(user.dailyQuota)) : defaultDailyQuota();
  const usage = await dailyUsageForUser(user.id);
  const remaining = Math.max(0, quota - usage.used);

  if (cost > remaining) {
    throw new AccessControlError("Daily generation quota exceeded. Ask an administrator to raise your limit.", 429, {
      quota,
      used: usage.used,
      remaining,
      cost
    });
  }

  return { cost, used: usage.used, quota, remaining: remaining - cost };
}

export function accessControlResponse(error: unknown) {
  if (!(error instanceof AccessControlError)) {
    return null;
  }
  if (error.status === 429) {
    return tooManyRequests(error.message, error.details);
  }
  return forbidden(error.message);
}
