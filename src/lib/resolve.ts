import { getDatabase } from "./db";
import { normalizeSearchQuery, resolveAlias } from "./aliases";
import { enrichLogoFiles, pickLogoFile } from "./logo-files";
import { getLogoByShortname } from "./catalog";
import {
  getChannelCdnBase,
  getChannelConfig,
  getChannelItemPageUrl,
  type ChannelId,
  type ChannelScope,
} from "./channel";
import { iconImgSnippet, iconPackUsageNote } from "./icon-pack";
import type { LogoCollection, LogoFile, LogoVariant } from "./types";

export interface ResolveCandidate {
  channel: ChannelId;
  shortname: string;
  name: string;
  confidence: number;
  matchReason: string;
  source?: string | null;
  pack?: string | null;
  url?: string | null;
}

export interface ResolveResult {
  query: string;
  scope: ChannelScope;
  variant: LogoVariant;
  match: ResolveCandidate | null;
  url: string | null;
  format: LogoFile["format"] | null;
  scalable: boolean | null;
  file: {
    filename: string;
    role: LogoVariant;
  } | null;
  pageUrl: string | null;
  candidates: ResolveCandidate[];
  note?: string;
  usage?: string;
  html?: string;
}

interface ScoredRow {
  channel: ChannelId;
  shortname: string;
  name: string;
  source: string | null;
  score: number;
  matchReason: string;
}

interface ChannelRow {
  channel: ChannelId;
  shortname: string;
  name: string;
  source: string | null;
}

