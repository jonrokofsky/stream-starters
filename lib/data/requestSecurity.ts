import type { NextRequest } from "next/server";
import { HQ_COOKIE_NAME, verifyHqSessionToken } from "../hqAuth";

export async function hasHqSession(request: NextRequest) {
  return verifyHqSessionToken(request.cookies.get(HQ_COOKIE_NAME)?.value);
}

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin);
}
