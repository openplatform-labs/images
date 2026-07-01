"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  isActive: boolean;
}

interface AdminSettingsProps {
  currentEmail: string;
}

export function AdminSettings({ currentEmail }: AdminSettingsProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");

  async function loadAdmins() {
    const response = await adminFetch("/api/admin/users");
    if (response.ok) setAdmins(await response.json());
  }

  useEffect(() => {
    void loadAdmins();
  }, []);

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    const response = await adminFetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json();
    setMessage(data.message ?? data.error);
    if (response.ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  async function handleAddAdmin(event: FormEvent) {
    event.preventDefault();
    const response = await adminFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newAdminEmail,
        password: newAdminPassword,
        name: newAdminName,
      }),
    });
    const data = await response.json();
    setMessage(data.error ?? `${newAdminEmail} 관리자 추가됨`);
    if (response.ok) {
      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminName("");
      await loadAdmins();
    }
  }

  async function handleDeactivate(id: number) {
    await adminFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    await loadAdmins();
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm">
          {message}
        </p>
      )}

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">비밀번호 변경</h2>
        <p className="mt-1 text-sm text-muted">
          로그인된 상태에서 비밀번호를 변경합니다. 비밀번호를 잊었다면 로그아웃 후
          로그인 화면에서 재설정하세요.
        </p>
        <form onSubmit={handleChangePassword} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="현재 비밀번호"
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="새 비밀번호 (8자+)"
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-accent py-2 text-sm text-background">
            변경
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">관리자 계정</h2>
        <form onSubmit={handleAddAdmin} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="email"
            value={newAdminEmail}
            onChange={(event) => setNewAdminEmail(event.target.value)}
            placeholder="이메일"
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={newAdminPassword}
            onChange={(event) => setNewAdminPassword(event.target.value)}
            placeholder="비밀번호"
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
          />
          <input
            value={newAdminName}
            onChange={(event) => setNewAdminName(event.target.value)}
            placeholder="이름 (선택)"
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-accent py-2 text-sm text-background">
            추가
          </button>
        </form>

        <ul className="mt-4 space-y-2">
          {admins.map((admin) => (
            <li
              key={admin.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>
                {admin.email}
                {admin.name && <span className="ml-2 text-muted">({admin.name})</span>}
                {!admin.isActive && (
                  <span className="ml-2 text-danger">비활성</span>
                )}
              </span>
              {admin.email !== currentEmail && admin.isActive && (
                <button
                  type="button"
                  onClick={() => handleDeactivate(admin.id)}
                  className="text-danger"
                >
                  비활성화
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
