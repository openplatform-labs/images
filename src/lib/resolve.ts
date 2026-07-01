import { getDatabase } from "./db";
import { normalizeSearchQuery, resolveAlias } from "./aliases";
import { enrichLogoFiles, pickLogoFile } from "./logo-files";
import { getLogoByShortname } from "./catalog";
import type { LogoVariant } from "./types";

export interface ResolveCandidate {
  shortname: string;
  name: string;
  confidence: number;
  matchReason: string;
}

export interface ResolveResult {
  query: string;
  variant: LogoVariant;
  match: {
    shortname: string;
    name: string;
    confidence: number;
    matchReason: string;
  } | null;
  url: string | null;
  format: "svg";
  scalable: true;
  file: {
    filename: string;
    role: LogoVariant;
  } | null;
  pageUrl: string;
  candidates: ResolveCandidate[];
  note?: string;
}

interface ScoredRow {
  shortname: string;
  name: string;
  score: number;
  matchReason: string;
}

function getSiteBaseUrl(): string {
  return (
    process.env.SITE_BASE_URL?.replace(/\/$/, "") ??
    "https://images.opl.io.kr"
  );
}

/** 관련도 점수로 로고 검색 */
export function searchLogosWithScore(query: string, limit = 8): ScoredRow[] {
  const database = getDatabase();
  const normalized = normalizeSearchQuery(query);

  if (!normalized) return [];

  const aliasShortname = resolveAlias(normalized);
  const scores = new Map<string, ScoredRow>();

  function addScore(
    shortname: string,
    name: string,
    score: number,
    matchReason: string,
  ): void {
    const existing = scores.get(shortname);
    if (!existing || existing.score < score) {
      scores.set(shortname, { shortname, name, score, matchReason });
    }
  }

  if (aliasShortname) {
    const row = database
      .prepare("SELECT shortname, name FROM logos WHERE shortname = ?")
      .get(aliasShortname) as { shortname: string; name: string } | undefined;

    if (row) {
      addScore(row.shortname, row.name, 1.0, `alias:${normalized}`);
    }
  }

  const exactShortname = database
    .prepare("SELECT shortname, name FROM logos WHERE shortname = ?")
    .get(normalized) as { shortname: string; name: string } | undefined;

  if (exactShortname) {
    addScore(exactShortname.shortname, exactShortname.name, 0.98, "shortname_exact");
  }

  const exactNameRows = database
    .prepare(
      "SELECT shortname, name FROM logos WHERE lower(name) = lower(?)",
    )
    .all(query.trim()) as { shortname: string; name: string }[];

  for (const row of exactNameRows) {
    addScore(row.shortname, row.name, 0.95, "name_exact");
  }

  const prefixPattern = `${normalized}%`;
  const prefixRows = database
    .prepare(
      `SELECT shortname, name FROM logos
       WHERE shortname LIKE ? OR lower(name) LIKE lower(?)
       LIMIT 30`,
    )
    .all(prefixPattern, `${query.trim()}%`) as { shortname: string; name: string }[];

  for (const row of prefixRows) {
    addScore(row.shortname, row.name, 0.85, "prefix");
  }

  const containsPattern = `%${normalized}%`;
  const containsRows = database
    .prepare(
      `SELECT shortname, name FROM logos
       WHERE shortname LIKE ? OR name LIKE ?
       LIMIT 40`,
    )
    .all(containsPattern, `%${query.trim()}%`) as {
    shortname: string;
    name: string;
  }[];

  for (const row of containsRows) {
    addScore(row.shortname, row.name, 0.72, "contains");
  }

  const tagRows = database
    .prepare(
      `SELECT l.shortname, l.name
       FROM logos l
       INNER JOIN logo_tags lt ON lt.logo_shortname = l.shortname
       INNER JOIN tags t ON t.id = lt.tag_id
       WHERE t.slug LIKE ? OR t.name LIKE ?
       LIMIT 20`,
    )
    .all(containsPattern, `%${query.trim()}%`) as {
    shortname: string;
    name: string;
  }[];

  for (const row of tagRows) {
    addScore(row.shortname, row.name, 0.65, "tag");
  }

  return [...scores.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

/** 쿼리·variant로 최적 로고 URL 해석 */
export function resolveLogoQuery(
  query: string,
  variant: LogoVariant = "default",
): ResolveResult {
  const siteBase = getSiteBaseUrl();
  const candidates = searchLogosWithScore(query, 8).map((row) => ({
    shortname: row.shortname,
    name: row.name,
    confidence: Math.round(row.score * 100) / 100,
    matchReason: row.matchReason,
  }));

  const best = candidates[0];
  if (!best || best.confidence < 0.5) {
    return {
      query,
      variant,
      match: null,
      url: null,
      format: "svg",
      scalable: true,
      file: null,
      pageUrl: siteBase,
      candidates,
      note: "No confident match. Review candidates or refine query.",
    };
  }

  const logo = getLogoByShortname(best.shortname);
  if (!logo) {
    return {
      query,
      variant,
      match: best,
      url: null,
      format: "svg",
      scalable: true,
      file: null,
      pageUrl: `${siteBase}/logo/${best.shortname}`,
      candidates,
      note: "Match found but logo record missing.",
    };
  }

  const files = logo.files;
  const picked = pickLogoFile(files, logo.shortname, variant);
  const fallbackUsed = picked !== null && picked.role !== variant;

  return {
    query,
    variant,
    match: best,
    url: picked?.staticallyUrl ?? null,
    format: "svg",
    scalable: true,
    file: picked
      ? { filename: picked.filename, role: picked.role }
      : null,
    pageUrl: `${siteBase}/logo/${logo.shortname}`,
    candidates,
    note: fallbackUsed
      ? `Requested variant "${variant}" not found; returned "${picked?.role}".`
      : undefined,
  };
}

/** 전체 카탈로그 AI용 덤프 */
export function buildCatalogDump(fields?: string): {
  generatedAt: string;
  total: number;
  siteBaseUrl: string;
  cdnBaseUrl: string;
  logos: Record<string, unknown>[];
} {
  const database = getDatabase();
  const siteBase = getSiteBaseUrl();
  const cdnBase = process.env.STATICALLY_CDN_BASE ??
    "https://cdn.statically.io/gh/opensphere-platform/logos@main";

  const rows = database
    .prepare("SELECT shortname, name, url FROM logos ORDER BY name COLLATE NOCASE")
    .all() as { shortname: string; name: string; url: string | null }[];

  const fieldSet = fields
    ? new Set(fields.split(",").map((field) => field.trim()))
    : null;

  const logos = rows.map((row) => {
    const fileRows = database
      .prepare(
        "SELECT filename FROM logo_files WHERE shortname = ? ORDER BY filename",
      )
      .all(row.shortname) as { filename: string }[];

    const files = enrichLogoFiles(
      row.shortname,
      fileRows.map((file) => file.filename),
    );

    const defaultFile = pickLogoFile(files, row.shortname, "default");
    const iconFile = pickLogoFile(files, row.shortname, "icon");

    const full: Record<string, unknown> = {
      shortname: row.shortname,
      name: row.name,
      officialUrl: row.url,
      pageUrl: `${siteBase}/logo/${row.shortname}`,
      url: defaultFile?.staticallyUrl ?? null,
      iconUrl: iconFile?.staticallyUrl ?? null,
      format: "svg",
      scalable: true,
      variants: files.map((file) => ({
        role: file.role,
        filename: file.filename,
        url: file.staticallyUrl,
      })),
    };

    if (!fieldSet) return full;

    const picked: Record<string, unknown> = {};
    for (const key of fieldSet) {
      if (key in full) picked[key] = full[key];
    }
    return picked;
  });

  return {
    generatedAt: new Date().toISOString(),
    total: logos.length,
    siteBaseUrl: siteBase,
    cdnBaseUrl: cdnBase,
    logos,
  };
}
