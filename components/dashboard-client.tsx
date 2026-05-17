"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Film, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { CinematicAppBackdrop } from "@/components/cinematic-app-backdrop";
import { api, formatDate } from "@/lib/client";

type Project = {
  id: string;
  title: string;
  description: string;
  type: string;
  aspectRatio: string;
  durationTarget: string;
  stylePreset: string;
  currentStep: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assets: number;
    storyboards: number;
    generationTasks: number;
    exports: number;
  };
};

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
  isAdmin: boolean;
};

const stepLabel: Record<string, string> = {
  script: "剧本创作",
  assets: "资产管理",
  storyboard: "分镜打造",
  video: "视频生成",
  edit: "剪辑修正"
};

export function DashboardClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProjects() {
    try {
      setLoading(true);
      const [projectData, meData] = await Promise.all([
        api<{ projects: Project[] }>("/api/projects"),
        api<{ user: CurrentUser }>("/api/me")
      ]);
      setProjects(projectData.projects);
      setUser(meData.user);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      if (message.includes("登录") || message.includes("sign in")) {
        router.push("/login");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(id: string) {
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  return (
    <main className="cinematic-app-page dashboard-cinematic-page min-h-screen px-6 py-6">
      <CinematicAppBackdrop variant="immersive" />
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <img src="/assets/images/logo/logo-latest.png" alt="AnimeFlow 工作台" className="brand-logo" />
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {user?.isAdmin && (
            <Link href="/admin/usage" className="inline-flex items-center gap-2 rounded-card border border-line bg-white px-4 py-2 font-semibold text-ink">
              <ShieldCheck size={18} />
              用量管理
            </Link>
          )}
          <Link href="/create" className="inline-flex items-center gap-2 rounded-card bg-ink px-4 py-2 font-semibold text-white">
            <Plus size={18} />
            新建项目
          </Link>
        </div>
      </header>

      <section className="mx-auto mt-8 max-w-7xl">
        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal">Projects</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-ink">项目列表</h1>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-card border border-line bg-paper px-4 py-3">
                <p className="text-2xl font-semibold text-ink">{projects.length}</p>
                <p className="text-xs text-muted">项目</p>
              </div>
              <div className="rounded-card border border-line bg-paper px-4 py-3">
                <p className="text-2xl font-semibold text-ink">
                  {projects.reduce((sum, item) => sum + (item._count?.generationTasks || 0), 0)}
                </p>
                <p className="text-xs text-muted">任务</p>
              </div>
              <div className="rounded-card border border-line bg-paper px-4 py-3">
                <p className="text-2xl font-semibold text-ink">{projects.reduce((sum, item) => sum + (item._count?.exports || 0), 0)}</p>
                <p className="text-xs text-muted">导出</p>
              </div>
            </div>
          </div>

          {error && <div className="mx-6 mt-5 rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}

          {loading ? (
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-48 animate-pulse rounded-card bg-slate-100" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center">
              <Film className="text-teal" size={44} />
              <h2 className="mt-4 text-2xl font-semibold text-ink">还没有项目</h2>
              <p className="mt-2 max-w-lg leading-7 text-muted">创建第一个作品后，可以进入五步工作流并持久化保存每个阶段的数据。</p>
              <Link href="/create" className="mt-6 inline-flex items-center gap-2 rounded-card bg-ink px-5 py-3 font-semibold text-white">
                <Plus size={18} />
                新建项目
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <article key={project.id} className="rounded-card border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-work">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
                        <span className="status-dot bg-teal" />
                        {project.status}
                      </div>
                      <h2 className="text-xl font-semibold text-ink">{project.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{project.description || "AI 漫剧生产项目"}</p>
                    </div>
                    <button
                      onClick={() => void deleteProject(project.id)}
                      className="rounded-card border border-line p-2 text-muted transition hover:border-coral/40 hover:text-coral"
                      aria-label="删除项目"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-card bg-paper p-3">
                      <p className="text-muted">当前步骤</p>
                      <p className="mt-1 font-semibold text-ink">{stepLabel[project.currentStep] || project.currentStep}</p>
                    </div>
                    <div className="rounded-card bg-paper p-3">
                      <p className="text-muted">画幅/时长</p>
                      <p className="mt-1 font-semibold text-ink">
                        {project.aspectRatio} · {project.durationTarget}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-2">
                      <CalendarClock size={16} />
                      {formatDate(project.updatedAt)}
                    </span>
                    <Link
                      href={`/projects/${project.id}/workspace`}
                      className="inline-flex items-center gap-1 font-semibold text-ink hover:text-teal"
                    >
                      打开
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
