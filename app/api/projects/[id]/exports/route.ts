import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, ok, serverError, unauthorized } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const project = await prisma.project.findFirst({ where: { id, userId: user.id } });
    if (!project) {
      return notFound("项目不存在");
    }

    const exports = await prisma.export.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" }
    });
    return ok({ exports });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
