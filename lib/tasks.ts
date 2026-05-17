import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { renderFinalVideo, renderStoryboardVideos } from "@/lib/video/render";

type TaskEnvelope = {
  applied?: boolean;
  payload?: any;
  clientMessage?: string;
};

type CreateTaskInput = {
  projectId: string;
  taskType: string;
  inputJson: Prisma.InputJsonValue;
  payload: Prisma.InputJsonValue;
  provider?: string;
  clientMessage?: string;
};

type CreateDeferredTaskInput = Omit<CreateTaskInput, "payload">;

export async function createGenerationTask(input: CreateTaskInput) {
  return prisma.generationTask.create({
    data: {
      projectId: input.projectId,
      taskType: input.taskType,
      provider: input.provider || "mock",
      inputJson: input.inputJson,
      outputJson: {
        applied: false,
        payload: input.payload,
        clientMessage: input.clientMessage || ""
      },
      status: "running",
      progress: 12
    }
  });
}

export async function createDeferredGenerationTask(input: CreateDeferredTaskInput) {
  return prisma.generationTask.create({
    data: {
      projectId: input.projectId,
      taskType: input.taskType,
      provider: input.provider || "pending",
      inputJson: input.inputJson,
      outputJson: {
        applied: false,
        clientMessage: input.clientMessage || ""
      },
      status: "running",
      progress: 12
    }
  });
}

export async function completeGenerationTask(
  taskId: string,
  input: { payload: Prisma.InputJsonValue; provider?: string; inputJson?: Prisma.InputJsonValue }
) {
  const existing = await prisma.generationTask.findUnique({ where: { id: taskId } });
  if (!existing) {
    return null;
  }

  const envelope = (existing.outputJson || {}) as TaskEnvelope;
  const task = await prisma.generationTask.update({
    where: { id: taskId },
    data: {
      provider: input.provider || existing.provider,
      inputJson: input.inputJson ?? ((existing.inputJson || {}) as Prisma.InputJsonValue),
      outputJson: {
        ...envelope,
        applied: false,
        payload: input.payload
      } as Prisma.InputJsonValue,
      status: "running",
      progress: Math.max(existing.progress, 92)
    },
    include: {
      project: {
        include: {
          storyboards: { orderBy: { shotNo: "asc" } }
        }
      }
    }
  });

  return applyTaskOutput(task);
}

export async function failGenerationTask(taskId: string, error: unknown) {
  return prisma.generationTask.update({
    where: { id: taskId },
    data: {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "任务执行失败"
    }
  });
}

