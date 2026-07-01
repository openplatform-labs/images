"use client";

import Link from "next/link";
import Image from "next/image";
import { collectionLabels } from "@/lib/collection";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import type { LogoEntry } from "@/lib/types";
import { LogoPreviewFrame } from "@/components/LogoPreviewFrame";

interface LogoCardProps {
  logo: LogoEntry;
}

export function LogoCard({ logo }: LogoCardProps) {
  const preview = pickGalleryPreviewFile(
    logo.files,
    logo.shortname,
    logo.collection,
  );

  return (
    <Link
      href={`/logo/${logo.shortname}`}
      className="group block rounded-2xl transition hover:opacity-90"
    >
      <LogoPreviewFrame className="rounded-2xl transition group-hover:ring-2 group-hover:ring-accent/40">
        {preview ? (
          <Image
            src={preview.staticallyUrl}
            alt={logo.name}
            width={200}
            height={120}
            className="max-h-[100px] w-auto max-w-full object-contain md:max-h-[120px]"
            unoptimized
          />
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </LogoPreviewFrame>
      <p className="mt-2 truncate text-center text-sm font-medium text-foreground/90">
        {logo.name}
      </p>
      {logo.collection === "themed" && (
        <p className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted">
          {collectionLabels.themed}
        </p>
      )}
    </Link>
  );
}
