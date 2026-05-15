import Link from "next/link";
import { ArrowRight, Blocks, CheckCircle2, Clapperboard, Database, ShieldCheck, Sparkles } from "lucide-react";
import ParticleBackground from "@/components/particle-background";

const steps = [
  { title: "剧本创作", text: "从创意输入到结构化剧本，自动梳理人物设定、剧情节奏、对白和分场说明。" },
  { title: "资产管理", text: "统一管理角色、场景、道具、音频和风格资产，确保素材可追踪、可复用、可交付。" },
  { title: "分镜打造", text: "自动拆解镜号、时长、角色、台词、画面内容和运镜方案，形成可执行分镜表。" },
  { title: "视频生成", text: "基于分镜批量生成竖屏视频片段，任务进度、生成状态和结果文件实时同步。" },
  { title: "剪辑修正", text: "完成成片合成、预览、导出与版本记录，让内容生产进入标准化交付流程。" }
];

const capabilities = [
  { icon: ShieldCheck, title: "审查门禁", text: "在视频生成前完成合规、剧情、衔接、一致性和可执行性检查。" },
  { icon: Database, title: "项目数据中台", text: "项目、剧本、资产、分镜、生成任务、审查报告和导出记录统一沉淀。" },
  { icon: Blocks, title: "多模型生产引擎", text: "串联文本生成、视觉资产、视频片段和成片导出，支撑完整内容生产链路。" }
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <ParticleBackground />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <img src="/assets/images/logo/logo-latest.png" alt="AnimeFlow" className="brand-logo" />
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="rounded-card border border-line bg-white px-4 py-2 text-sm font-medium text-ink">
            登录
          </Link>
          <Link href="/register" className="rounded-card bg-ink px-4 py-2 text-sm font-medium text-white">
            注册
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 pb-10 pt-4 lg:grid-cols-[1fr_520px] lg:items-center">
        <div className="py-8">
          <div className="glow-on-hover mb-5 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-sm font-medium text-ink">
            <Sparkles size={16} />
            AI 漫剧生产平台
          </div>
          <h1 className="max-w-4xl bg-gradient-to-r from-white via-amber to-white bg-clip-text text-4xl font-semibold leading-tight tracking-normal text-transparent md:text-6xl">
            从一个创意到可交付成片的 AI 内容生产工作台
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            AnimeFlow 将需求输入、剧本创作、资产管理、分镜设计、创意审查、视频生成和剪辑导出纳入同一套可追踪生产系统，帮助团队稳定完成从策划到交付的全流程制作。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="border-glow glow-on-hover inline-flex items-center gap-2 rounded-card bg-ink px-5 py-3 font-semibold text-white">
              开始创作
              <ArrowRight size={18} />
            </Link>
            <Link href="/dashboard" className="border-glow inline-flex items-center gap-2 rounded-card border border-line bg-white px-5 py-3 font-semibold text-ink">
              进入工作台
            </Link>
          </div>
        </div>

        <div className="border-glow panel overflow-hidden">
          <div className="border-b border-line bg-ink px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Production Workspace</p>
                <h2 className="mt-1 text-xl font-semibold">专业级 AI 内容生产工作台</h2>
                <p className="mt-1 text-sm text-white/65">剧本、资产、分镜、审查、生成、导出全流程就绪</p>
              </div>
              <Clapperboard className="text-amber" />
            </div>
          </div>
          <div className="clip-grid grid gap-4 p-5">
            {steps.map((step, index) => (
              <div key={step.title} className="border-glow grid grid-cols-[44px_1fr] gap-3 rounded-card border border-line bg-white p-4">
                <div className="glow-on-hover flex h-11 w-11 items-center justify-center rounded-card bg-teal/10 text-sm font-bold text-teal">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 pb-14 md:grid-cols-3">
        {capabilities.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="border-glow panel p-5">
              <div className="glow-on-hover mb-4 flex h-10 w-10 items-center justify-center rounded-card bg-coral/10 text-coral">
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="relative z-10 border-t border-line bg-white/75">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-8 md:grid-cols-3">
          {["审查可控", "进度可追踪", "成片可交付"].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 className="text-teal" size={22} />
              <span className="font-semibold text-ink">{item}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
