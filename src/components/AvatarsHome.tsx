import Image from "next/image";
import Link from "next/link";
import type { Category, ImageHeroCandidate, LogoEntry, Tag } from "@/lib/types";
import { getChannelConfig } from "@/lib/channel";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import { GalleryPagination } from "@/components/GalleryPagination";

interface AvatarsHomeProps {
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

/** 빈 캐스팅 보드용 겹친 실루엣 */
function RosterDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="avatars-glow" />
      <svg
        className="absolute -left-16 top-20 h-[520px] w-[520px] opacity-[0.18] md:left-8"
        viewBox="0 0 420 420"
        fill="none"
      >
        <circle cx="210" cy="210" r="188" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="210" cy="210" r="148" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 10" />
        <circle cx="210" cy="168" r="48" fill="currentColor" opacity="0.22" />
        <ellipse cx="210" cy="268" rx="78" ry="86" fill="currentColor" opacity="0.16" />
      </svg>
      <svg
        className="absolute -right-10 bottom-8 h-[280px] w-[280px] opacity-[0.14]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="58" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function AvatarsHome({
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
}: AvatarsHomeProps) {
  const featured = featuredCandidates[0] ?? null;
  const stackCandidates = featuredCandidates.slice(1, 5);
  const railParams = {
    q: query,
    category: activeCategory,
    tag: activeTag,
    page: undefined,
  };
  const detailPrefix = getChannelConfig("avatars").detailPathPrefix;

  return (
    <div className="avatars-home">
      <section className="avatars-hero relative isolate min-h-[min(100svh,900px)] overflow-hidden">
        <RosterDecor />

        <div className="relative z-10 mx-auto grid min-h-[min(100svh,900px)] max-w-[1440px] items-center gap-12 px-5 pb-16 pt-28 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pb-20 md:pt-24">
          <div className="animate-soft-rise max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[color:var(--avatars-lime)]">
              Identity roster
            </p>
            <h1 className="font-display mt-4 text-5xl font-bold tracking-tight text-[color:var(--avatars-ink)] md:text-7xl lg:text-[5.25rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[color:var(--avatars-ink-soft)] md:text-lg">
              {tagline}
            </p>
            <p className="mt-2 max-w-md text-sm text-muted">{description}</p>

            <form
              action="/"
              method="get"
              className="avatars-search mt-8 flex w-full max-w-md overflow-hidden"
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
                className="bg-[color:var(--avatars-lime)] px-5 text-sm font-semibold text-[#121410] transition hover:brightness-110"
              >
                Cast
              </button>
            </form>

            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              {total.toLocaleString()} faces · circular CDN crops
            </p>
          </div>

          <div
            className="animate-soft-rise relative flex flex-col items-center justify-center"
            style={{ animationDelay: "80ms" }}
          >
            {stackCandidates.length > 0 && (
              <div className="avatars-stack mb-[-1.5rem] flex items-end justify-center pr-8">
                {stackCandidates.map((candidate, index) => (
                  <Link
                    key={candidate.shortname}
                    href={candidate.href}
                    className="avatars-stack-item relative h-16 w-16 overflow-hidden rounded-full md:h-20 md:w-20"
                    style={{ zIndex: index + 1, marginLeft: index === 0 ? 0 : "-1.5rem" }}
                  >
                    <Image
                      src={candidate.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>
                ))}
              </div>
            )}

            {featured ? (
              <Link href={featured.href} className="avatars-feature group relative block">
                <div className="avatars-feature-ring relative h-[min(58vw,380px)] w-[min(58vw,380px)] overflow-hidden rounded-full md:h-[420px] md:w-[420px]">
                  <Image
                    src={featured.imageUrl}
                    alt={featured.name}
                    fill
                    priority
                    unoptimized
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width:768px) 58vw, 420px"
                  />
                </div>
                <div className="mt-5 text-center">
                  <p className="font-display text-xl text-[color:var(--avatars-ink)]">
                    {featured.name}
                  </p>
                  <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--avatars-lime)]">
                    Featured cast →
                  </span>
                </div>
              </Link>
            ) : (
              <div className="avatars-feature">
                <div className="avatars-feature-ring avatars-feature-empty relative flex h-[min(58vw,340px)] w-[min(58vw,340px)] flex-col items-center justify-center rounded-full px-8 text-center md:h-[400px] md:w-[400px]">
                  <p className="font-display text-2xl text-[color:var(--avatars-ink)]">
                    Cast is empty
                  </p>
                  <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-muted">
                    아바타를 올리면 이 링에 얼굴이 뜹니다. 프로필 CDN 절대경로로 바로
                    쓸 수 있어요.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="avatars-rail sticky top-0 z-40 border-y border-[color:var(--avatars-line)] bg-[color:var(--avatars-studio)]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-4 md:px-10">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href={buildHref(railParams, { category: undefined })}
              className={`avatars-chip shrink-0 ${!activeCategory ? "is-active" : ""}`}
            >
              All faces
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={buildHref(railParams, { category: category.slug })}
                className={`avatars-chip shrink-0 ${
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
                    ? "text-[color:var(--avatars-ink)]"
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
                      ? "text-[color:var(--avatars-lime)]"
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

      <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-[color:var(--avatars-ink)] md:text-3xl">
              The roster
            </h2>
            <p className="mt-1 text-sm text-muted">
              원형 크롭으로 미리보고, 클릭해 CDN URL을 복사하세요.
            </p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Page {page} / {totalPages}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="avatars-empty flex min-h-[42vh] flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-[color:var(--avatars-line)] px-6 text-center">
            <p className="font-display text-xl text-[color:var(--avatars-ink)]">
              {emptyLabel}
            </p>
            <p className="max-w-sm text-sm text-muted">
              Admin에서 아바타를 업로드하면 캐스팅 보드가 채워집니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item, index) => {
              const url = previewUrl(item);
              const href = `${detailPrefix}/${item.shortname}`;
              return (
                <Link
                  key={item.shortname}
                  href={href}
                  className="avatars-piece group block"
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                >
                  <div className="avatars-piece-ring relative mx-auto aspect-square w-full overflow-hidden rounded-full">
                    {url ? (
                      <Image
                        src={url}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover transition duration-500 group-hover:scale-110"
                        sizes="(max-width:768px) 42vw, 200px"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-sm text-muted">
                        —
                      </span>
                    )}
                  </div>
                  <p className="mt-3 truncate text-center font-display text-sm text-[color:var(--avatars-ink)]">
                    {item.name}
                  </p>
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
