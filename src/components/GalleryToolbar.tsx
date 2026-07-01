"use client";

import Link from "next/link";
import { PreviewThemeSwitcher } from "@/components/PreviewThemeSwitcher";

interface GalleryToolbarProps {
  total: number;
  page: number;
  totalPages: number;
  sort?: string;
  searchParams: Record<string, string | undefined>;
}

export function GalleryToolbar({
  total,
  page,
  totalPages,
  sort,
  searchParams,
}: GalleryToolbarProps) {
  function sortHref(nextSort: string) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...searchParams, sort: nextSort })) {
      if (value) params.set(key, value);
    }
    return `/?${params.toString()}`;
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted">
        {total.toLocaleString()} logos
        {totalPages > 1 && ` · ${page}/${totalPages}`}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <PreviewThemeSwitcher />
        <div className="flex gap-1 text-xs">
          <Link
            href={sortHref("name")}
            className={`rounded-md px-2.5 py-1.5 ${
              sort !== "recent"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Sort
          </Link>
          <Link
            href={sortHref("recent")}
            className={`rounded-md px-2.5 py-1.5 ${
              sort === "recent"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            New
          </Link>
        </div>
      </div>
    </div>
  );
}
