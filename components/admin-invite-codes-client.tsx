"use client";

import { useEffect, useState } from "react";
import { Ban, Copy, KeyRound, RefreshCcw, Sparkles } from "lucide-react";
import { api, formatDate } from "@/lib/client";

type InviteCodeUser = {
  id: string;
  email: string;
  nickname: string;
};

type InviteCodeRow = {
  id: string;
  codePrefix: string;
  code?: string | null;
  status: string;
  targetEmail: string | null;
  note: string;
  createdAt: string;
  usedAt: string | null;
  usedEmail: string | null;
  createdBy: InviteCodeUser | null;
  usedBy: InviteCodeUser | null;
};

function statusLabel(status: string) {
  if (status === "unused") {
    return "未使用";
  }
  if (status === "used") {
    return "已使用";
  }
  if (status === "revoked") {
    return "已撤销";
  }
  return status;
}

function statusClass(status: string) {
  if (status === "unused") {
    return "border-teal/30 bg-teal/10 text-teal";
  }
  if (status === "used") {
    return "border-amber/40 bg-amber/15 text-ink";
  }
  return "border-coral/30 bg-coral/10 text-coral";
}

function userLabel(user: InviteCodeUser | null, fallback?: string | null) {
  if (user) {
    return user.nickname ? `${user.nickname} (${user.email})` : user.email;
  }
  return fallback || "-";
}

