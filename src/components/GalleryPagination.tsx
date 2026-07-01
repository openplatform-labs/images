import Link from "next/link";

interface GalleryPaginationProps {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

function buildPageHref(
  pageNumber: number,
  searchParams: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({
    ...searchParams,
    page: String(pageNumber),
  })) {
    if (value) search.set(key, value);
  }
  return `/?${search.toString()}`;
}

/** 갤러리 페이지 번호 목록 생성 (ellipsis 포함) */
function buildPageItems(
  page: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: (number | "ellipsis")[] = [1];

  const rangeStart = Math.max(2, page - 2);
  const rangeEnd = Math.min(totalPages - 1, page + 2);

  if (rangeStart > 2) items.push("ellipsis");

  for (let pageNumber = rangeStart; pageNumber <= rangeEnd; pageNumber += 1) {
    items.push(pageNumber);
  }

  if (rangeEnd < totalPages - 1) items.push("ellipsis");

  items.push(totalPages);
  return items;
}

export function GalleryPagination({
  page,
  totalPages,
  searchParams,
}: GalleryPaginationProps) {
  if (totalPages <= 1) return null;

  const pageItems = buildPageItems(page, totalPages);

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
      aria-label="갤러리 페이지"
    >
      <Link
        href={buildPageHref(Math.max(1, page - 1), searchParams)}
        aria-disabled={page <= 1}
        className={`rounded-md border border-border px-3 py-1.5 text-sm ${
          page <= 1
            ? "pointer-events-none opacity-40"
            : "text-muted hover:text-foreground"
        }`}
      >
        이전
      </Link>

      {pageItems.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildPageHref(item, searchParams)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              page === item
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item}
          </Link>
        ),
      )}

      <Link
        href={buildPageHref(Math.min(totalPages, page + 1), searchParams)}
        aria-disabled={page >= totalPages}
        className={`rounded-md border border-border px-3 py-1.5 text-sm ${
          page >= totalPages
            ? "pointer-events-none opacity-40"
            : "text-muted hover:text-foreground"
        }`}
      >
        다음
      </Link>
    </nav>
  );
}
