import { prisma } from "@/lib/db";

export async function getProjectBundle(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      script: true,
      assets: { orderBy: [{ assetType: "asc" }, { createdAt: "asc" }] },
      storyboards: { orderBy: { shotNo: "asc" } },
      reviewReports: { orderBy: { createdAt: "desc" } },
      exports: { orderBy: { createdAt: "desc" } },
      generationTasks: { orderBy: { createdAt: "desc" }, take: 20 }
    }
  });
}
