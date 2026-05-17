"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import { AdminInviteCodesClient } from "@/components/admin-invite-codes-client";
import { CinematicAppBackdrop } from "@/components/cinematic-app-backdrop";
import { api, formatDate } from "@/lib/client";

type AdminUser = {
  id: string;
  email: string;
  nickname: string;
  role: string;
  status: string;
  dailyQuota: number;
  usedToday: number;
  remainingToday: number | null;
  tasksToday: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
};

export function AdminUsageClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await api<{ users: AdminUser[] }>("/api/admin/users");
      setUsers(data.users);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(id: string, patch: Partial<AdminUser>) {
    setUsers((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function saveUser(user: AdminUser) {
    try {
      setSavingId(user.id);
      setMessage("");
      const data = await api<{ user: AdminUser }>("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: user.id,
          status: user.status,
          role: user.role,
          dailyQuota: user.dailyQuota
        })
      });
      setUsers((items) => items.map((item) => (item.id === user.id ? data.user : item)));
      setMessage("已保存用户配置");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingId("");
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const totalUsed = users.reduce((sum, user) => sum + user.usedToday, 0);
  const activeUsers = users.filter((user) => user.status === "active").length;

  return (
    <main className="cinematic-app-page admin-cinematic-page min-h-screen bg-paper px-5 py-6">
      <CinematicAppBackdrop variant="immersive" />
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-card border border-line bg-white p-2 text-muted hover:text-ink" aria-label="返回工作台">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal">Admin</p>
            <h1 className="text-2xl font-semibold text-ink">人员与用量管理</h1>
          </div>
        </div>
        <button onClick={() => void loadUsers()} className="rounded-card border border-line bg-white px-4 py-2 font-semibold text-ink">
          刷新
        </button>
      </header>

      <section className="mx-auto mt-6 grid max-w-7xl gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-sm text-muted">用户总数</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{users.length}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-muted">启用用户</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{activeUsers}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-muted">今日已用生成点数</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{totalUsed}</p>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl">
        {error && <div className="mb-4 rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
        {message && <div className="mb-4 rounded-card border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-teal">{message}</div>}

        <div className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-teal" size={20} />
              <h2 className="font-semibold text-ink">用户额度</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-muted">正在加载用户...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-line bg-paper text-muted">
                  <tr>
                    <th className="px-4 py-3">用户</th>
                    <th className="px-4 py-3">角色</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">每日额度</th>
                    <th className="px-4 py-3">今日用量</th>
                    <th className="px-4 py-3">项目</th>
                    <th className="px-4 py-3">注册时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{user.nickname || user.email}</p>
                        <p className="mt-1 text-xs text-muted">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select value={user.role} onChange={(event) => updateDraft(user.id, { role: event.target.value })}>
                          <option value="creator">creator</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select value={user.status} onChange={(event) => updateDraft(user.id, { status: event.target.value })}>
                          <option value="active">active</option>
                          <option value="suspended">suspended</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={user.dailyQuota}
                          onChange={(event) => updateDraft(user.id, { dailyQuota: Number(event.target.value) })}
                          className="w-28"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{user.usedToday} 点</p>
                        <p className="mt-1 text-xs text-muted">
                          {user.remainingToday === null ? "管理员不限额" : `剩余 ${user.remainingToday} 点`} / {user.tasksToday} 个任务
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink">{user.projectCount}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void saveUser(user)}
                          disabled={savingId === user.id}
                          className="inline-flex items-center gap-2 rounded-card bg-ink px-3 py-2 font-semibold text-white disabled:opacity-50"
                        >
                          <Save size={15} />
                          {savingId === user.id ? "保存中" : "保存"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <AdminInviteCodesClient />
    </main>
  );
}
