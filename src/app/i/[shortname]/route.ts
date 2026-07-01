import { NextResponse } from "next/server";
import { getLogoByShortname } from "@/lib/catalog";
import { pickLogoFile } from "@/lib/logo-files";
import { ensureCatalogSynced } from "@/lib/server-catalog";
import type { LogoVariant } from "@/lib/types";

export const runtime = "nodejs";

function parseVariant(value: string | null): LogoVariant {
  if (value === "icon" || value === "wordmark") return value;
  return "default";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ shortname: string }> },
) {
  await ensureCatalogSynced();
  const { shortname } = await context.params;
  const { searchParams } = new URL(request.url);
  const variant = parseVariant(searchParams.get("variant"));

  const logo = getLogoByShortname(shortname);
  if (!logo) {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }

  const file = pickLogoFile(logo.files, logo.shortname, variant);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.redirect(file.staticallyUrl, 302);
}
