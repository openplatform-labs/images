import { NextResponse } from "next/server";
import { getLogoByShortname } from "@/lib/catalog";
import { getRequestChannelConfig } from "@/lib/request-channel";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shortname: string }> },
) {
  const channel = await getRequestChannelConfig();
  const { shortname } = await context.params;
  const logo = getLogoByShortname(shortname, channel.id);

  if (!logo) {
    return NextResponse.json(
      { error: `${channel.itemLabelKo}를 찾을 수 없습니다.` },
      { status: 404 },
    );
  }

  return NextResponse.json(logo);
}
