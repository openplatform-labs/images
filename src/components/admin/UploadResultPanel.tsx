"use client";

import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";

interface CdnUrlItem {
  filename: string;
  staticallyUrl: string;
  githubPath: string;
}

interface UploadResultPanelProps {
  shortname: string;
  name: string;
  commitSha: string;
  cdnUrls: CdnUrlItem[];
  message: string;
  onReset: () => void;
}

export function UploadResultPanel({
  shortname,
  name,
  commitSha,
  cdnUrls,
  message,
  onReset,
}: UploadResultPanelProps) {
  return (
    <section className="animate-fade-up space-y-4 rounded-xl border border-accent/40 bg-accent/5 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          배포 완료
        </p>
        <h2 className="font-display text-2xl font-bold">{name}</h2>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>

      <div className="grid gap-2 text-sm md:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted">1. PC 로드</p>
          <p className="font-medium text-accent">완료</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted">2. GitHub</p>
          <p className="font-mono text-xs">{commitSha.slice(0, 7)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted">3. Statically CDN</p>
          <p className="font-medium">전파 중 (수 분)</p>
        </div>
      </div>

      <div className="space-y-3">
        {cdnUrls.map((item) => (
          <div
            key={item.filename}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <p className="mb-1 font-mono text-xs text-muted">{item.filename}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all text-sm text-accent">
                {item.staticallyUrl}
              </code>
              <CopyButton value={item.staticallyUrl} label="CDN 복사" />
            </div>
            <p className="mt-2 text-xs text-muted">GitHub: {item.githubPath}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/logo/${shortname}`}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
        >
          갤러리에서 보기
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          새 로고 업로드
        </button>
      </div>
    </section>
  );
}
