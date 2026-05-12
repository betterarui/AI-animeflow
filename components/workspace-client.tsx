"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clapperboard,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Package,
  Play,
  Plus,
  Save,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import { api, cn, formatDate } from "@/lib/client";

type StepKey = "script" | "assets" | "storyboard" | "video" | "edit";

type ScriptRecord = {
  id: string;
  originalIdea: string;
  scriptContent: string;
  version: number;
  status: string;
  updatedAt: string;
};

type AssetRecord = {
  id: string;
  assetType: string;
  name: string;
  description: string;
  prompt: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  metadataJson?: unknown;
  status: string;
};

type StoryboardRecord = {
  id: string;
  shotNo: number;
  sceneName: string;
  charactersJson: unknown;
  visualDescription: string;
  dialogue: string;
  cameraMovement: string;
  durationSeconds: number;
  imagePrompt: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  status: string;
};

type GenerationTask = {
  id: string;
  taskType: string;
  provider: string;
  status: string;
  progress: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReviewReport = {
  id: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  issuesJson: unknown;
  suggestionsJson: unknown;
  createdAt: string;
};

type ExportRecord = {
  id: string;
  fileUrl: string;
  format: string;
  status: string;
  createdAt: string;
};

type ProjectBundle = {
  id: string;
  title: string;
  description: string;
  type: string;
  aspectRatio: string;
  durationTarget: string;
  stylePreset: string;
  creationMode: string;
  currentStep: StepKey;
  status: string;
  script?: ScriptRecord | null;
  assets: AssetRecord[];
  storyboards: StoryboardRecord[];
  generationTasks: GenerationTask[];
  reviewReports: ReviewReport[];
  exports: ExportRecord[];
  updatedAt: string;
};

const steps: Array<{ key: StepKey; title: string; icon: typeof FileText }> = [
  { key: "script", title: "剧本创作", icon: FileText },
  { key: "assets", title: "资产管理", icon: Package },
  { key: "storyboard", title: "分镜打造", icon: Clapperboard },
  { key: "video", title: "视频生成", icon: Film },
  { key: "edit", title: "剪辑修正", icon: Scissors }
];

const assetLabels: Record<string, string> = {
  role: "角色",
  scene: "场景",
  prop: "道具",
  voice: "配音",
  music: "配乐"
};

const taskLabels: Record<string, string> = {
  story: "AI 生成剧本",
  assets: "自动生成资产",
  storyboards: "自动生成分镜",
  review: "创意审查门禁",
  images: "分镜图片生成",
  videos: "分镜视频生成",
  export: "成片导出"
};

export function WorkspaceClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectBundle | null>(null);
  const [activeStep, setActiveStep] = useState<StepKey>("script");
  const [originalIdea, setOriginalIdea] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediumConfirmed, setMediumConfirmed] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);
  const [editingStoryboard, setEditingStoryboard] = useState<StoryboardRecord | null>(null);
  const pollingRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  const latestReview = project?.reviewReports?.[0];
  const activeTasks = project?.generationTasks?.filter((task) => ["pending", "running"].includes(task.status)) || [];
  const canUseVideo = latestReview?.riskLevel === "low" || (latestReview?.riskLevel === "medium" && mediumConfirmed);

  async function loadProject(nextStep?: StepKey) {
    try {
      const data = await api<{ project: ProjectBundle }>(`/api/projects/${projectId}`);
      setProject(data.project);
      setOriginalIdea(data.project.script?.originalIdea || data.project.description || "");
      setScriptContent(data.project.script?.scriptContent || "");
      setActiveStep(nextStep || data.project.currentStep || "script");
      setError("");
      data.project.generationTasks
        ?.filter((task) => ["pending", "running"].includes(task.status))
        .forEach((task) => pollTask(task.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "项目加载失败";
      if (message.includes("登录")) {
        router.push("/login");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function saveProjectStep(step = activeStep) {
    await api(`/api/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify({ currentStep: step, status: project?.status === "draft" ? "in_progress" : project?.status })
    });
  }

  async function saveScript() {
    setSaving(true);
    setError("");
    try {
      await api(`/api/projects/${projectId}/script`, {
        method: "PUT",
        body: JSON.stringify({ originalIdea, scriptContent, status: "saved" })
      });
      await loadProject("script");
      showToast("剧本已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function startTask(endpoint: string, body: Record<string, unknown>, nextStep?: StepKey) {
    setError("");
    try {
      const data = await api<{ task: GenerationTask }>(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
      });
      setProject((current) =>
        current
          ? {
              ...current,
              generationTasks: [data.task, ...(current.generationTasks || []).filter((task) => task.id !== data.task.id)]
            }
          : current
      );
      pollTask(data.task.id, nextStep);
      showToast("任务已进入 generation_tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务启动失败");
    }
  }

  function pollTask(taskId: string, nextStep?: StepKey) {
    if (pollingRef.current.has(taskId)) {
      return;
    }
    pollingRef.current.add(taskId);

    const tick = async () => {
      try {
        const data = await api<{ task: GenerationTask }>(`/api/tasks/${taskId}`);
        setProject((current) =>
          current
            ? {
                ...current,
                generationTasks: [
                  data.task,
                  ...(current.generationTasks || []).filter((task) => task.id !== data.task.id)
                ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              }
            : current
        );

        if (["completed", "failed"].includes(data.task.status)) {
          pollingRef.current.delete(taskId);
          const timer = timersRef.current.get(taskId);
          if (timer) {
            window.clearInterval(timer);
            timersRef.current.delete(taskId);
          }
          await loadProject(nextStep);
          showToast(data.task.status === "completed" ? "任务完成并已持久化" : "任务失败，可重试");
        }
      } catch (err) {
        pollingRef.current.delete(taskId);
        const timer = timersRef.current.get(taskId);
        if (timer) {
          window.clearInterval(timer);
          timersRef.current.delete(taskId);
        }
        setError(err instanceof Error ? err.message : "任务轮询失败");
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 650);
    timersRef.current.set(taskId, timer);
  }

  function enterStep(step: StepKey) {
    if (step === "video") {
      if (!latestReview) {
        setActiveStep("storyboard");
        showToast("请先运行创意审查门禁");
        return;
      }
      if (latestReview.riskLevel === "high") {
        setActiveStep("storyboard");
        setError("高风险审查结果已阻止进入视频生成");
        return;
      }
      if (latestReview.riskLevel === "medium" && !mediumConfirmed) {
        setActiveStep("storyboard");
        showToast("中风险需要确认后放行");
        return;
      }
    }

    setActiveStep(step);
    void saveProjectStep(step);
  }

  async function importTextFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.name.endsWith(".docx")) {
      setScriptContent((current) => `${current}\n\n[导入文档：${file.name}] 浏览器端已记录文件名；DOCX 正文可在后续接入服务端解析。`);
      return;
    }
    const text = await file.text();
    setScriptContent((current) => `${current}\n\n${text}`);
  }

  useEffect(() => {
    void loadProject();
    return () => {
      timersRef.current.forEach((timer) => window.clearInterval(timer));
      timersRef.current.clear();
      pollingRef.current.clear();
    };
  }, [projectId]);

  const groupedAssets = useMemo(() => {
    const groups: Record<string, AssetRecord[]> = {};
    for (const asset of project?.assets || []) {
      groups[asset.assetType] = groups[asset.assetType] || [];
      groups[asset.assetType].push(asset);
    }
    return groups;
  }, [project?.assets]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-card border border-line bg-white px-5 py-4 font-semibold text-ink shadow-work">
          <Loader2 className="animate-spin text-teal" size={20} />
          正在加载项目
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="panel max-w-md p-6 text-center">
          <AlertTriangle className="mx-auto text-coral" size={42} />
          <h1 className="mt-4 text-2xl font-semibold text-ink">项目不可用</h1>
          <p className="mt-2 text-muted">{error || "未能读取项目数据"}</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-card bg-ink px-5 py-3 font-semibold text-white">
            返回工作台
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="hidden shrink-0 sm:block" aria-label="AnimeFlow 工作台">
              <img src="/assets/images/logo/logo-latest.png" alt="AnimeFlow 工作台" className="brand-logo" />
            </Link>
            <Link href="/dashboard" className="rounded-card border border-line p-2 text-muted hover:text-ink" aria-label="返回工作台">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Project Workspace</p>
              <h1 className="truncate text-xl font-semibold text-ink">{project.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber/15 px-3 py-1 text-sm font-semibold text-ink">{project.status}</span>
            <span className="rounded-full bg-teal/10 px-3 py-1 text-sm font-semibold text-teal">
              {steps.find((step) => step.key === activeStep)?.title}
            </span>
            <button
              onClick={() => void saveProjectStep()}
              className="inline-flex items-center gap-2 rounded-card border border-line bg-white px-4 py-2 font-semibold text-ink"
            >
              <Save size={16} />
              保存
            </button>
            <button
              onClick={() => {
                setActiveStep("edit");
                void startTask(`/api/projects/${projectId}/export`, { format: "mp4" }, "edit");
              }}
              className="inline-flex items-center gap-2 rounded-card bg-ink px-4 py-2 font-semibold text-white"
            >
              <Download size={16} />
              导出
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1520px] grid-cols-1 gap-4 px-5 py-5 xl:grid-cols-[268px_1fr_340px]">
        <aside className="space-y-4">
          <div className="panel p-3">
            <nav className="space-y-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === step.key;
                return (
                  <button
                    key={step.key}
                    onClick={() => enterStep(step.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-card px-3 py-3 text-left transition",
                      isActive ? "bg-ink text-white" : "text-ink hover:bg-paper"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-card text-sm font-bold",
                        isActive ? "bg-amber text-ink" : "bg-white text-muted"
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <Icon size={18} />
                      <span className="truncate font-semibold">{step.title}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="panel p-4">
            <div className="mb-3 flex items-center gap-3">
              <img src="/assets/images/avatar/miaodao.png" alt="喵导" className="h-10 w-10 rounded-card object-cover" />
              <div>
                <h2 className="font-semibold text-ink">喵导</h2>
                <p className="text-xs text-muted">AI 制片助手</p>
              </div>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>项目画幅 {project.aspectRatio}，目标时长 {project.durationTarget}。</p>
              <p>当前已有 {project.assets.length} 个资产、{project.storyboards.length} 条分镜、{project.exports.length} 条导出记录。</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {error && (
            <div className="mb-4 rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-medium text-coral">{error}</div>
          )}
          {activeStep === "script" && (
            <ScriptStep
              originalIdea={originalIdea}
              scriptContent={scriptContent}
              saving={saving}
              onIdeaChange={setOriginalIdea}
              onScriptChange={setScriptContent}
              onSave={() => void saveScript()}
              onImport={importTextFile}
              onGenerate={() => void startTask("/api/generation/story", { projectId, idea: originalIdea }, "assets")}
            />
          )}
          {activeStep === "assets" && (
            <AssetsStep
              groupedAssets={groupedAssets}
              onGenerate={() => void startTask("/api/generation/assets", { projectId }, "storyboard")}
              onEdit={setEditingAsset}
              onCreate={() =>
                setEditingAsset({
                  id: "",
                  assetType: "role",
                  name: "",
                  description: "",
                  prompt: "",
                  imageUrl: "",
                  audioUrl: "",
                  status: "draft"
                })
              }
            />
          )}
          {activeStep === "storyboard" && (
            <StoryboardStep
              storyboards={project.storyboards}
              latestReview={latestReview}
              mediumConfirmed={mediumConfirmed}
              canUseVideo={canUseVideo}
              onGenerate={() => void startTask("/api/generation/storyboards", { projectId }, "storyboard")}
              onReview={() => void startTask("/api/generation/review", { projectId }, "storyboard")}
              onConfirmMedium={() => setMediumConfirmed(true)}
              onEnterVideo={() => enterStep("video")}
              onEdit={setEditingStoryboard}
            />
          )}
          {activeStep === "video" && (
            <VideoStep
              storyboards={project.storyboards}
              canUseVideo={canUseVideo}
              latestReview={latestReview}
              onReview={() => void startTask("/api/generation/review", { projectId }, "storyboard")}
              onGenerateImages={() => void startTask("/api/generation/images", { projectId }, "video")}
              onGenerateVideos={() => void startTask("/api/generation/videos", { projectId }, "edit")}
            />
          )}
          {activeStep === "edit" && (
            <EditStep
              storyboards={project.storyboards}
              exports={project.exports}
              onExport={() => void startTask(`/api/projects/${projectId}/export`, { format: "mp4" }, "edit")}
            />
          )}
        </section>

        <RightPanel project={project} tasks={project.generationTasks} activeTasks={activeTasks} latestReview={latestReview} />
      </section>

      {editingAsset && (
        <AssetModal
          asset={editingAsset}
          projectId={projectId}
          onClose={() => setEditingAsset(null)}
          onSaved={() => {
            setEditingAsset(null);
            void loadProject("assets");
          }}
        />
      )}
      {editingStoryboard && (
        <StoryboardModal
          storyboard={editingStoryboard}
          onClose={() => setEditingStoryboard(null)}
          onSaved={() => {
            setEditingStoryboard(null);
            void loadProject("storyboard");
          }}
        />
      )}
      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-card bg-ink px-5 py-3 font-semibold text-white shadow-work">{toast}</div>}
    </main>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title, actions }: { icon: typeof FileText; eyebrow: string; title: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-card bg-teal/10 text-teal">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">{eyebrow}</p>
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
        </div>
      </div>
      {actions}
    </div>
  );
}

function ScriptStep(props: {
  originalIdea: string;
  scriptContent: string;
  saving: boolean;
  onIdeaChange: (value: string) => void;
  onScriptChange: (value: string) => void;
  onSave: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <SectionHeader
        icon={FileText}
        eyebrow="Step 01"
        title="剧本创作"
        actions={
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-card border border-line bg-white px-4 py-2 font-semibold text-ink">
              导入文档
              <input type="file" accept=".txt,.md,.docx" className="hidden" onChange={props.onImport} />
            </label>
            <button onClick={props.onGenerate} className="inline-flex items-center gap-2 rounded-card bg-teal px-4 py-2 font-semibold text-white">
              <Wand2 size={16} />
              AI 生成剧本
            </button>
            <button onClick={props.onSave} disabled={props.saving} className="inline-flex items-center gap-2 rounded-card bg-ink px-4 py-2 font-semibold text-white">
              <Save size={16} />
              {props.saving ? "保存中" : "保存"}
            </button>
          </div>
        }
      />
      <div className="grid gap-5 p-5">
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">创意输入</span>
          <textarea
            value={props.originalIdea}
            onChange={(event) => props.onIdeaChange(event.target.value)}
            placeholder="输入题材、角色、冲突、目标观众或希望的风格"
            className="min-h-[120px]"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">剧本编辑器</span>
          <textarea
            value={props.scriptContent}
            onChange={(event) => props.onScriptChange(event.target.value)}
            placeholder="AI 生成或手动编写剧本内容"
            className="min-h-[520px] font-mono text-sm leading-7"
          />
        </label>
      </div>
    </div>
  );
}

function AssetsStep(props: {
  groupedAssets: Record<string, AssetRecord[]>;
  onGenerate: () => void;
  onEdit: (asset: AssetRecord) => void;
  onCreate: () => void;
}) {
  const assetTypes = ["role", "scene", "prop", "voice", "music"];
  return (
    <div className="panel overflow-hidden">
      <SectionHeader
        icon={Package}
        eyebrow="Step 02"
        title="资产管理"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={props.onCreate} className="inline-flex items-center gap-2 rounded-card border border-line bg-white px-4 py-2 font-semibold text-ink">
              <Plus size={16} />
              新增资产
            </button>
            <button onClick={props.onGenerate} className="inline-flex items-center gap-2 rounded-card bg-teal px-4 py-2 font-semibold text-white">
              <Wand2 size={16} />
              自动生成资产
            </button>
          </div>
        }
      />
      <div className="grid gap-5 p-5">
        {assetTypes.map((type) => (
          <section key={type}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ink">{assetLabels[type]}</h3>
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-muted">{props.groupedAssets[type]?.length || 0}</span>
            </div>
            {props.groupedAssets[type]?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {props.groupedAssets[type].map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => props.onEdit(asset)}
                    className={cn(
                      "rounded-card border border-line bg-white p-3 text-left transition hover:border-teal/40 hover:shadow-work",
                      asset.imageUrl ? "grid grid-cols-[76px_1fr] gap-4" : "block"
                    )}
                  >
                    {asset.imageUrl && (
                      <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-card bg-paper">
                        <img src={asset.imageUrl} alt={asset.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-semibold text-ink">{asset.name}</h4>
                        <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">{asset.status}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{asset.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-line bg-paper px-4 py-6 text-sm text-muted">暂无{assetLabels[type]}资产</div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function StoryboardStep(props: {
  storyboards: StoryboardRecord[];
  latestReview?: ReviewReport;
  mediumConfirmed: boolean;
  canUseVideo: boolean;
  onGenerate: () => void;
  onReview: () => void;
  onConfirmMedium: () => void;
  onEnterVideo: () => void;
  onEdit: (storyboard: StoryboardRecord) => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <SectionHeader
        icon={Clapperboard}
        eyebrow="Step 03"
        title="分镜打造"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={props.onGenerate} className="inline-flex items-center gap-2 rounded-card bg-teal px-4 py-2 font-semibold text-white">
              <Wand2 size={16} />
              自动生成分镜
            </button>
            <button onClick={props.onReview} className="inline-flex items-center gap-2 rounded-card border border-line bg-white px-4 py-2 font-semibold text-ink">
              <ShieldCheck size={16} />
              运行审查
            </button>
            {props.latestReview?.riskLevel === "medium" && !props.mediumConfirmed && (
              <button onClick={props.onConfirmMedium} className="rounded-card bg-amber px-4 py-2 font-semibold text-ink">
                确认中风险
              </button>
            )}
            <button
              onClick={props.onEnterVideo}
              disabled={!props.canUseVideo}
              className="inline-flex items-center gap-2 rounded-card bg-ink px-4 py-2 font-semibold text-white"
            >
              <Play size={16} />
              进入视频生成
            </button>
          </div>
        }
      />
      <div className="p-5">
        {props.latestReview && <ReviewBanner review={props.latestReview} />}
        {props.storyboards.length ? (
          <div className="mt-4 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[960px] border-collapse bg-white text-sm">
              <thead className="bg-paper text-left text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-3">镜头</th>
                  <th className="px-4 py-3">场景</th>
                  <th className="px-4 py-3">画面描述</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">台词</th>
                  <th className="px-4 py-3">运镜</th>
                  <th className="px-4 py-3">时长</th>
                  <th className="px-4 py-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {props.storyboards.map((shot) => (
                  <tr key={shot.id} onClick={() => props.onEdit(shot)} className="cursor-pointer border-t border-line hover:bg-paper/70">
                    <td className="px-4 py-3 font-semibold text-ink">#{shot.shotNo}</td>
                    <td className="px-4 py-3">{shot.sceneName}</td>
                    <td className="max-w-[280px] px-4 py-3 leading-6 text-muted">{shot.visualDescription}</td>
                    <td className="px-4 py-3">{Array.isArray(shot.charactersJson) ? shot.charactersJson.join("、") : "未设定"}</td>
                    <td className="max-w-[220px] px-4 py-3 leading-6 text-muted">{shot.dialogue}</td>
                    <td className="px-4 py-3">{shot.cameraMovement}</td>
                    <td className="px-4 py-3">{shot.durationSeconds}s</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-teal/10 px-2 py-1 text-xs font-semibold text-teal">{shot.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Clapperboard} title="暂无分镜" text="可从剧本和资产自动生成结构化镜头列表。" />
        )}
      </div>
    </div>
  );
}

function VideoStep(props: {
  storyboards: StoryboardRecord[];
  canUseVideo: boolean;
  latestReview?: ReviewReport;
  onReview: () => void;
  onGenerateImages: () => void;
  onGenerateVideos: () => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <SectionHeader
        icon={Film}
        eyebrow="Step 04"
        title="视频生成"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={props.onReview} className="inline-flex items-center gap-2 rounded-card border border-line bg-white px-4 py-2 font-semibold text-ink">
              <ShieldCheck size={16} />
              复审
            </button>
            <button
              onClick={props.onGenerateImages}
              disabled={!props.canUseVideo}
              className="inline-flex items-center gap-2 rounded-card bg-teal px-4 py-2 font-semibold text-white"
            >
              <ImageIcon size={16} />
              生成图片
            </button>
            <button
              onClick={props.onGenerateVideos}
              disabled={!props.canUseVideo}
              className="inline-flex items-center gap-2 rounded-card bg-ink px-4 py-2 font-semibold text-white"
            >
              <Play size={16} />
              生成视频
            </button>
          </div>
        }
      />
      <div className="grid gap-4 p-5">
        {!props.canUseVideo && props.latestReview && <ReviewBanner review={props.latestReview} />}
        {props.storyboards.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {props.storyboards.map((shot) => (
              <article key={shot.id} className="overflow-hidden rounded-card border border-line bg-white">
                <div className="mx-auto aspect-[9/16] w-full max-w-[280px] bg-ink">
                  {shot.videoUrl ? (
                    <video src={shot.videoUrl} controls className="h-full w-full bg-black object-contain" />
                  ) : shot.imageUrl ? (
                    <img src={shot.imageUrl} alt={shot.sceneName} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/55">待生成图片</div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="min-w-[12rem] flex-1 text-base font-semibold leading-7 text-ink sm:text-lg">#{shot.shotNo} {shot.sceneName}</h3>
                    <span className="inline-flex rounded-full bg-paper px-2 py-1 text-xs font-semibold text-muted">{shot.status}</span>
                  </div>
                  <p className="text-sm leading-6 text-muted">{shot.visualDescription}</p>
                  <div className="rounded-card bg-paper p-3 text-sm">
                    <p className="font-semibold text-ink">视频片段</p>
                    <p className="mt-1 break-all text-muted">{shot.videoUrl ? "真实 MP4 已生成，可在上方播放" : "尚未生成"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={Film} title="暂无可生成镜头" text="分镜完成并通过审查后，视频任务会写入 generation_tasks。" />
        )}
      </div>
    </div>
  );
}

function EditStep(props: { storyboards: StoryboardRecord[]; exports: ExportRecord[]; onExport: () => void }) {
  const readyClips = props.storyboards.filter((shot) => shot.videoUrl);
  const latestExport = props.exports[0];
  return (
    <div className="panel overflow-hidden">
      <SectionHeader
        icon={Scissors}
        eyebrow="Step 05"
        title="剪辑修正"
        actions={
          <button onClick={props.onExport} className="inline-flex items-center gap-2 rounded-card bg-ink px-4 py-2 font-semibold text-white">
            <Download size={16} />
            合成并导出
          </button>
        }
      />
      <div className="grid gap-5 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-card border border-line bg-ink">
            {latestExport?.fileUrl ? (
              <div className="flex justify-center bg-black p-4">
                <video
                  src={latestExport.fileUrl}
                  controls
                  className="w-auto max-w-full bg-black object-contain"
                  style={{ height: "min(72vh, 680px)" }}
                />
              </div>
            ) : (
              <div className="mx-auto flex aspect-[9/16] w-full max-w-[380px] items-center justify-center text-center text-white">
                <div>
                  <Play className="mx-auto mb-3 text-amber" size={42} />
                  <p className="font-semibold">成片预览</p>
                  <p className="mt-1 text-sm text-white/60">{readyClips.length} 个真实视频片段可合成</p>
                </div>
              </div>
            )}
            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {props.storyboards.map((shot) => (
                  <div key={shot.id} className="min-w-[132px] rounded-card bg-white/8 p-3 text-white">
                    <p className="text-sm font-semibold">#{shot.shotNo}</p>
                    <p className="mt-1 truncate text-xs text-white/58">{shot.sceneName}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <h3 className="font-semibold text-ink">成片配置</h3>
            <div className="mt-4 space-y-3 text-sm text-muted">
              {["智能字幕", "配音归一", "转场优化", "封面生成"].map((item) => (
                <label key={item} className="flex items-center justify-between rounded-card bg-paper px-3 py-2">
                  <span>{item}</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal" />
                </label>
              ))}
            </div>
          </div>
        </div>

        <section>
          <h3 className="mb-3 font-semibold text-ink">导出记录</h3>
          {props.exports.length ? (
            <div className="grid gap-3">
              {props.exports.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{item.fileUrl}</p>
                    <p className="mt-1 text-muted">{formatDate(item.createdAt)} · {item.format} · {item.status}</p>
                  </div>
                  <span className="rounded-full bg-teal/10 px-3 py-1 font-semibold text-teal">已记录</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-line bg-paper px-4 py-6 text-sm text-muted">暂无导出记录</div>
          )}
        </section>
      </div>
    </div>
  );
}

function RightPanel(props: {
  project: ProjectBundle;
  tasks: GenerationTask[];
  activeTasks: GenerationTask[];
  latestReview?: ReviewReport;
}) {
  return (
    <aside className="space-y-4">
      <div className="panel p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-ink">项目参数</h2>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-muted">{props.project.creationMode}</span>
        </div>
        <div className="grid gap-3 text-sm">
          {[
            ["类型", props.project.type],
            ["画幅", props.project.aspectRatio],
            ["目标时长", props.project.durationTarget],
            ["风格", props.project.stylePreset],
            ["更新", formatDate(props.project.updatedAt)]
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-card bg-paper px-3 py-2">
              <span className="text-muted">{label}</span>
              <span className="font-semibold text-ink">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-ink">生成任务</h2>
          <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-semibold text-ink">{props.activeTasks.length} 运行中</span>
        </div>
        <div className="max-h-[360px] space-y-3 overflow-y-auto scroll-thin pr-1">
          {props.tasks.length ? (
            props.tasks.map((task) => <TaskItem key={task.id} task={task} />)
          ) : (
            <div className="rounded-card border border-dashed border-line bg-paper px-4 py-6 text-sm text-muted">暂无任务记录</div>
          )}
        </div>
      </div>

      <div className="panel p-4">
        <h2 className="mb-4 font-semibold text-ink">审查结果</h2>
        {props.latestReview ? (
          <ReviewBanner review={props.latestReview} compact />
        ) : (
          <div className="rounded-card border border-dashed border-line bg-paper px-4 py-6 text-sm text-muted">尚未运行审查门禁</div>
        )}
      </div>
    </aside>
  );
}

function TaskItem({ task }: { task: GenerationTask }) {
  const statusColor = task.status === "completed" ? "bg-teal" : task.status === "failed" ? "bg-coral" : "bg-amber";
  return (
    <div className="rounded-card border border-line bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{taskLabels[task.taskType] || task.taskType}</p>
          <p className="mt-0.5 text-xs text-muted">{formatDate(task.createdAt)} · {task.provider}</p>
        </div>
        <span className="rounded-full bg-paper px-2 py-1 text-xs font-semibold text-muted">{task.status}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paper">
        <div className={cn("h-full transition-all", statusColor)} style={{ width: `${task.progress}%` }} />
      </div>
      {task.errorMessage && <p className="mt-2 text-xs text-coral">{task.errorMessage}</p>}
    </div>
  );
}

function ReviewBanner({ review, compact = false }: { review: ReviewReport; compact?: boolean }) {
  const color = review.riskLevel === "low" ? "teal" : review.riskLevel === "medium" ? "amber" : "coral";
  const riskLevelLabel = review.riskLevel === "low" ? "低风险" : review.riskLevel === "medium" ? "中风险" : "高风险";
  const issues = Array.isArray(review.issuesJson) ? review.issuesJson : [];
  const suggestions = Array.isArray(review.suggestionsJson) ? review.suggestionsJson : [];
  return (
    <div
      className={cn(
        "rounded-card border px-4 py-3",
        color === "teal" && "border-teal/30 bg-teal/10",
        color === "amber" && "border-amber/40 bg-amber/15",
        color === "coral" && "border-coral/30 bg-coral/10"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {review.riskLevel === "low" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="font-semibold text-ink">评分 {review.score} · {riskLevelLabel}</span>
        </div>
        <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
      </div>
      {!compact && (
        <div className="mt-3 grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-ink">问题</p>
            {issues.map((item, index) => (
              <p key={index}>{String(item)}</p>
            ))}
          </div>
          <div>
            <p className="mb-1 font-semibold text-ink">建议</p>
            {suggestions.map((item, index) => (
              <p key={index}>{String(item)}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Film; title: string; text: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-card border border-dashed border-line bg-paper px-5 text-center">
      <Icon className="text-teal" size={42} />
      <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}

function AssetModal(props: { asset: AssetRecord; projectId: string; onClose: () => void; onSaved: () => void }) {
  const [asset, setAsset] = useState(props.asset);
  const [error, setError] = useState("");

  async function save() {
    try {
      if (asset.id) {
        await api(`/api/assets/${asset.id}`, { method: "PUT", body: JSON.stringify(asset) });
      } else {
        await api(`/api/projects/${props.projectId}/assets`, { method: "POST", body: JSON.stringify(asset) });
      }
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function remove() {
    if (!asset.id) {
      props.onClose();
      return;
    }
    try {
      await api(`/api/assets/${asset.id}`, { method: "DELETE" });
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <Modal title={asset.id ? "编辑资产" : "新增资产"} onClose={props.onClose}>
      <div className="grid gap-4">
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">类型</span>
          <select value={asset.assetType} onChange={(event) => setAsset({ ...asset, assetType: event.target.value })}>
            {Object.entries(assetLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">名称</span>
          <input value={asset.name} onChange={(event) => setAsset({ ...asset, name: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">描述</span>
          <textarea value={asset.description} onChange={(event) => setAsset({ ...asset, description: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Prompt</span>
          <textarea value={asset.prompt} onChange={(event) => setAsset({ ...asset, prompt: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">图片 URL</span>
          <input value={asset.imageUrl || ""} onChange={(event) => setAsset({ ...asset, imageUrl: event.target.value })} />
        </label>
        {error && <div className="rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
        <div className="flex justify-between gap-3">
          <button onClick={() => void remove()} className="inline-flex items-center gap-2 rounded-card border border-coral/30 px-4 py-2 font-semibold text-coral">
            <Trash2 size={16} />
            删除
          </button>
          <button onClick={() => void save()} className="rounded-card bg-ink px-5 py-2 font-semibold text-white">
            保存资产
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StoryboardModal(props: { storyboard: StoryboardRecord; onClose: () => void; onSaved: () => void }) {
  const [shot, setShot] = useState(props.storyboard);
  const [error, setError] = useState("");

  async function save() {
    try {
      await api(`/api/storyboards/${shot.id}`, { method: "PUT", body: JSON.stringify(shot) });
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function remove() {
    try {
      await api(`/api/storyboards/${shot.id}`, { method: "DELETE" });
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <Modal title={`编辑分镜 #${shot.shotNo}`} onClose={props.onClose}>
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">镜头编号</span>
            <input type="number" value={shot.shotNo} onChange={(event) => setShot({ ...shot, shotNo: Number(event.target.value) })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">时长秒数</span>
            <input
              type="number"
              value={shot.durationSeconds}
              onChange={(event) => setShot({ ...shot, durationSeconds: Number(event.target.value) })}
            />
          </label>
        </div>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">场景</span>
          <input value={shot.sceneName} onChange={(event) => setShot({ ...shot, sceneName: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">画面描述</span>
          <textarea value={shot.visualDescription} onChange={(event) => setShot({ ...shot, visualDescription: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">台词</span>
          <textarea value={shot.dialogue} onChange={(event) => setShot({ ...shot, dialogue: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">运镜</span>
          <input value={shot.cameraMovement} onChange={(event) => setShot({ ...shot, cameraMovement: event.target.value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">图片 Prompt</span>
          <textarea value={shot.imagePrompt} onChange={(event) => setShot({ ...shot, imagePrompt: event.target.value })} />
        </label>
        {error && <div className="rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
        <div className="flex justify-between gap-3">
          <button onClick={() => void remove()} className="inline-flex items-center gap-2 rounded-card border border-coral/30 px-4 py-2 font-semibold text-coral">
            <Trash2 size={16} />
            删除
          </button>
          <button onClick={() => void save()} className="rounded-card bg-ink px-5 py-2 font-semibold text-white">
            保存分镜
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white shadow-work">
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-card border border-line p-2 text-muted hover:text-ink" aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
