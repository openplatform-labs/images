"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import {
  ADMIN_UNAUTHORIZED_EVENT,
  authHeaders,
  clearAdminSession,
  getStoredAdmin,
  saveAdminSession,
  validateAdminSession,
} from "@/lib/admin-client";
import { describeOktaAuthError } from "@/lib/okta-auth-messages";

interface AdminShellProps {
  children: ReactNode;
}

interface AdminStatus {
  smtpConfigured: boolean;
  oktaConfigured: boolean;
}

const navItems = [
  {
    href: "/admin/contents",
    label: "콘텐츠 관리",
    description: "로고 · 카테고리 · 태그 · 편집",
  },
  {
    href: "/admin/site",
    label: "사이트 관리",
    description: "계정 · SMTP · 연동 상태",
  },
];

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [ready, setReady] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    function handleUnauthorized() {
      setAuthenticated(false);
      setAdminEmail("");
    }

    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const statusResponse = await fetch("/api/admin/status");
        const statusData = await statusResponse.json();
        setStatus(statusData);
      } catch {
        setStatus(null);
      }

      const parameters = new URLSearchParams(window.location.search);
      const exchangeCode = parameters.get("oauth_exchange");
      const authError = parameters.get("auth_error");

      if (authError) {
        setAuthMessage(
          describeOktaAuthError(authError, parameters.get("detail")),
        );
        window.history.replaceState({}, "", "/admin");
      }

      if (exchangeCode) {
        try {
          const exchangeResponse = await fetch("/api/auth/okta/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: exchangeCode }),
          });
          const exchangeData = await exchangeResponse.json();
          window.history.replaceState({}, "", "/admin");

          if (exchangeResponse.ok && exchangeData.token && exchangeData.admin) {
            saveAdminSession(exchangeData.token, exchangeData.admin);
            setAuthenticated(true);
            setAdminEmail(exchangeData.admin.email);
            setReady(true);
            return;
          }

          setAuthMessage(exchangeData.error ?? "Okta 세션 교환에 실패했습니다.");
        } catch {
          window.history.replaceState({}, "", "/admin");
          setAuthMessage("Okta 세션 교환 중 오류가 발생했습니다.");
        }
      }

      const admin = await validateAdminSession();
      if (admin) {
        setAuthenticated(true);
        setAdminEmail(admin.email);
      }

      setReady(true);
    }

    void bootstrap();
  }, []);

  function handleLogout() {
    void fetch("/api/auth/me", {
      method: "DELETE",
      headers: authHeaders(),
    });
    clearAdminSession();
    setAuthenticated(false);
    setAdminEmail("");
  }

  function handleLoginSuccess() {
    const admin = getStoredAdmin();
    setAuthenticated(true);
    setAdminEmail(admin?.email ?? "");
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        로딩 중...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AdminLogin
        onSuccess={handleLoginSuccess}
        smtpConfigured={status?.smtpConfigured ?? false}
        oktaConfigured={status?.oktaConfigured ?? false}
        initialMessage={authMessage}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl gap-8 px-4 py-8 md:px-6">
      <aside className="w-full shrink-0 md:w-56">
        <div className="sticky top-24 space-y-6">
          <div>
            <p className="font-display text-lg font-bold">관리자</p>
            <p className="mt-1 truncate text-xs text-muted">{adminEmail}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2.5 transition ${
                    active
                      ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs opacity-70">{item.description}</p>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border pt-4">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              ← 갤러리로
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:text-danger"
            >
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
