import Link from "next/link";
import { collectionLabels } from "@/lib/collection";
import type { LogoCollection } from "@/lib/types";

interface CollectionTabsProps {
  activeCollection?: LogoCollection;
  counts: Record<LogoCollection, number>;
  searchParams: Record<string, string | undefined>;
}

export function CollectionTabs({
  activeCollection,
  counts,
  searchParams,
}: CollectionTabsProps) {
  function buildHref(collection?: LogoCollection) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      ...searchParams,
      collection: collection ?? undefined,
      page: undefined,
    })) {
      if (value) params.set(key, value);
    }
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  }

  const tabs: { key?: LogoCollection; label: string; count: number }[] = [
    {
      label: "All",
      count: counts.simple + counts.themed,
    },
    {
      key: "simple",
      label: collectionLabels.simple,
      count: counts.simple,
    },
    {
      key: "themed",
      label: collectionLabels.themed,
      count: counts.themed,
    },
  ];

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      {tabs.map((tab) => {
        const active = tab.key === activeCollection || (!tab.key && !activeCollection);

        return (
          <Link
            key={tab.key ?? "all"}
            href={buildHref(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-foreground text-background"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 opacity-60">{tab.count.toLocaleString()}</span>
          </Link>
        );
      })}
    </div>
  );
}
