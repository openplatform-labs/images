import { CopyButton } from "./CopyButton";
import { CopyableLogoPreview } from "./CopyableLogoPreview";
import { config, getGithubRepoUrl } from "@/lib/config";
import type { LogoFile } from "@/lib/types";

interface StaticallyUrlPanelProps {
  files: LogoFile[];
  logoName: string;
}

export function StaticallyUrlPanel({ files, logoName }: StaticallyUrlPanelProps) {
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
          저장소와 연동된 CDN 주소입니다. 미리보기로 원하는 파일을 고른 뒤 URL을 복사하세요.
        </p>
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.filename}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface-elevated p-3 sm:flex-row sm:items-center"
          >
            <div className="w-full shrink-0 sm:w-36">
              <CopyableLogoPreview
                src={file.staticallyUrl}
                alt={`${logoName} ${file.role}`}
                copyValue={file.staticallyUrl}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-xs text-foreground">{file.filename}</p>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                  {file.role}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all text-sm">{file.staticallyUrl}</code>
                <CopyButton value={file.staticallyUrl} />
              </div>
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
