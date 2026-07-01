import { CopyButton } from "./CopyButton";
import { config, getGithubRepoUrl } from "@/lib/config";
import type { LogoFile } from "@/lib/types";

interface StaticallyUrlPanelProps {
  files: LogoFile[];
}

export function StaticallyUrlPanel({ files }: StaticallyUrlPanelProps) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Statically CDN URL</h2>
        <p className="mt-1 text-sm text-muted">
          GitHub{" "}
          <a
            href={getGithubRepoUrl()}
            className="text-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {config.githubOwner}/{config.githubRepo}
          </a>{" "}
          저장소와 연동된 CDN 주소입니다.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-elevated p-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
          CDN Base
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="break-all text-sm text-accent">
            {config.staticallyCdnBase}/logos/
          </code>
          <CopyButton value={`${config.staticallyCdnBase}/logos/`} />
        </div>
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.filename}
            className="rounded-lg border border-border bg-surface-elevated p-3"
          >
            <p className="mb-2 font-mono text-xs text-muted">{file.filename}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all text-sm">{file.staticallyUrl}</code>
              <CopyButton value={file.staticallyUrl} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
        <p className="font-semibold text-foreground">HTML 예시</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
{`<img src="${files[0]?.staticallyUrl ?? `${config.staticallyCdnBase}/logos/example.svg`}" alt="Logo" />`}
        </pre>
      </div>
    </section>
  );
}
