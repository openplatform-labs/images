import Link from "next/link";
import type { Category, LogoCollection, Tag } from "@/lib/types";

interface FilterPanelProps {
  categories: Category[];
  tags: Tag[];
  activeCategory?: string;
  activeTag?: string;
  activeCollection?: LogoCollection;
  query?: string;
}

export function FilterPanel({
  categories,
  tags,
  activeCategory,
  activeTag,
  activeCollection,
  query,
}: FilterPanelProps) {
  function buildHref(params: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    const merged = {
      q: query,
      category: activeCategory,
      tag: activeTag,
      collection: activeCollection,
      ...params,
    };

    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }

    const queryString = search.toString();
    return queryString ? `/?${queryString}` : "/";
  }

  return (
    <aside className="space-y-6">
      <form action="/" method="get" className="space-y-2">
        <label className="text-xs font-medium text-muted">Search</label>
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="react, vite, docker..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
          />
          {activeCategory && (
            <input type="hidden" name="category" value={activeCategory} />
          )}
          {activeTag && <input type="hidden" name="tag" value={activeTag} />}
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            검색
          </button>
        </div>
      </form>

      <div>
        <p className="mb-3 text-xs font-medium text-muted">Categories</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ category: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !activeCategory
                ? "bg-accent text-background"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            전체
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={buildHref({ category: category.slug })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeCategory === category.slug
                  ? "bg-accent text-background"
                  : "border border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {category.name}
              <span className="ml-1 opacity-60">{category.logoCount ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium text-muted">Tags</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ tag: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !activeTag
                ? "bg-accent-muted text-background"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            전체
          </Link>
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={buildHref({ tag: tag.slug })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeTag === tag.slug
                  ? "bg-accent-muted text-background"
                  : "border border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
