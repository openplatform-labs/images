import { CopyButton } from "./CopyButton";
import { CopyableLogoPreview } from "./CopyableLogoPreview";
import { getGithubCdnBase, getGithubRepoUrl } from "@/lib/config";
import { getChannelGithub } from "@/lib/channel";
import { toAbsoluteCdnUrl } from "@/lib/statically";
import type { ChannelId, LogoFile } from "@/lib/types";

interface StaticallyUrlPanelProps {
  files: LogoFile[];
  logoName: string;
  channelId?: ChannelId;
}

export function StaticallyUrlPanel({
  files,
  logoName,
  channelId = "logos",
}: StaticallyUrlPanelProps) {
  const github = getChannelGithub(channelId);
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">CDN 절대경로</h2>
        <p className="mt-1 text-sm text-muted">
          GitHub{" "}
          <a
            href={getGithubRepoUrl(channelId)}
            className="text-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {github.owner}/{github.repo}
          </a>{" "}
          → Statically CDN. 복사 시 <code>https://cdn.statically.io/...</code>{" "}
          전체 주소가 들어갑니다.
        </p>
      </div>

      <div className="space-y-3">
        {files.map((file) => {
          const absoluteUrl = toAbsoluteCdnUrl(file.staticallyUrl, channelId);
          return (
            <div
              key={file.filename}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface-elevated p-3 sm:flex-row sm:items-center"
            >
              <div className="w-full shrink-0 sm:w-36">
                <CopyableLogoPreview
                  src={absoluteUrl}
                  alt={`${logoName} ${file.role}`}
                  copyValue={absoluteUrl}
                />
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs text-foreground">
                    {file.filename}
                  </p>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                    {file.role}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="break-all text-sm text-accent">
                    {absoluteUrl}
                  </code>
                  <CopyButton value={absoluteUrl} label="CDN 절대경로 복사" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
        <p className="font-semibold text-foreground">HTML 예시</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
{`<img src="${toAbsoluteCdnUrl(files[0]?.staticallyUrl ?? `${getGithubCdnBase(channelId)}/logos/example.svg`, channelId)}" alt="${logoName}" />`}
        </pre>
      </div>
    </section>
  );
}
