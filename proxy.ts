import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { HQ_COOKIE_NAME, verifyHqSessionToken } from "./lib/hqAuth";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/hq/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(HQ_COOKIE_NAME)?.value;
  if (await verifyHqSessionToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/hq/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/hq/:path*"],
};
