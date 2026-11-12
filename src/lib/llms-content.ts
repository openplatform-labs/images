import { addonExamples } from "./datagrid-addons";
import {
  channelHasDetailPages,
  channelIds,
  getCatalogRemoteUrl,
  getChannelCdnBase,
  getChannelConfig,
  getChannelGithub,
  getChannelGithubUrl,
  getChannelServiceName,
  getChannelTagline,
  type ChannelId,
} from "./channel";
import { getDatabase } from "./db";
import { iconPackUsageNote } from "./icon-pack";
import { searchLogosWithScore } from "./resolve";

// 채널별로 실제 매칭되는지 확인한 뒤 예시로 쓸 검색어 후보
const preferredExampleQueries: Partial<Record<ChannelId, string[]>> = {
  logos: ["react", "docker"],
  icons: ["add", "search"],
  pictograms: ["cloud", "security"],
  illust: ["success", "action"],
  images: ["earth", "galaxy"],
};

// 채널별 variant 안내
const variantGuides: Partial<Record<ChannelId, string[]>> = {
  logos: [
    "- `default` — full logo (default)",
    "- `icon` — square/icon variant (*-icon.svg)",
    "- `wordmark` — text/wordmark variant when available",
    "- themed collection also has `color`, `light`, `dark`, `mono`",
  ],
  images: [
    "- `thumb`, `small`, `medium`, `large`, `orig` — raster resolutions (JPEG/PNG)",
    "- `default` falls back to the largest available file",
  ],
};

function countChannelItems(channelId: ChannelId): number {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) as count FROM logos WHERE channel = ?")
    .get(channelId) as { count: number };
  return row.count;
}

/** 실제로 매칭되는 예시 검색어 (없으면 첫 항목 이름) */
function pickExampleQuery(channelId: ChannelId): string | null {
  for (const candidate of preferredExampleQueries[channelId] ?? []) {
    const [best] = searchLogosWithScore(candidate, 1, undefined, channelId);
    if (best && best.score >= 0.85) return candidate;
  }

  const firstRow = getDatabase()
    .prepare(
      "SELECT shortname FROM logos WHERE channel = ? ORDER BY name COLLATE NOCASE LIMIT 1",
    )
    .get(channelId) as { shortname: string } | undefined;
  return firstRow?.shortname ?? null;
}

/** azure folder가 있으면 그 shortname, 없으면 해당 팩의 첫 항목 */
function pickPackShortname(source: string, nameLike: string): string | null {
  const matched = getDatabase()
    .prepare(
      `SELECT shortname FROM logos
       WHERE channel = 'icons' AND lower(source) = ?
         AND (shortname LIKE ? OR lower(name) LIKE ?)
       ORDER BY name COLLATE NOCASE
       LIMIT 1`,
    )
    .get(source, `%${nameLike}%`, `%${nameLike}%`) as { shortname: string } | undefined;
  if (matched) return matched.shortname;

  const fallback = getDatabase()
    .prepare(
      `SELECT shortname FROM logos
       WHERE channel = 'icons' AND lower(source) = ?
       ORDER BY name COLLATE NOCASE
       LIMIT 1`,
    )
    .get(source) as { shortname: string } | undefined;
  return fallback?.shortname ?? null;
}

