import Image from "next/image";
import Link from "next/link";
import type { Category, ImageHeroCandidate, LogoEntry, Tag } from "@/lib/types";
import { getChannelConfig } from "@/lib/channel";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import { GalleryPagination } from "@/components/GalleryPagination";
import { ImagesHeroRotator } from "@/components/ImagesHeroRotator";

interface ImagesHomeProps {
  title: string;
  tagline: string;
  description: string;
  total: number;
  items: LogoEntry[];
  heroCandidates: ImageHeroCandidate[];
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

/** 시네마틱 비대칭 타일 스팬 */
function tileSpan(index: number): string {
  const pattern = [
    "md:col-span-7 md:row-span-2 min-h-[280px] md:min-h-[420px]",
    "md:col-span-5 min-h-[200px] md:min-h-[200px]",
    "md:col-span-5 min-h-[200px] md:min-h-[200px]",
    "md:col-span-4 min-h-[220px]",
    "md:col-span-4 min-h-[220px]",
    "md:col-span-4 min-h-[220px]",
    "md:col-span-5 min-h-[240px]",
    "md:col-span-7 min-h-[240px]",
  ];
  return pattern[index % pattern.length];
}

export function ImagesHome({
  title,
  tagline,
  description,
  total,
  items,
  heroCandidates,
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
}: ImagesHomeProps) {
  const railParams = {
    q: query,
    category: activeCategory,
    tag: activeTag,
    page: undefined,
  };

  return (
    <div className="images-home">
      <ImagesHeroRotator
        title={title}
        tagline={tagline}
        description={description}
        total={total}
        candidates={heroCandidates}
        searchPlaceholder={searchPlaceholder}
        query={query}
        activeCategory={activeCategory}
        activeTag={activeTag}
      />

      {/* 가로 필터 레일 — 사이드바 대신 전체 폭 */}
      <div className="images-rail sticky top-0 z-40 border-b border-white/10 bg-[#05080f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 md:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href={buildHref(railParams, { category: undefined })}
              className={`shrink-0 border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition ${
                !activeCategory
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-white/65 hover:border-white/50 hover:text-white"
              }`}
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={buildHref(railParams, { category: category.slug })}
                className={`shrink-0 border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition ${
                  activeCategory === category.slug
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white/65 hover:border-white/50 hover:text-white"
                }`}
              >
                {category.name}
                <span className="ml-1.5 opacity-50">{category.logoCount ?? 0}</span>
              </Link>
            ))}
          </div>

          {tags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link
                href={buildHref(railParams, { tag: undefined })}
                className={`shrink-0 text-[11px] uppercase tracking-[0.16em] ${
                  !activeTag ? "text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                Tags · All
              </Link>
              {tags.slice(0, 24).map((tag) => (
                <Link
                  key={tag.id}
                  href={buildHref(railParams, { tag: tag.slug })}
                  className={`shrink-0 text-[11px] uppercase tracking-[0.16em] ${
                    activeTag === tag.slug
                      ? "text-sky-300"
                      : "text-white/35 hover:text-white/70"
                  }`}
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 비대칭 풀블리드 갤러리 */}
      <section className="mx-auto max-w-[1600px] px-2 py-3 md:px-3 md:py-4">
        {items.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/50">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:gap-2.5">
            {items.map((item, index) => {
              const url = previewUrl(item);
              const href = `${getChannelConfig("images").detailPathPrefix}/${item.shortname}`;
              return (
                <Link
                  key={item.shortname}
                  href={href}
                  className={`images-tile group relative col-span-1 overflow-hidden bg-black ${tileSpan(index)}`}
                  style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
                >
                  {url ? (
                    <Image
                      src={url}
                      alt={item.name}
                      fill
                      unoptimized
                      className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                      sizes="(max-width:768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 transition group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 translate-y-1 p-4 opacity-90 transition group-hover:translate-y-0 group-hover:opacity-100 md:p-5">
                    <p className="text-sm font-medium tracking-wide text-white md:text-base">
                      {item.name}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                      {[item.source, item.shortname].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="pb-16">
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
