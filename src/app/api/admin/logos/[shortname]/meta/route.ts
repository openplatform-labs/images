import { NextResponse } from "next/server";
import { updateLogoMetadata } from "@/lib/catalog";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shortname: string }> },
) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  const { shortname } = await context.params;
  const body = (await request.json()) as {
    categoryIds?: number[];
    tagIds?: number[];
  };

  updateLogoMetadata(
    shortname,
    body.categoryIds ?? [],
    body.tagIds ?? [],
  );

  return NextResponse.json({ ok: true });
}