export async function advanceGenerationTask(taskId: string, userId: string) {
  const task = await prisma.generationTask.findFirst({
    where: { id: taskId, project: { userId } },
    include: {
      project: {
        include: {
          storyboards: { orderBy: { shotNo: "asc" } }
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  if (task.status === "completed" || task.status === "failed") {
    return task;
  }

  const age = Date.now() - task.createdAt.getTime();
  if (age < 1200) {
    const progress = Math.min(92, Math.max(task.progress, 18 + Math.floor(age / 18)));
    return prisma.generationTask.update({
      where: { id: task.id },
      data: { status: "running", progress },
      include: {
        project: {
          include: {
            storyboards: { orderBy: { shotNo: "asc" } }
          }
        }
      }
    });
  }

  const envelope = (task.outputJson || {}) as TaskEnvelope;
  if (!Object.prototype.hasOwnProperty.call(envelope, "payload")) {
    const progress = Math.min(92, Math.max(task.progress, 72 + Math.floor((age - 1200) / 1500)));
    return prisma.generationTask.update({
      where: { id: task.id },
      data: { status: "running", progress },
      include: {
        project: {
          include: {
            storyboards: { orderBy: { shotNo: "asc" } }
          }
        }
      }
    });
  }

  return applyTaskOutput(task);
}

async function applyTaskOutput(task: any) {
  const envelope = (task.outputJson || {}) as TaskEnvelope;
  if (envelope.applied) {
    return prisma.generationTask.update({
      where: { id: task.id },
      data: { status: "completed", progress: 100 }
    });
  }

  const payload = envelope.payload || {};

  try {
    if (task.taskType === "story") {
      await prisma.script.upsert({
        where: { projectId: task.projectId },
        create: {
          projectId: task.projectId,
          originalIdea: payload.originalIdea || "",
          scriptContent: payload.scriptContent || "",
          version: payload.version || 1,
          status: payload.status || "generated"
        },
        update: {
          originalIdea: payload.originalIdea || "",
          scriptContent: payload.scriptContent || "",
          version: { increment: 1 },
          status: payload.status || "generated"
        }
      });

      await prisma.project.update({
        where: { id: task.projectId },
        data: { currentStep: "assets", status: "in_progress" }
      });
    }

    if (task.taskType === "assets") {
      for (const asset of payload.assets || []) {
        await prisma.asset.create({
          data: {
            projectId: task.projectId,
            assetType: asset.assetType,
            name: asset.name,
            description: asset.description || "",
            prompt: asset.prompt || "",
            imageUrl: asset.imageUrl || null,
            audioUrl: asset.audioUrl || null,
            metadataJson: asset.metadataJson || {},
            status: asset.status || "ready"
          }
        });
      }

      await prisma.project.update({
        where: { id: task.projectId },
        data: { currentStep: "storyboard", status: "in_progress" }
      });
    }

    if (task.taskType === "storyboards") {
      await prisma.storyboard.deleteMany({ where: { projectId: task.projectId } });
      for (const shot of payload.storyboards || []) {
        await prisma.storyboard.create({
          data: {
            projectId: task.projectId,
            shotNo: shot.shotNo,
            sceneName: shot.sceneName,
            charactersJson: shot.charactersJson || [],
            visualDescription: shot.visualDescription,
            dialogue: shot.dialogue || "",
            cameraMovement: shot.cameraMovement || "",
            durationSeconds: shot.durationSeconds || 6,
            imagePrompt: shot.imagePrompt || "",
            imageUrl: shot.imageUrl || null,
            videoUrl: shot.videoUrl || null,
            status: shot.status || "draft"
          }
        });
      }

      await prisma.project.update({
        where: { id: task.projectId },
        data: { currentStep: "storyboard", status: "in_progress" }
      });
    }

    if (task.taskType === "review") {
      await prisma.reviewReport.create({
        data: {
          projectId: task.projectId,
          targetType: payload.targetType || "storyboards",
          targetId: payload.targetId || null,
          score: payload.score || 0,
          riskLevel: payload.riskLevel || "high",
          issuesJson: payload.issuesJson || [],
          suggestionsJson: payload.suggestionsJson || []
        }
      });
    }

    if (task.taskType === "images") {
      for (const item of payload.images || []) {
        const storyboardId = item.storyboardId || item.targetId;
        if (storyboardId) {
          await prisma.storyboard.update({
            where: { id: storyboardId },
            data: {
              imageUrl: item.imageUrl || undefined,
              videoUrl: item.imageUrl ? null : undefined,
              status: item.status || (item.imageUrl ? "image_ready" : "image_failed")
            }
          });
        }
      }
    }

    if (task.taskType === "asset_images") {
      for (const item of payload.assetImages || []) {
        if (item.targetId) {
          await prisma.asset.update({
            where: { id: item.targetId },
            data: {
              imageUrl: item.imageUrl || undefined,
              status: item.status || (item.imageUrl ? "image_ready" : "image_failed")
            }
          });
        }
      }

      await prisma.project.update({
        where: { id: task.projectId },
        data: { currentStep: "assets", status: "in_progress" }
      });
    }

    if (task.taskType === "videos") {
      const taskInput = (task.inputJson || {}) as { storyboardId?: string | null };
      const renderedVideos = payload.videos?.length
        ? payload.videos
        : await renderStoryboardVideos(task.projectId, task.project.storyboards || []);
      payload.videos = renderedVideos;

      for (const item of renderedVideos) {
        if (item.storyboardId) {
          await prisma.storyboard.update({
            where: { id: item.storyboardId },
            data: {
              videoUrl: item.videoUrl || undefined,
              status: item.status || (item.videoUrl ? "video_ready" : "video_failed")
            }
          });
        }
      }

      await prisma.project.update({
        where: { id: task.projectId },
        data: { currentStep: taskInput.storyboardId ? "video" : "edit", status: "in_progress" }
      });
    }

    if (task.taskType === "export") {
      const renderedExport = payload.fileUrl
        ? {
            fileUrl: payload.fileUrl,
            format: payload.format || "mp4",
            status: payload.status || "completed",
            clipCount: task.project.storyboards?.length || 0
          }
        : await renderFinalVideo(
            { id: task.project.id, title: task.project.title },
            task.project.storyboards || [],
            payload.format || "mp4"
          );
      payload.fileUrl = renderedExport.fileUrl;
      payload.format = renderedExport.format;
      payload.status = renderedExport.status;
      payload.clipCount = renderedExport.clipCount;

      await prisma.export.create({
        data: {
          projectId: task.projectId,
          fileUrl: payload.fileUrl,
          format: payload.format || "mp4",
          status: payload.status || "completed"
        }
      });

      await prisma.project.update({
        where: { id: task.projectId },
        data: { currentStep: "edit", status: "exported" }
      });
    }

    return prisma.generationTask.update({
      where: { id: task.id },
      data: {
        status: "completed",
        progress: 100,
        outputJson: {
          ...envelope,
          applied: true,
          payload
        } as Prisma.InputJsonValue
      }
    });
  } catch (error) {
    return prisma.generationTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        progress: task.progress,
        errorMessage: error instanceof Error ? error.message : "任务执行失败"
      }
    });
  }
}