export function AdminInviteCodesClient() {
  const [inviteCodes, setInviteCodes] = useState<InviteCodeRow[]>([]);
  const [createdCodes, setCreatedCodes] = useState<InviteCodeRow[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [targetEmail, setTargetEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadInviteCodes() {
    try {
      setLoading(true);
      const data = await api<{ inviteCodes: InviteCodeRow[] }>("/api/admin/invite-codes");
      setInviteCodes(data.inviteCodes);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载邀请码失败");
    } finally {
      setLoading(false);
    }
  }

  async function createInviteCodes() {
    try {
      setCreating(true);
      setMessage("");
      setError("");
      const data = await api<{ inviteCodes: InviteCodeRow[] }>("/api/admin/invite-codes", {
        method: "POST",
        body: JSON.stringify({
          quantity,
          targetEmail,
          note
        })
      });
      setCreatedCodes(data.inviteCodes);
      setMessage(`已生成 ${data.inviteCodes.length} 个一次性邀请码，请及时复制。`);
      await loadInviteCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成邀请码失败");
    } finally {
      setCreating(false);
    }
  }

  async function revokeInviteCode(id: string) {
    try {
      setSavingId(id);
      setMessage("");
      setError("");
      const data = await api<{ inviteCode: InviteCodeRow }>("/api/admin/invite-codes", {
        method: "PATCH",
        body: JSON.stringify({
          inviteCodeId: id,
          action: "revoke"
        })
      });
      setInviteCodes((items) => items.map((item) => (item.id === id ? data.inviteCode : item)));
      setMessage("邀请码已撤销。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "撤销邀请码失败");
    } finally {
      setSavingId("");
    }
  }

  async function copyCode(code?: string | null) {
    if (!code || !navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(code);
    setMessage("邀请码已复制。");
  }

  useEffect(() => {
    void loadInviteCodes();
  }, []);

  const unusedCount = inviteCodes.filter((item) => item.status === "unused").length;
  const usedCount = inviteCodes.filter((item) => item.status === "used").length;
  const revokedCount = inviteCodes.filter((item) => item.status === "revoked").length;

  return (
    <section className="mx-auto mt-6 max-w-7xl">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="panel p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="text-teal" size={20} />
            <h2 className="font-semibold text-ink">邀请码管理</h2>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">生成数量</span>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">绑定邮箱，可留空</span>
              <input value={targetEmail} onChange={(event) => setTargetEmail(event.target.value)} placeholder="creator@example.com" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">备注，可留空</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="发放对象或用途" />
            </label>
          </div>

          <button
            onClick={() => void createInviteCodes()}
            disabled={creating}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-card bg-ink px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            <Sparkles size={16} />
            {creating ? "生成中..." : "生成一次性邀请码"}
          </button>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-card border border-line bg-paper p-3">
              <p className="font-semibold text-ink">{unusedCount}</p>
              <p className="mt-1 text-xs text-muted">未使用</p>
            </div>
            <div className="rounded-card border border-line bg-paper p-3">
              <p className="font-semibold text-ink">{usedCount}</p>
              <p className="mt-1 text-xs text-muted">已使用</p>
            </div>
            <div className="rounded-card border border-line bg-paper p-3">
              <p className="font-semibold text-ink">{revokedCount}</p>
              <p className="mt-1 text-xs text-muted">已撤销</p>
            </div>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-semibold text-ink">使用记录</h2>
              <p className="mt-1 text-sm text-muted">未使用的邀请码可在列表复制；使用或撤销后只保留短标识和记录。</p>
            </div>
            <button onClick={() => void loadInviteCodes()} className="inline-flex items-center gap-2 rounded-card border border-line bg-white px-3 py-2 font-semibold text-ink">
              <RefreshCcw size={15} />
              刷新
            </button>
          </div>

          {(error || message) && (
            <div className="space-y-3 px-5 pt-4">
              {error && <div className="rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
              {message && <div className="rounded-card border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-teal">{message}</div>}
            </div>
          )}

          {createdCodes.length > 0 && (
            <div className="mx-5 mt-4 rounded-card border border-amber/30 bg-amber/10 p-4">
              <p className="font-semibold text-ink">本次新生成的邀请码</p>
              <div className="mt-3 grid gap-2">
                {createdCodes.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-white px-3 py-2">
                    <code className="break-all text-sm font-semibold text-ink">{item.code}</code>
                    <button onClick={() => void copyCode(item.code)} className="inline-flex items-center gap-2 rounded-card border border-line px-3 py-2 text-sm font-semibold text-ink">
                      <Copy size={14} />
                      复制
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-6 text-muted">正在加载邀请码...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-line bg-paper text-muted">
                  <tr>
                    <th className="px-4 py-3">邀请码</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">绑定邮箱</th>
                    <th className="px-4 py-3">备注</th>
                    <th className="px-4 py-3">创建人</th>
                    <th className="px-4 py-3">使用人</th>
                    <th className="px-4 py-3">时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {inviteCodes.map((item) => (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{item.codePrefix}</p>
                        {item.code ? (
                          <div className="mt-2 flex max-w-[300px] flex-wrap items-center gap-2">
                            <code className="break-all rounded-card bg-paper px-2 py-1 text-xs font-semibold text-ink">{item.code}</code>
                            <button
                              onClick={() => void copyCode(item.code)}
                              className="inline-flex items-center gap-1 rounded-card border border-line px-2 py-1 text-xs font-semibold text-ink"
                            >
                              <Copy size={12} />
                              复制
                            </button>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-muted">{item.status === "unused" ? "旧记录无法恢复完整码" : "完整码已清除"}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink">{item.targetEmail || "通用"}</td>
                      <td className="max-w-[220px] px-4 py-3 text-muted">{item.note || "-"}</td>
                      <td className="px-4 py-3 text-muted">{userLabel(item.createdBy)}</td>
                      <td className="px-4 py-3 text-muted">{userLabel(item.usedBy, item.usedEmail)}</td>
                      <td className="px-4 py-3 text-muted">
                        <p>创建 {formatDate(item.createdAt)}</p>
                        {item.usedAt && <p className="mt-1">使用 {formatDate(item.usedAt)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === "unused" ? (
                          <button
                            onClick={() => void revokeInviteCode(item.id)}
                            disabled={savingId === item.id}
                            className="inline-flex items-center gap-2 rounded-card border border-coral/30 px-3 py-2 font-semibold text-coral disabled:opacity-50"
                          >
                            <Ban size={15} />
                            {savingId === item.id ? "撤销中..." : "撤销"}
                          </button>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {inviteCodes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted">
                        暂无邀请码记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
