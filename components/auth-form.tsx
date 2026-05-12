"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { api } from "@/lib/client";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [account, setAccount] = useState("demo@animeflow.local");
  const [nickname, setNickname] = useState("AnimeFlow 创作者");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api<{ user: unknown }>(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ account, email: account, password, nickname })
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "认证失败");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";
  const Icon = isLogin ? LogIn : UserPlus;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-card border border-line bg-white shadow-work lg:grid-cols-[420px_1fr]">
        <div className="bg-ink p-8 text-white">
          <Link href="/" className="flex items-center gap-3">
            <img src="/assets/images/logo/logo-latest.png" alt="AnimeFlow" className="brand-logo" />
          </Link>
          <div className="mt-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-card bg-amber text-ink">
              <Icon size={24} />
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">{isLogin ? "登录工作台" : "创建创作者账号"}</h1>
            <p className="mt-4 leading-7 text-white/72">
              进入项目管理、五步生产工作流、创意审查门禁和成片导出记录。
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-8 md:p-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal">
              {isLogin ? "Welcome Back" : "Create Account"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">{isLogin ? "继续你的 AI 漫剧项目" : "注册后立即开始创作"}</h2>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">邮箱或手机号</span>
              <input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="creator@animeflow.local" />
            </label>

            {!isLogin && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">昵称</span>
                <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="创作者昵称" />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="开发环境密码"
              />
            </label>
          </div>

          {error && <div className="mt-4 rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}

          <button
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-card bg-ink px-5 py-3 font-semibold text-white"
          >
            <Icon size={18} />
            {loading ? "处理中..." : isLogin ? "登录" : "注册"}
          </button>

          <p className="mt-5 text-center text-sm text-muted">
            {isLogin ? "还没有账号？" : "已有账号？"}
            <Link href={isLogin ? "/register" : "/login"} className="ml-2 font-semibold text-teal">
              {isLogin ? "去注册" : "去登录"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