function normalizePackSlug(source?: string): string | undefined {
  const trimmed = source?.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

/** 팩 slug가 있으면 그 source만 */
function buildSourceFilter(source: string | undefined, tableAlias = ""): {
  clause: string;
  values: string[];
} {
  if (!source) return { clause: "", values: [] };
  const column = tableAlias ? `${tableAlias}.source` : "source";
  return { clause: ` AND lower(${column}) = ?`, values: [source] };
}

function combineFilters(
  scope: ChannelScope,
  source: string | undefined,
  tableAlias = "",
): { clause: string; values: (ChannelId | string)[] } {
  const channelFilter = buildChannelFilter(scope, tableAlias);
  const sourceFilter = buildSourceFilter(source, tableAlias);
  return {
    clause: `${channelFilter.clause}${sourceFilter.clause}`,
    values: [...channelFilter.values, ...sourceFilter.values],
  };
}

/** scope에 맞는 채널 조건절과 바인딩 값 */
function buildChannelFilter(scope: ChannelScope, tableAlias = ""): {
  clause: string;
  values: ChannelId[];
} {
  if (scope === "all") return { clause: "", values: [] };
  const column = tableAlias ? `${tableAlias}.channel` : "channel";
  return { clause: ` AND ${column} = ?`, values: [scope] };
}

/** 관련도 점수로 채널 항목 검색 */
export function searchLogosWithScore(
  query: string,
  limit = 8,
  collection?: LogoCollection,
  scope: ChannelScope = "logos",
  source?: string,
): ScoredRow[] {
  const database = getDatabase();
  const normalized = normalizeSearchQuery(query);
  const pack = normalizePackSlug(source);

  if (!normalized) return [];

  const channelFilter = combineFilters(scope, pack);
  const joinedChannelFilter = combineFilters(scope, pack, "l");
  const scores = new Map<string, ScoredRow>();

  function addScore(row: ChannelRow, score: number, matchReason: string): void {
    const key = `${row.channel}:${row.shortname}`;
    const existing = scores.get(key);
    if (!existing || existing.score < score) {
      scores.set(key, { ...row, score, matchReason });
    }
  }

  // 별칭(k8s → kubernetes 등)은 로고 채널 전용
  const aliasShortname =
    scope === "logos" || scope === "all" ? resolveAlias(normalized) : null;
  if (aliasShortname) {
    const row = database
      .prepare(
        "SELECT channel, shortname, name, source FROM logos WHERE channel = 'logos' AND shortname = ?",
      )
      .get(aliasShortname) as ChannelRow | undefined;

    if (row) {
      addScore(row, 1.0, `alias:${normalized}`);
    }
  }

  const exactShortnameRows = database
    .prepare(
      `SELECT channel, shortname, name, source FROM logos WHERE shortname = ?${channelFilter.clause}`,
    )
    .all(normalized, ...channelFilter.values) as ChannelRow[];

  for (const row of exactShortnameRows) {
    addScore(row, 0.98, "shortname_exact");
  }

  const exactNameRows = database
    .prepare(
      `SELECT channel, shortname, name, source FROM logos WHERE lower(name) = lower(?)${channelFilter.clause}`,
    )
    .all(query.trim(), ...channelFilter.values) as ChannelRow[];

  for (const row of exactNameRows) {
    addScore(row, 0.95, "name_exact");
  }

  const prefixPattern = `${normalized}%`;
  const prefixRows = database
    .prepare(
      `SELECT channel, shortname, name, source FROM logos
       WHERE (shortname LIKE ? OR lower(name) LIKE lower(?))${channelFilter.clause}
       LIMIT 30`,
    )
    .all(prefixPattern, `${query.trim()}%`, ...channelFilter.values) as ChannelRow[];

  for (const row of prefixRows) {
    addScore(row, 0.85, "prefix");
  }

  const containsPattern = `%${normalized}%`;
  const containsRows = database
    .prepare(
      `SELECT channel, shortname, name, source FROM logos
       WHERE (shortname LIKE ? OR name LIKE ?)${channelFilter.clause}
       LIMIT 40`,
    )
    .all(containsPattern, `%${query.trim()}%`, ...channelFilter.values) as ChannelRow[];

  for (const row of containsRows) {
    addScore(row, 0.72, "contains");
  }

  const tagRows = database
    .prepare(
      `SELECT l.channel, l.shortname, l.name, l.source
       FROM logos l
       INNER JOIN logo_tags lt ON lt.logo_shortname = l.shortname
       INNER JOIN tags t ON t.id = lt.tag_id
       WHERE (t.slug LIKE ? OR t.name LIKE ?)${joinedChannelFilter.clause}
       LIMIT 20`,
    )
    .all(containsPattern, `%${query.trim()}%`, ...joinedChannelFilter.values) as ChannelRow[];

  for (const row of tagRows) {
    addScore(row, 0.65, "tag");
  }

  const collectionStatement = database.prepare(
    "SELECT collection FROM logos WHERE channel = ? AND shortname = ?",
  );

  return [...scores.values()]
    .filter((row) => {
      if (!collection) return true;
      const logoRow = collectionStatement.get(row.channel, row.shortname) as
        | { collection: LogoCollection }
        | undefined;
      return logoRow?.collection === collection;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

/** 쿼리·variant로 현재 채널(또는 전체)에서 최적 자산 URL 해석 */
export function resolveLogoQuery(
  query: string,
  variant: LogoVariant = "default",
  collection?: LogoCollection,
  scope: ChannelScope = "logos",
  source?: string,
): ResolveResult {
  const candidates: ResolveCandidate[] = searchLogosWithScore(
    query,
    8,
    collection,
    scope,
    source,
  ).map((row) => ({
    channel: row.channel,
    shortname: row.shortname,
    name: row.name,
    confidence: Math.round(row.score * 100) / 100,
    matchReason: row.matchReason,
    ...(row.channel === "icons"
      ? { source: row.source, pack: row.source }
      : {}),
  }));

  const emptyResult: Omit<ResolveResult, "match" | "pageUrl" | "note"> = {
    query,
    scope,
    variant,
    url: null,
    format: null,
    scalable: null,
    file: null,
    candidates,
  };

  const best = candidates[0];
  if (!best || best.confidence < 0.5) {
    return {
      ...emptyResult,
      match: null,
      pageUrl: scope === "all" ? null : getChannelConfig(scope).siteBaseUrl,
      note:
        scope === "all"
          ? "No confident match. Review candidates or refine query."
          : normalizePackSlug(source)
            ? `No confident match in pack "${normalizePackSlug(source)}". Refine the query or omit source.`
            : "No confident match in this channel. Refine the query or retry with scope=all.",
    };
  }

  const logo = getLogoByShortname(best.shortname, best.channel);
  if (!logo) {
    return {
      ...emptyResult,
      match: best,
      pageUrl: getChannelItemPageUrl(best.channel, best.shortname),
      note: "Match found but item record missing.",
    };
  }

  const picked = pickLogoFile(logo.files, logo.shortname, logo.collection, variant);
  // default 요청은 채널별 대표 파일로 대체되는 것이 정상이므로 안내하지 않음
  const fallbackUsed =
    picked !== null && variant !== "default" && picked.role !== variant;

  const url = picked?.staticallyUrl ?? null;
  const pack = logo.channel === "icons" ? logo.source : null;
  const usage = logo.channel === "icons" ? iconPackUsageNote(pack) : null;

  return {
    ...emptyResult,
    match:
      logo.channel === "icons"
        ? { ...best, source: pack, pack, url }
        : best,
    url,
    format: picked?.format ?? null,
    scalable: picked?.scalable ?? null,
    file: picked ? { filename: picked.filename, role: picked.role } : null,
    pageUrl: getChannelItemPageUrl(logo.channel, logo.shortname),
    note: fallbackUsed
      ? `Requested variant "${variant}" not found; returned "${picked?.role}".`
      : undefined,
    ...(usage ? { usage } : {}),
    ...(logo.channel === "icons" && url
      ? { html: iconImgSnippet(url, logo.name) }
      : {}),
  };
}

/** 카탈로그 AI용 덤프 (현재 채널 또는 전체) */
export function buildCatalogDump(
  fields: string | undefined,
  scope: ChannelScope,
): {
  generatedAt: string;
  scope: ChannelScope;
  total: number;
  siteBaseUrl: string | null;
  cdnBaseUrl: string | null;
  items: Record<string, unknown>[];
} {
  const database = getDatabase();
  const channelFilter = buildChannelFilter(scope);

  const rows = database
    .prepare(
      `SELECT channel, shortname, name, url, collection, source FROM logos
       WHERE 1 = 1${channelFilter.clause}
       ORDER BY channel, name COLLATE NOCASE`,
    )
    .all(...channelFilter.values) as {
    channel: ChannelId;
    shortname: string;
    name: string;
    url: string | null;
    collection: LogoCollection;
    source: string | null;
  }[];

  const fileStatement = database.prepare(
    "SELECT filename, variant, width, height, bytes FROM logo_files WHERE channel = ? AND shortname = ? ORDER BY filename",
  );

  const fieldSet = fields
    ? new Set(fields.split(",").map((field) => field.trim()))
    : null;

  const items = rows.map((row) => {
    const fileRows = fileStatement.all(row.channel, row.shortname) as {
      filename: string;
      variant: string;
      width: number | null;
      height: number | null;
      bytes: number | null;
    }[];

    const files = enrichLogoFiles(
      row.shortname,
      fileRows.map((file) => ({
        filename: file.filename,
        variant: file.variant,
        width: file.width ?? undefined,
        height: file.height ?? undefined,
        bytes: file.bytes ?? undefined,
      })),
      row.collection,
      row.channel,
    );

    const defaultFile = pickLogoFile(files, row.shortname, row.collection, "default");
    const iconFile =
      row.collection === "themed"
        ? pickLogoFile(files, row.shortname, row.collection, "mono")
        : pickLogoFile(files, row.shortname, row.collection, "icon");

    const full: Record<string, unknown> = {
      channel: row.channel,
      shortname: row.shortname,
      name: row.name,
      collection: row.collection,
      source: row.source,
      officialUrl: row.url,
      pageUrl: getChannelItemPageUrl(row.channel, row.shortname),
      url: defaultFile?.staticallyUrl ?? null,
      iconUrl: iconFile?.staticallyUrl ?? null,
      format: defaultFile?.format ?? null,
      scalable: defaultFile?.scalable ?? null,
      variants: files.map((file) => ({
        role: file.role,
        filename: file.filename,
        url: file.staticallyUrl,
        format: file.format,
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
    scope,
    total: items.length,
    siteBaseUrl: scope === "all" ? null : getChannelConfig(scope).siteBaseUrl,
    cdnBaseUrl: scope === "all" ? null : getChannelCdnBase(scope),
    items,
  };
}
