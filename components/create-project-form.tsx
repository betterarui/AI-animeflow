"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { api } from "@/lib/client";

type ProjectResponse = {
  project: {
    id: string;
  };
};

export function CreateProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("我的创意短片");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("short");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [durationTarget, setDurationTarget] = useState("30-60s");
  const [stylePreset, setStylePreset] = useState("电影感国漫");
  const [creationMode, setCreationMode] = useState("AI 协作");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api<ProjectResponse>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          type,
          aspectRatio,
          durationTarget,
          stylePreset,
          creationMode
        })
      });
      router.push(`/projects/${data.project.id}/workspace`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      if (message.includes("登录")) {
        router.push("/login");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-6">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/dashboard" aria-label="AnimeFlow 工作台">
          <img src="/assets/images/logo/logo-latest.png" alt="AnimeFlow 工作台" className="brand-logo" />
        </Link>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-card border border-line bg-white px-4 py-2 font-semibold text-ink">
          <ArrowLeft size={18} />
          返回工作台
        </Link>
      </header>

      <section className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-card border border-line bg-white shadow-work">
        <div className="border-b border-line bg-ink px-8 py-7 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-card bg-amber text-ink">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-sm text-white/65">New Project</p>
              <h1 className="text-3xl font-semibold tracking-normal">新建 AnimeFlow 项目</h1>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-6 p-8 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink">项目名称</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink">项目描述</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">作品类型</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="series">漫剧剧集</option>
              <option value="short">短视频</option>
              <option value="trailer">预告片</option>
              <option value="education">科普动画</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">画幅比例</span>
            <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
              <option value="16:9">16:9 横屏</option>
              <option value="9:16">9:16 竖屏</option>
              <option value="1:1">1:1 方形</option>
              <option value="4:3">4:3 复古</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">目标时长</span>
            <select value={durationTarget} onChange={(event) => setDurationTarget(event.target.value)}>
              <option value="30-60s">30-60s</option>
              <option value="60-90s">60-90s</option>
              <option value="2-3min">2-3min</option>
              <option value="5min+">5min+</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">风格预设</span>
            <select value={stylePreset} onChange={(event) => setStylePreset(event.target.value)}>
              <option value="儿童反诈漫画短视频">儿童反诈漫画短视频</option>
              <option value="电影感国漫">电影感国漫</option>
              <option value="暖色治愈">暖色治愈</option>
              <option value="硬核科幻">硬核科幻</option>
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink">创作模式</span>
            <div className="grid gap-3 md:grid-cols-3">
              {["AI 协作", "导演控制", "快速成片"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCreationMode(mode)}
                  className={`rounded-card border px-4 py-3 text-left font-semibold ${
                    creationMode === mode ? "border-teal bg-teal/10 text-teal" : "border-line bg-white text-ink"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </label>

          {error && <div className="rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-2">{error}</div>}

          <div className="flex justify-end md:col-span-2">
            <button disabled={loading} className="rounded-card bg-ink px-6 py-3 font-semibold text-white">
              {loading ? "创建中..." : "创建并进入工作台"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
