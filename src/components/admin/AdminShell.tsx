"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import {
  authHeaders,
  clearAdminSession,
  getAdminToken,
  getStoredAdmin,
} from "@/lib/admin-client";

interface AdminShellProps {
  children: ReactNode;
}

interface AdminStatus {
  smtpConfigured: boolean;
}

const navItems = [
  {
    href: "/admin/contents",
    label: "콘텐츠 관리",
    description: "로고 · 카테고리 · 태그",
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

  useEffect(() => {
    void fetch("/api/admin/status")
      .then((response) => response.json())
      .then((data) => setStatus(data));

    const token = getAdminToken();
    const admin = getStoredAdmin();
    if (token && admin) {
      setAuthenticated(true);
      setAdminEmail(admin.email);
    }
    setReady(true);
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
