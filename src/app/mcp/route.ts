import { resolveChannelFromHost } from "@/lib/channel";
import {
  getIconForAgent,
  listIconPacksForAgent,
  searchIconsForAgent,
} from "@/lib/icon-agent";
import { ensureCatalogSynced } from "@/lib/server-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
const DEFAULT_PROTOCOL = "2025-03-26";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
  "Cache-Control": "no-store",
};

const tools = [
  {
    name: "list_packs",
    description:
      "List icon packs on icons.opl.io.kr (slug, label, count, usage note). Call this before searching.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "search_icons",
    description:
      "Search icons in one pack when pack is set, otherwise across the icons channel. Returns shortname, name, pack, and CDN url.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name or shortname fragment" },
        pack: { type: "string", description: "Pack slug, for example azure" },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_icon",
    description: "Fetch one icon by exact shortname, including the CDN url and usage note.",
    inputSchema: {
      type: "object",
      properties: {
        shortname: { type: "string" },
      },
      required: ["shortname"],
      additionalProperties: false,
    },
  },
];

type JsonRpcId = string | number | null;

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

function jsonResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function toolText(value: unknown, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    isError,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function callTool(name: string, args: Record<string, unknown>) {
  if (name === "list_packs") {
    return toolText({ packs: listIconPacksForAgent() });
  }

  if (name === "search_icons") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (!query) {
      return toolText({ error: "query is required" }, true);
    }
    const pack = typeof args.pack === "string" ? args.pack : undefined;
    const limit = typeof args.limit === "number" ? args.limit : 8;
    return toolText({
      query,
      pack: pack?.trim().toLowerCase() || null,
      icons: searchIconsForAgent(query, pack, limit),
    });
  }

  if (name === "get_icon") {
    const shortname = typeof args.shortname === "string" ? args.shortname.trim() : "";
    if (!shortname) {
      return toolText({ error: "shortname is required" }, true);
    }
    const icon = getIconForAgent(shortname);
    if (!icon) return toolText({ error: "Icon not found", shortname }, true);
    return toolText(icon);
  }

  return null;
}

function handleMessage(message: JsonRpcMessage): unknown | null {
  const id = message.id ?? null;
  const method = message.method ?? "";
  const hasId = message.id !== undefined && message.id !== null;

  if (!hasId || method.startsWith("notifications/")) {
    return null;
  }

  if (message.jsonrpc && message.jsonrpc !== "2.0") {
    return jsonError(id, -32600, "Invalid Request");
  }

  if (method === "initialize") {
    const params = asRecord(message.params);
    const requested =
      typeof params.protocolVersion === "string" ? params.protocolVersion : DEFAULT_PROTOCOL;
    const protocolVersion = PROTOCOL_VERSIONS.includes(
      requested as (typeof PROTOCOL_VERSIONS)[number],
    )
      ? requested
      : DEFAULT_PROTOCOL;
    return jsonResult(id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "opensphere-icons", version: "1.0.0" },
      instructions:
        "Read-only icon catalog for https://icons.opl.io.kr. Call list_packs, then search_icons with a pack slug, or get_icon by shortname. No upload or delete tools.",
    });
  }

  if (method === "ping") return jsonResult(id, {});

  if (method === "tools/list") return jsonResult(id, { tools });

  if (method === "tools/call") {
    const params = asRecord(message.params);
    const name = typeof params.name === "string" ? params.name : "";
    const args = asRecord(params.arguments);
    const result = callTool(name, args);
    if (!result) return jsonError(id, -32602, `Unknown tool: ${name}`);
    return jsonResult(id, result);
  }

  return jsonError(id, -32601, `Method not found: ${method}`);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { ...corsHeaders, Allow: "POST, OPTIONS" },
  });
}

export async function DELETE() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { ...corsHeaders, Allow: "POST, OPTIONS" },
  });
}

export async function POST(request: Request) {
  const channelId = resolveChannelFromHost(request.headers.get("host"));
  if (channelId !== "icons") {
    return Response.json(
      { error: "MCP is published on https://icons.opl.io.kr/mcp" },
      { status: 404, headers: corsHeaders },
    );
  }

  await ensureCatalogSynced("icons");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(jsonError(null, -32700, "Parse error"), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (Array.isArray(body)) {
    const responses = body
      .filter((item): item is JsonRpcMessage => Boolean(item) && typeof item === "object")
      .map((item) => handleMessage(item))
      .filter((item) => item !== null);
    if (responses.length === 0) {
      return new Response(null, { status: 202, headers: corsHeaders });
    }
    return Response.json(responses, { headers: corsHeaders });
  }

  if (!body || typeof body !== "object") {
    return Response.json(jsonError(null, -32600, "Invalid Request"), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const response = handleMessage(body as JsonRpcMessage);
  if (response === null) {
    return new Response(null, { status: 202, headers: corsHeaders });
  }

  return Response.json(response, { headers: corsHeaders });
}