function buildIconsLead(siteBase: string): string[] {
  const azureShortname = pickPackShortname("azure", "folder");
  const resolveExample = `${siteBase}/api/resolve?q=folder&source=azure&format=minimal`;
  const exactLines = azureShortname
    ? [
        `GET ${siteBase}/api/logos/${azureShortname}`,
        `GET ${siteBase}/i/${azureShortname}`,
      ]
    : [
        `GET ${siteBase}/api/logos/{shortname}`,
        `GET ${siteBase}/i/{shortname}`,
      ];

  const packNotes = ["azure", "carbon", "core-16", "file-explorer"].flatMap((slug) => {
    const note = iconPackUsageNote(slug);
    return note ? [`- \`${slug}\` — ${note}`] : [];
  });

  return [
    "## Pack-first flow",
    "",
    "List packs, then resolve inside one pack. `source` is the pack slug.",
    "`format=minimal` returns one CDN URL line. Prefer an exact shortname when you already have it.",
    "",
    "```",
    `GET ${siteBase}/api/packs`,
    `GET ${resolveExample}`,
    ...exactLines,
    "```",
    "",
    "## Discovery",
    "",
    `- OpenAPI: ${siteBase}/openapi.json`,
    `- MCP server card: ${siteBase}/.well-known/mcp.json`,
    `- MCP endpoint: ${siteBase}/mcp (Streamable HTTP JSON-RPC: initialize, tools/list, tools/call)`,
    "- MCP tools: `list_packs`, `search_icons` (query, pack, limit), `get_icon` (shortname). Read-only, no auth.",
    "",
    "## Pack notes",
    "",
    ...packNotes,
    "",
    "## Catalog",
    "",
    "`GET /api/catalog` is the indexing dump for this channel, not the per-query path.",
    "Look up a single icon with `/api/resolve?source={pack}` or `/api/logos/{shortname}`.",
    "",
  ];
}

