const siteBase =
  process.env.SITE_BASE_URL?.replace(/\/$/, "") ?? "https://logos.opl.io.kr";

export const llmsContent = `# OpenSphere Logos — AI / Agent Guide

> SVG logo catalog. Prefer machine-readable API over HTML scraping.

## Quick start

Resolve a logo URL in one request:

\`\`\`
GET ${siteBase}/api/resolve?q=react
GET ${siteBase}/api/resolve?q=react&variant=icon
GET ${siteBase}/api/resolve?q=react&format=minimal
\`\`\`

\`format=minimal\` returns plain-text CDN URL only.

## Variants

- \`default\` — full logo (default)
- \`icon\` — square/icon variant (*-icon.svg)
- \`wordmark\` — text/wordmark variant when available

SVG files are scalable. Size is controlled in HTML/CSS (width/height), not in the CDN URL.

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| /api/resolve?q={query}&variant={default|icon|wordmark} | Best-match logo URL |
| /api/logos?q={query} | Paginated search (JSON) |
| /api/logos/{shortname} | Single logo metadata |
| /api/catalog | Full catalog dump for indexing |
| /api/categories | Category list |
| /api/tags | Tag list |
| /openapi.json | OpenAPI 3.1 specification |

## URL patterns

- Page: ${siteBase}/logo/{shortname}
- CDN direct: https://cdn.statically.io/gh/openplatform-labs/images@main/logos/{filename}.svg
- Shortcut redirect: ${siteBase}/i/{shortname} → default variant CDN URL

## Aliases

Common aliases map to shortnames (e.g. k8s → kubernetes, reactjs → react, nodejs → nodejs).

## Response fields (/api/resolve)

- url — Statically CDN URL for the matched SVG
- match.confidence — 0–1 relevance score
- match.matchReason — how the match was made
- candidates — alternative matches when ambiguous
- file.role — variant actually returned
- scalable — always true (SVG)

## Source

GitHub: https://github.com/openplatform-labs/images
`;
