"use client";

import { useEffect } from "react";

interface ImageFullViewProps {
  src: string;
  alt: string;
  label?: string;
  dimensions?: string;
  onClose: () => void;
}

export function ImageFullView({
  src,
  alt,
  label,
  dimensions,
  onClose,
}: ImageFullViewProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label="전체 보기"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white md:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{alt}</p>
          <p className="mt-0.5 text-xs text-white/60">
            {[label, dimensions, "전체 보기"].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
        >
          닫기
        </button>
      </div>

      <button
        type="button"
        className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center overflow-auto p-4 md:p-8"
        onClick={onClose}
        aria-label="배경 클릭으로 닫기"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onClick={(event) => event.stopPropagation()}
        />
      </button>
    </div>
  );
}