function buildChannelExtraSection(channelId: ChannelId): string[] {
  const channel = getChannelConfig(channelId);
  const siteBase = channel.siteBaseUrl;

  if (channelId === "icons") return [];

  if (channelId === "datagrid") {
    const { owner, repo, branch } = getChannelGithub("datagrid");
    const sourceBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/datagrid`;
    return [
      "## Datagrid samples",
      "",
      "This channel is a data workspace, not an asset gallery. Sample grids use AG Grid backed by JSON in GitHub.",
      "",
      "| Endpoint | Purpose |",
      "|----------|---------|",
      "| /api/datagrid-demo/rows | Sample order rows (JSON) |",
      "| /api/datagrid-demo/columns | Column definitions (JSON) |",
      "| /api/datagrid-demo/view | Default view state (JSON) |",
      "",
      "Pages:",
      "",
      `- ${siteBase}/grid-core — core grid examples`,
      `- ${siteBase}/grid-addons — addon index`,
      ...addonExamples.map(
        (example) => `- ${siteBase}/grid-addons/${example.id} — ${example.title}`,
      ),
      "",
      "Raw source JSON:",
      "",
      `- ${sourceBase}/orders.rows.json`,
      `- ${sourceBase}/orders.columns.json`,
      `- ${sourceBase}/orders.view.json`,
      "",
    ];
  }

  if (channelId === "sheet") {
    return [
      "## Status",
      "",
      "This channel currently serves a landing page only. Spec, pricing, and comparison sheets will be published here later.",
      "",
    ];
  }

  return [];
}

/** 현재 채널 전용 AI / Agent 가이드 (llms.txt) */
export function buildLlmsContent(channelId: ChannelId): string {
  const channel = getChannelConfig(channelId);
  const siteBase = channel.siteBaseUrl;
  const serviceName = getChannelServiceName(channelId);
  const itemCount = countChannelItems(channelId);
  const exampleQuery = pickExampleQuery(channelId);
  const cdnPattern = `${getChannelCdnBase(channelId)}/${channel.assetDir}/{filename}`;

  const itemCountLabel = `${itemCount} ${itemCount === 1 ? channel.itemLabel : channel.itemLabelPlural}`;

  const lines: string[] = [
    `# ${serviceName} — AI / Agent Guide`,
    "",
    `> ${channel.heroDescription}`,
    `> Channel \`${channelId}\` · ${itemCountLabel} · Prefer the JSON API over HTML scraping.`,
    "",
  ];

  if (channelId === "icons") {
    lines.push(...buildIconsLead(siteBase));
  } else if (channelId === "datagrid") {
    // 데이터 워크스페이스 채널은 샘플 데이터 API가 주 진입점
    lines.push(
      "## Quick start",
      "",
      "Load the sample grid data in JSON:",
      "",
      "```",
      `GET ${siteBase}/api/datagrid-demo/rows`,
      `GET ${siteBase}/api/datagrid-demo/columns`,
      "```",
      "",
    );
  } else if (exampleQuery) {
    lines.push(
      "## Quick start",
      "",
      `Resolve the best-match ${channel.itemLabel} URL in one request:`,
      "",
      "```",
      `GET ${siteBase}/api/resolve?q=${exampleQuery}`,
      `GET ${siteBase}/api/resolve?q=${exampleQuery}&format=minimal`,
      "```",
      "",
      "`format=minimal` returns the CDN URL as plain text.",
      "",
    );
  } else {
    lines.push(
      "## Status",
      "",
      `No ${channel.itemLabelPlural} are published in this channel yet. /api/resolve returns 404 until assets are added.`,
      "",
    );
  }

  lines.push(
    "## Scope",
    "",
    `All search endpoints on this host return only \`${channelId}\` ${channel.itemLabelPlural}.`,
    "Add `scope=all` to /api/resolve or /api/catalog to search every OpenSphere channel; each result then carries a `channel` field.",
    "",
  );

  const variantGuide = variantGuides[channelId];
  if (variantGuide) {
    lines.push("## Variants", "", ...variantGuide, "");
  }

  lines.push(
    "## Endpoints",
    "",
    "| Endpoint | Purpose |",
    "|----------|---------|",
    `| /api/resolve?q={query} | Best-match ${channel.itemLabel} URL |`,
    `| /api/logos?q={query} | Paginated search (JSON) |`,
    `| /api/logos/{shortname} | Single ${channel.itemLabel} metadata |`,
    channelId === "icons"
      ? "| /api/catalog | Indexing dump of this channel (`items` array), not the per-query path |"
      : `| /api/catalog | Full ${channelId} catalog dump (\`items\` array) |`,
    "| /api/categories | Category list |",
    "| /i/{shortname} | Redirect to the default file on the CDN |",
    "| /openapi.json | OpenAPI 3.1 specification for this host |",
    ...(channelId === "icons"
      ? [
          "| /.well-known/mcp.json | MCP server card (points at /mcp) |",
          "| /mcp | Read-only MCP endpoint (list_packs, search_icons, get_icon) |",
        ]
      : []),
    "",
    ...buildChannelExtraSection(channelId),
    "## URL patterns",
    "",
  );

  if (channelHasDetailPages(channelId)) {
    lines.push(`- Page: ${siteBase}${channel.detailPathPrefix}/{shortname}`);
  }
  lines.push(
    `- CDN direct: ${cdnPattern}`,
    `- Shortcut redirect: ${siteBase}/i/{shortname}`,
    `- Catalog source JSON: ${getCatalogRemoteUrl(channelId)}`,
    "",
  );

  if (channelId === "logos") {
    lines.push(
      "## Aliases",
      "",
      "Common aliases map to shortnames (e.g. k8s → kubernetes, reactjs → react).",
      "",
    );
  }

  lines.push(
    "## Response fields (/api/resolve)",
    "",
    "- url — Statically CDN URL for the matched file",
    "- match.channel — channel the match belongs to",
    "- match.confidence — 0–1 relevance score",
    "- match.matchReason — how the match was made",
    "- candidates — alternative matches when ambiguous",
    "- file.role — variant actually returned",
    "- format — `svg` or `raster`; scalable is true only for SVG",
    ...(channelId === "icons"
      ? [
          "- match.source / match.pack — pack slug",
          "- match.url — CDN URL for the matched file (also returned as top-level `url`)",
          "- usage — one-line pack license or usage note",
          "- html — ready-to-use `<img>` snippet",
          "- `source` query on /api/resolve and /api/logos limits the search to that pack. Omit it to search this icons channel only.",
        ]
      : []),
    "",
    "## Other OpenSphere channels",
    "",
    ...channelIds
      .filter((otherChannelId) => otherChannelId !== channelId)
      .map((otherChannelId) => {
        const otherChannel = getChannelConfig(otherChannelId);
        return `- ${otherChannelId} — ${getChannelTagline(otherChannelId)} — ${otherChannel.siteBaseUrl}/llms.txt`;
      }),
    "",
    "## Source",
    "",
    `GitHub: ${getChannelGithubUrl(channelId)}`,
    "",
  );

  return lines.join("\n");
}
