import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveChannelFromHost } from "@/lib/channel";

export function middleware(request: NextRequest) {
  const channel = resolveChannelFromHost(request.headers.get("host"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-channel", channel);

  // 예전 아이콘 팩 경로 → 픽토그램 채널
  if (channel === "icons") {
    const source = request.nextUrl.searchParams.get("source")?.toLowerCase();
    if (source === "pictograms" || source === "carbon-pictograms") {
      return NextResponse.redirect("https://pictograms.opl.io.kr/", 308);
    }
    if (source === "icon-system") {
      const target = request.nextUrl.clone();
      target.searchParams.set("source", "core-16");
      return NextResponse.redirect(target, 308);
    }
    const legacyMatch = request.nextUrl.pathname.match(
      /^\/icon\/icon-system-(.+)$/,
    );
    if (legacyMatch) {
      return NextResponse.redirect(
        new URL(`/icon/core-16-${legacyMatch[1]}${request.nextUrl.search}`, request.url),
        308,
      );
    }
    const match = request.nextUrl.pathname.match(
      /^\/icon\/pictograms-(.+)$/,
    );
    if (match) {
      return NextResponse.redirect(
        `https://pictograms.opl.io.kr/pictogram/${match[1]}`,
        308,
      );
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
