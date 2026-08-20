import Link from "next/link";
import { getChannelConfig } from "@/lib/channel";
import { collectionLabels } from "@/lib/collection";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import type { LogoEntry } from "@/lib/types";
import { LogoImage } from "@/components/LogoImage";
import { LogoPreviewFrame } from "@/components/LogoPreviewFrame";

interface LogoCardProps {
  logo: LogoEntry;
  index?: number;
}

export function LogoCard({ logo, index = 0 }: LogoCardProps) {
  const preview = pickGalleryPreviewFile(
    logo.files,
    logo.shortname,
    logo.collection,
    logo.source,
    logo.previewFilename,
  );
  const detailHref = `${getChannelConfig(logo.channel).detailPathPrefix}/${logo.shortname}`;
  const isCinema = logo.channel === "images";
  const isStudio = logo.channel === "illust";
  const isRoster = logo.channel === "avatars";

  return (
    <Link
      href={detailHref}
      className={`group block transition ${
        isCinema
          ? "hover:-translate-y-0.5 hover:opacity-95"
          : isStudio
            ? "hover:-translate-x-0.5 hover:-translate-y-0.5"
            : isRoster
              ? "hover:opacity-95"
              : "hover:opacity-90"
      }`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className="channel-card-frame animate-fade-up overflow-hidden">
        <LogoPreviewFrame
          className={
            isCinema
              ? "rounded-none"
              : isStudio
                ? "rounded-[1rem]"
                : "rounded-[var(--frame-radius)]"
          }
          large={false}
          flush={isCinema}
        >
          {preview ? (
            <LogoImage src={preview.staticallyUrl} alt={logo.name} size="card" />
          ) : (
            <span className="text-sm text-muted">—</span>
          )}
        </LogoPreviewFrame>
      </div>

      <div className={`mt-2 ${isCinema ? "px-0.5 text-left" : "text-center"}`}>
        <p
          className={`truncate text-sm font-medium text-foreground/90 ${
            isCinema ? "tracking-wide" : ""
          }`}
        >
          {logo.name}
        </p>
        {logo.channel === "icons" && logo.source && (
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
            {logo.source}
          </p>
        )}
        {logo.channel === "logos" && logo.collection === "themed" && (
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
            {collectionLabels.themed}
          </p>
        )}
        {logo.channel === "images" && logo.source && (
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {logo.source}
          </p>
        )}
        {logo.channel === "illust" && (
          <p className="mt-0.5 text-[10px] tracking-wide text-muted">
            illustration
          </p>
        )}
        {isRoster && (
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">
            avatar
          </p>
        )}
      </div>
    </Link>
  );
}
