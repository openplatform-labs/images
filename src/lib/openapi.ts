import {
  getChannelConfig,
  getChannelServiceName,
  type ChannelId,
} from "./channel";

// 채널별 variant 허용값 (그 외 채널은 단일 파일이라 default만 의미 있음)
const variantEnumByChannel: Partial<Record<ChannelId, string[]>> = {
  logos: ["default", "icon", "wordmark", "color", "light", "dark", "mono"],
  images: ["default", "thumb", "small", "medium", "large", "orig"],
};

const scopeParameter = {
  name: "scope",
  in: "query",
  schema: { type: "string", enum: ["all"] },
  description:
    "Omit to search only this channel. Use `all` to search every OpenSphere channel.",
};

const iconSourceParameter = {
  name: "source",
  in: "query",
  schema: { type: "string" },
  description:
    "Icon pack slug (azure, carbon, core-16, file-explorer). When set, search only that pack. Omit to search the icons channel.",
};

function jsonResponse(description: string) {
  return { description, content: { "application/json": {} } };
}

function buildChannelExtraPaths(channelId: ChannelId): Record<string, unknown> {
  if (channelId === "icons") {
    return {
      "/api/packs": {
        get: {
          summary: "List icon packs with preview icons",
          operationId: "listIconPacks",
          responses: { "200": jsonResponse("Icon pack list") },
        },
      },
    };
  }

  if (channelId === "datagrid") {
    const demoPath = (kind: string, summary: string) => ({
      get: {
        summary,
        operationId: `getDatagridDemo${kind[0].toUpperCase()}${kind.slice(1)}`,
        responses: { "200": jsonResponse(summary) },
      },
    });
    return {
      "/api/datagrid-demo/rows": demoPath("rows", "Sample order rows"),
      "/api/datagrid-demo/columns": demoPath("columns", "Column definitions"),
      "/api/datagrid-demo/view": demoPath("view", "Default view state"),
    };
  }

  return {};
}

/** 현재 채널 전용 OpenAPI 3.1 스펙 */
export function getOpenApiSpec(channelId: ChannelId) {
  const channel = getChannelConfig(channelId);
  const itemLabel = channel.itemLabel;
  const itemLabelPlural = channel.itemLabelPlural;
  const variantEnum = variantEnumByChannel[channelId] ?? ["default"];

  const variantParameter = {
    name: "variant",
    in: "query",
    schema: { type: "string", enum: variantEnum, default: "default" },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: `${getChannelServiceName(channelId)} API`,
      version: channelId === "icons" ? "1.2.0" : "1.1.0",
      description:
        channelId === "icons"
          ? `Machine-readable API for icons on ${channel.siteBaseUrl}. Start with /api/packs, then /api/resolve?source={pack}. /api/catalog is an indexing dump, not the per-query path. MCP: ${channel.siteBaseUrl}/mcp`
          : `Machine-readable API for ${itemLabelPlural} on ${channel.siteBaseUrl}. ${channel.heroDescription} Results are limited to the \`${channelId}\` channel unless scope=all is given.`,
    },
    servers: [{ url: channel.siteBaseUrl }],
    externalDocs: {
      description: "Agent guide",
      url: `${channel.siteBaseUrl}/llms.txt`,
    },
    paths: {
      "/api/resolve": {
        get: {
          summary: `Resolve a query to the best-match ${itemLabel} CDN URL`,
          operationId: "resolveItem",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: `${itemLabel} name or shortname`,
            },
            variantParameter,
            {
              name: "format",
              in: "query",
              schema: { type: "string", enum: ["json", "minimal"], default: "json" },
              description: "minimal returns the CDN URL as plain text",
            },
            scopeParameter,
            ...(channelId === "icons" ? [iconSourceParameter] : []),
          ],
          responses: {
            "200": jsonResponse(
              channelId === "icons"
                ? "Match found. JSON includes url, match.source, match.pack, usage, and html. format=minimal is one CDN URL line."
                : "Match found",
            ),
            "404": jsonResponse("No confident match"),
          },
        },
      },
      "/api/catalog": {
        get: {
          summary:
            channelId === "icons"
              ? "Indexing dump of the icons channel (items array). Not the per-query path."
              : `Full ${channelId} catalog dump (items array)`,
          operationId: "getCatalog",
          parameters: [
            {
              name: "fields",
              in: "query",
              schema: { type: "string" },
              description: "Comma-separated field filter (e.g. shortname,name,url)",
            },
            scopeParameter,
          ],
          responses: { "200": jsonResponse("Catalog JSON") },
        },
      },
      "/api/logos": {
        get: {
          summary: `Search ${itemLabelPlural} in this channel (paginated)`,
          operationId: "listItems",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            ...(channelId === "icons" ? [iconSourceParameter] : []),
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            {
              name: "pageSize",
              in: "query",
              schema: { type: "integer", default: 48, maximum: 100 },
            },
          ],
          responses: { "200": jsonResponse(`${itemLabel} list`) },
        },
      },
      "/api/logos/{shortname}": {
        get: {
          summary: `Get ${itemLabel} by shortname`,
          operationId: "getItem",
          parameters: [
            {
              name: "shortname",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": jsonResponse(`${itemLabel} detail`),
            "404": jsonResponse("Not found"),
          },
        },
      },
      "/api/categories": {
        get: {
          summary: "List categories in this channel",
          operationId: "listCategories",
          responses: { "200": jsonResponse("Category list") },
        },
      },
      "/i/{shortname}": {
        get: {
          summary: "Redirect to the CDN file",
          operationId: "redirectItem",
          parameters: [
            {
              name: "shortname",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            variantParameter,
          ],
          responses: {
            "302": { description: "Redirect to CDN" },
            "404": jsonResponse("Not found"),
          },
        },
      },
      ...buildChannelExtraPaths(channelId),
    },
  };
}
