import Image from "next/image";
import Link from "next/link";
import type { Category, ImageHeroCandidate, LogoEntry, Tag } from "@/lib/types";
import { getChannelConfig } from "@/lib/channel";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import { GalleryPagination } from "@/components/GalleryPagination";

interface IllustHomeProps {
  title: string;
  tagline: string;
  description: string;
  total: number;
  items: LogoEntry[];
  featuredCandidates: ImageHeroCandidate[];
  categories: Category[];
  tags: Tag[];
  activeCategory?: string;
  activeTag?: string;
  query?: string;
  searchPlaceholder: string;
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  emptyLabel: string;
}

function previewUrl(entry: LogoEntry): string | null {
  const file = pickGalleryPreviewFile(
    entry.files,
    entry.shortname,
    entry.collection,
    entry.source,
    entry.previewFilename,
  );
  return file?.staticallyUrl ?? null;
}

function buildHref(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

/** 포트폴리오 매트 높이 리듬 */
function matHeight(index: number): string {
  const pattern = [
    "min-h-[280px] md:min-h-[360px]",
    "min-h-[220px] md:min-h-[280px]",
    "min-h-[300px] md:min-h-[320px]",
    "min-h-[240px] md:min-h-[400px]",
    "min-h-[260px] md:min-h-[300px]",
    "min-h-[220px] md:min-h-[340px]",
  ];
  return pattern[index % pattern.length];
}

/** 빈 스튜디오용 장식 실루엣 */
function StudioDecor() {
  return (
    <div className="illust-decor pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute -right-8 top-16 h-[420px] w-[420px] opacity-[0.14] md:right-8 md:opacity-[0.18]"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M120 260c40-90 120-120 160-40 30 60-10 110-70 120-55 10-100-30-90-80z"
          fill="currentColor"
          opacity="0.35"
        />
        <path
          d="M90 140c30-40 90-50 120-10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M250 90c20 35 55 55 95 45"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="280" cy="300" r="28" stroke="currentColor" strokeWidth="1.5" />
        <rect
          x="70"
          y="70"
          width="70"
          height="90"
          rx="8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
      </svg>
      <div className="illust-blob illust-blob-a" />
      <div className="illust-blob illust-blob-b" />
    </div>
  );
}

export function IllustHome({
  title,
  tagline,
  description,
  total,
  items,
  featuredCandidates,
  categories,
  tags,
  activeCategory,
  activeTag,
  query,
  searchPlaceholder,
  page,
  totalPages,
  searchParams,
  emptyLabel,
}: IllustHomeProps) {
  const featured = featuredCandidates[0] ?? null;
  const railParams = {
    q: query,
    category: activeCategory,
    tag: activeTag,
    page: undefined,
  };
  const detailPrefix = getChannelConfig("illust").detailPathPrefix;

  return (
    <div className="illust-home">
      {/* 아틀리에 히어로 — 브랜드 + 작품 매트 */}
      <section className="illust-hero relative isolate min-h-[min(100svh,920px)] overflow-hidden">
        <StudioDecor />

        <div className="relative z-10 mx-auto grid min-h-[min(100svh,920px)] max-w-[1500px] items-end gap-10 px-5 pb-14 pt-28 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-10 md:pb-20 md:pt-24">
          <div className="animate-soft-rise max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--illust-ink-soft)]">
              Illustration atelier
            </p>
            <h1 className="font-display mt-4 text-5xl font-semibold tracking-tight text-[color:var(--illust-ink)] md:text-7xl lg:text-[5.5rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[color:var(--illust-ink-soft)] md:text-lg">
              {tagline}
            </p>
            <p className="mt-2 max-w-md text-sm text-muted">{description}</p>

            <form
              action="/"
              method="get"
              className="illust-search mt-8 flex w-full max-w-md overflow-hidden"
            >
              {activeCategory && (
                <input type="hidden" name="category" value={activeCategory} />
              )}
              {activeTag && <input type="hidden" name="tag" value={activeTag} />}
              <input
                name="q"
                defaultValue={query}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-foreground outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                className="bg-[color:var(--illust-seal)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Find
              </button>
            </form>

            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {total.toLocaleString()} pieces · Statically CDN
            </p>
          </div>

          <div className="animate-soft-rise relative flex justify-center md:justify-end" style={{ animationDelay: "80ms" }}>
            {featured ? (
              <Link
                href={featured.href}
                className="illust-feature-mat group relative block w-full max-w-[480px] rotate-[-2.5deg] transition duration-500 hover:rotate-0"
              >
                <div className="illust-mat-inner relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={featured.imageUrl}
                    alt={featured.name}
                    fill
                    priority
                    unoptimized
                    className="object-contain p-6 transition duration-700 group-hover:scale-[1.03] md:p-8"
                    sizes="(max-width:768px) 90vw, 480px"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3 px-1">
                  <p className="font-display text-lg text-[color:var(--illust-ink)]">
                    {featured.name}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    Featured →
                  </span>
                </div>
              </Link>
            ) : (
              <div className="illust-feature-mat relative w-full max-w-[480px] rotate-[-2deg]">
                <div className="illust-mat-inner relative flex aspect-[4/5] flex-col items-center justify-center gap-4 px-8 text-center">
                  <span className="illust-pin" aria-hidden />
                  <p className="font-display text-2xl text-[color:var(--illust-ink)]">
                    Wall is waiting
                  </p>
                  <p className="max-w-[16rem] text-sm leading-relaxed text-muted">
                    일러스트를 올리면 이 자리에 작품이 걸립니다. CDN 절대경로로 바로
                    쓸 수 있어요.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 전시실 레일 */}
      <div className="illust-rail sticky top-0 z-40 border-y border-[color:var(--illust-line)] bg-[color:var(--illust-paper)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-4 md:px-10">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href={buildHref(railParams, { category: undefined })}
              className={`illust-chip shrink-0 ${!activeCategory ? "is-active" : ""}`}
            >
              All rooms
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={buildHref(railParams, { category: category.slug })}
                className={`illust-chip shrink-0 ${
                  activeCategory === category.slug ? "is-active" : ""
                }`}
              >
                {category.name}
                <span className="opacity-50">{category.logoCount ?? 0}</span>
              </Link>
            ))}
          </div>

          {tags.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link
                href={buildHref(railParams, { tag: undefined })}
                className={`text-[11px] uppercase tracking-[0.16em] ${
                  !activeTag
                    ? "text-[color:var(--illust-ink)]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Tags · All
              </Link>
              {tags.slice(0, 20).map((tag) => (
                <Link
                  key={tag.id}
                  href={buildHref(railParams, { tag: tag.slug })}
                  className={`text-[11px] uppercase tracking-[0.16em] ${
                    activeTag === tag.slug
                      ? "text-[color:var(--illust-seal)]"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 포트폴리오 벽 */}
      <section className="mx-auto max-w-[1500px] px-4 py-10 md:px-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-[color:var(--illust-ink)] md:text-3xl">
              On the wall
            </h2>
            <p className="mt-1 text-sm text-muted">
              투명 배경은 체크 매트 위에서 확인하세요.
            </p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Page {page} / {totalPages}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="illust-empty flex min-h-[42vh] flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-[color:var(--illust-line)] px-6 text-center">
            <p className="font-display text-xl text-[color:var(--illust-ink)]">
              {emptyLabel}
            </p>
            <p className="max-w-sm text-sm text-muted">
              Admin에서 일러스트를 업로드하면 전시가 시작됩니다.
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {items.map((item, index) => {
              const url = previewUrl(item);
              const href = `${detailPrefix}/${item.shortname}`;
              return (
                <Link
                  key={item.shortname}
                  href={href}
                  className={`illust-piece group mb-5 break-inside-avoid block ${matHeight(index)}`}
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                >
                  <div className="illust-piece-mat relative flex h-full items-center justify-center overflow-hidden p-5 md:p-6">
                    {url ? (
                      <Image
                        src={url}
                        alt={item.name}
                        width={640}
                        height={800}
                        unoptimized
                        className="illust-piece-img max-h-[min(52vh,420px)] w-auto max-w-full object-contain transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="text-sm text-muted">—</span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2 px-0.5">
                    <p className="truncate font-display text-base text-[color:var(--illust-ink)]">
                      {item.name}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      View
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="pb-10 pt-6">
          <GalleryPagination
            page={page}
            totalPages={totalPages}
            searchParams={searchParams}
          />
        </div>
      </section>
    </div>
  );
}
