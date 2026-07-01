"use client";

import { FormEvent, useState } from "react";
import { saveAdminSession } from "@/lib/admin-client";

type LoginMode = "password" | "otp" | "forgot";

interface AdminLoginProps {
  onSuccess: () => void;
  smtpConfigured: boolean;
}

export function AdminLogin({ onSuccess, smtpConfigured }: AdminLoginProps) {
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(next: LoginMode) {
    setMode(next);
    setMessage("");
    setOtpSent(false);
    setResetSent(false);
    setOtpCode("");
    setResetCode("");
    setNewPassword("");
  }

  async function handlePasswordLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "로그인 실패");
      return;
    }

    saveAdminSession(data.token, data.admin);
    onSuccess();
  }

  async function handleSendOtp() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "login" }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "메일 발송 실패");
      return;
    }

    setOtpSent(true);
    setMessage(data.message);
  }

  async function handleOtpVerify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otpCode, purpose: "login" }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "인증 실패");
      return;
    }

    saveAdminSession(data.token, data.admin);
    onSuccess();
  }

  async function handleSendResetCode() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "reset" }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "메일 발송 실패");
      return;
    }

    setResetSent(true);
    setMessage(data.message);
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: resetCode,
        newPassword,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "재설정 실패");
      return;
    }

    setPassword("");
    setMessage("비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.");
    switchMode("password");
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-16">
      <div className="w-full space-y-4 rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-bold">
          {mode === "forgot" ? "비밀번호 재설정" : "관리자 로그인"}
        </h1>

        {mode === "forgot" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              등록된 관리자 이메일로 인증 코드를 보내드립니다.
            </p>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2"
            />
            <form onSubmit={handleResetPassword} className="space-y-4">
              {!resetSent ? (
                <button
                  type="button"
                  onClick={handleSendResetCode}
                  disabled={loading || !email || !smtpConfigured}
                  className="w-full rounded-lg border border-accent py-2 text-accent disabled:opacity-40"
                >
                  재설정 코드 메일 받기
                </button>
              ) : (
                <>
                  <input
                    value={resetCode}
                    onChange={(event) => setResetCode(event.target.value)}
                    placeholder="6자리 인증 코드"
                    maxLength={6}
                    className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-center text-lg tracking-widest"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="새 비밀번호 (8자+)"
                    className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-accent py-2 font-semibold text-background"
                  >
                    비밀번호 재설정
                  </button>
                  <button
                    type="button"
                    onClick={handleSendResetCode}
                    className="w-full text-sm text-muted"
                  >
                    코드 다시 받기
                  </button>
                </>
              )}
            </form>
            <button
              type="button"
              onClick={() => switchMode("password")}
              className="w-full text-sm text-muted hover:text-foreground"
            >
              ← 로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchMode("password")}
                className={`flex-1 rounded-lg py-2 text-sm ${
                  mode === "password"
                    ? "bg-accent text-background"
                    : "border border-border"
                }`}
              >
                비밀번호
              </button>
              <button
                type="button"
                onClick={() => switchMode("otp")}
                disabled={!smtpConfigured}
                className={`flex-1 rounded-lg py-2 text-sm ${
                  mode === "otp"
                    ? "bg-accent text-background"
                    : "border border-border"
                } disabled:opacity-40`}
              >
                이메일 인증
              </button>
            </div>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2"
            />

            {mode === "password" ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호"
                  className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-accent py-2 font-semibold text-background"
                >
                  로그인
                </button>
                {smtpConfigured && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="w-full text-sm text-muted hover:text-accent"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                )}
              </form>
            ) : (
              <form onSubmit={handleOtpVerify} className="space-y-4">
                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || !email}
                    className="w-full rounded-lg border border-accent py-2 text-accent"
                  >
                    인증 코드 메일 받기
                  </button>
                ) : (
                  <>
                    <input
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      placeholder="6자리 인증 코드"
                      maxLength={6}
                      className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-center text-lg tracking-widest"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-accent py-2 font-semibold text-background"
                    >
                      인증하고 로그인
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="w-full text-sm text-muted"
                    >
                      코드 다시 받기
                    </button>
                  </>
                )}
              </form>
            )}
          </>
        )}

        {message && (
          <p
            className={`text-sm ${
              message.includes("발송") || message.includes("변경")
                ? "text-accent"
                : "text-danger"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
