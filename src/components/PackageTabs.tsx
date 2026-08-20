import Link from "next/link";

export interface PackageCount {
  source: string;
  count: number;
}

interface PackageTabsProps {
  activePackage?: string;
  packages: PackageCount[];
  searchParams: Record<string, string | undefined>;
}

export function PackageTabs({
  activePackage,
  packages,
  searchParams,
}: PackageTabsProps) {
  const total = packages.reduce((sum, item) => sum + item.count, 0);

  function buildHref(packageSlug?: string) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      ...searchParams,
      source: packageSlug ?? undefined,
      page: undefined,
    })) {
      if (value) params.set(key, value);
    }
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  }

  if (packages.length === 0) return null;

  const tabs: { key?: string; label: string; count: number }[] = [
    { label: "All packages", count: total },
    ...packages.map((item) => ({
      key: item.source,
      label: item.source,
      count: item.count,
    })),
  ];

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      {tabs.map((tab) => {
        const active =
          tab.key === activePackage || (!tab.key && !activePackage);

        return (
          <Link
            key={tab.key ?? "all"}
            href={buildHref(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-accent text-white"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 ${active ? "text-white/80" : "opacity-60"}`}
            >
              {tab.count.toLocaleString()}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
