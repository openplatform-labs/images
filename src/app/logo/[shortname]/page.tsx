import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoDetailPreview } from "@/components/LogoDetailPreview";
import { StaticallyUrlPanel } from "@/components/StaticallyUrlPanel";
import { collectionLabels } from "@/lib/collection";
import { getLogoByShortname } from "@/lib/catalog";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import { ensureCatalogSynced } from "@/lib/server-catalog";

interface LogoDetailPageProps {
  params: Promise<{ shortname: string }>;
}

export default async function LogoDetailPage({ params }: LogoDetailPageProps) {
  await ensureCatalogSynced();
  const { shortname } = await params;
  const logo = getLogoByShortname(shortname);

  if (!logo) notFound();

  const primaryFile = pickGalleryPreviewFile(
    logo.files,
    logo.shortname,
    logo.collection,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <Link href="/" className="text-sm text-muted transition hover:text-foreground">
        ← Gallery
      </Link>

      <div className="mt-8 space-y-8">
        <LogoDetailPreview
          imageUrl={primaryFile?.staticallyUrl ?? ""}
          name={logo.name}
        />

        <div className="text-center">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{logo.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{logo.shortname}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
            {collectionLabels[logo.collection]}
            {logo.source ? ` · ${logo.source}` : ""}
          </p>
          {logo.url && (
            <a
              href={logo.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-accent hover:underline"
            >
              Official site →
            </a>
          )}
        </div>

        {(logo.categories.length > 0 || logo.tags.length > 0) && (
          <div className="flex flex-wrap justify-center gap-2">
            {logo.categories.map((category) => (
              <Link
                key={category.id}
                href={`/?category=${category.slug}`}
                className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-muted"
              >
                {category.name}
              </Link>
            ))}
            {logo.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/?tag=${tag.slug}`}
                className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-muted"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        <StaticallyUrlPanel files={logo.files} />
      </div>
    </div>
  );
}
