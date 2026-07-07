const siteBaseUrl =
  process.env.SITE_BASE_URL?.replace(/\/$/, "") ?? "https://logos.opl.io.kr";

export function getOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "OpenSphere Logos API",
      version: "1.0.0",
      description:
        "Machine-readable API for discovering SVG brand logos and CDN URLs.",
    },
    servers: [{ url: siteBaseUrl }],
    paths: {
      "/api/resolve": {
        get: {
          summary: "Resolve logo query to CDN URL",
          operationId: "resolveLogo",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Logo name, shortname, or alias (e.g. react, k8s)",
            },
            {
              name: "variant",
              in: "query",
              schema: {
                type: "string",
                enum: ["default", "icon", "wordmark"],
                default: "default",
              },
            },
            {
              name: "format",
              in: "query",
              schema: { type: "string", enum: ["json", "minimal"], default: "json" },
              description: "minimal returns plain-text URL",
            },
          ],
          responses: {
            "200": { description: "Match found" },
            "404": { description: "No confident match" },
          },
        },
      },
      "/api/catalog": {
        get: {
          summary: "Full logo catalog dump",
          operationId: "getCatalog",
          parameters: [
            {
              name: "fields",
              in: "query",
              schema: { type: "string" },
              description: "Comma-separated field filter",
            },
          ],
          responses: { "200": { description: "Catalog JSON" } },
        },
      },
      "/api/logos": {
        get: {
          summary: "Search logos (paginated)",
          operationId: "listLogos",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            {
              name: "pageSize",
              in: "query",
              schema: { type: "integer", default: 48, maximum: 100 },
            },
          ],
          responses: { "200": { description: "Logo list" } },
        },
      },
      "/api/logos/{shortname}": {
        get: {
          summary: "Get logo by shortname",
          operationId: "getLogo",
          parameters: [
            {
              name: "shortname",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Logo detail" },
            "404": { description: "Not found" },
          },
        },
      },
      "/i/{shortname}": {
        get: {
          summary: "Redirect to default variant CDN URL",
          operationId: "redirectLogo",
          parameters: [
            {
              name: "shortname",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "variant",
              in: "query",
              schema: {
                type: "string",
                enum: ["default", "icon", "wordmark"],
              },
            },
          ],
          responses: {
            "302": { description: "Redirect to CDN" },
            "404": { description: "Not found" },
          },
        },
      },
    },
  };
}
