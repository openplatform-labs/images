"use client";

import { useEffect, useState } from "react";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { getStoredAdmin } from "@/lib/admin-client";

interface AdminStatus {
  githubConfigured: boolean;
  smtpConfigured: boolean;
  smtpVerified: boolean;
  repository: string;
  branch: string;
  staticallyCdnBase: string;
}

export default function SiteAdminPage() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const adminEmail = getStoredAdmin()?.email ?? "";

  useEffect(() => {
    void fetch("/api/admin/status")
      .then((response) => response.json())
      .then((data) => setStatus(data));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">사이트 관리</h1>
        <p className="text-sm text-muted">
          관리자 계정 · 인증 메일 · GitHub · CDN 연동 상태
        </p>
      </div>

      {status && (
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">연동 상태</h2>
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-elevated p-4">
              <dt className="text-xs uppercase text-muted">GitHub</dt>
              <dd className="mt-1 font-medium">
                {status.githubConfigured ? "연결됨" : "미설정"}
              </dd>
              <dd className="mt-1 font-mono text-xs text-muted">
                {status.repository}@{status.branch}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-elevated p-4">
              <dt className="text-xs uppercase text-muted">Statically CDN</dt>
              <dd className="mt-1 break-all font-mono text-xs text-accent">
                {status.staticallyCdnBase}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-elevated p-4">
              <dt className="text-xs uppercase text-muted">SMTP (Gmail)</dt>
              <dd className="mt-1 font-medium">
                {!status.smtpConfigured
                  ? "미설정"
                  : status.smtpVerified
                    ? "연결 확인됨"
                    : "설정됨 (연결 확인 필요)"}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-elevated p-4">
              <dt className="text-xs uppercase text-muted">내장 DB</dt>
              <dd className="mt-1 font-medium">SQLite</dd>
              <dd className="mt-1 text-xs text-muted">data/catalog.sqlite</dd>
            </div>
          </dl>
        </section>
      )}

      <AdminSettings currentEmail={adminEmail} />
    </div>
  );
}
