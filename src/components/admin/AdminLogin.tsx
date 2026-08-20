"use client";

import { FormEvent, useState } from "react";
import { saveAdminSession } from "@/lib/admin-client";

interface AdminLoginProps {
  onSuccess: () => void;
  smtpConfigured: boolean;
  oktaConfigured: boolean;
  initialMessage?: string;
}

export function AdminLogin({
  onSuccess,
  smtpConfigured,
  oktaConfigured,
  initialMessage = "",
}: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-16">
      <div className="w-full space-y-4 rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-bold">관리자 로그인</h1>
        <p className="text-sm text-muted">
          Okta 또는 이메일 인증 코드로 로그인합니다.
        </p>

        {oktaConfigured && (
          <div className="space-y-3">
            <a
              href="/api/auth/okta/login"
              className="flex w-full items-center justify-center rounded-lg border border-border bg-surface-elevated py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
            >
              Okta로 로그인
            </a>
            {smtpConfigured && (
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" />
                또는 이메일 인증
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
          </div>
        )}

        {smtpConfigured ? (
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2"
            />

            <form onSubmit={handleOtpVerify} className="space-y-4">
              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || !email}
                  className="w-full rounded-lg border border-accent py-2 text-accent disabled:opacity-40"
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
          </div>
        ) : (
          !oktaConfigured && (
            <p className="text-sm text-danger">
              로그인 방법이 설정되지 않았습니다. Okta 또는 SMTP를 구성하세요.
            </p>
          )
        )}

        {message && (
          <p
            className={`text-sm ${
              message.includes("발송") ? "text-accent" : "text-danger"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
