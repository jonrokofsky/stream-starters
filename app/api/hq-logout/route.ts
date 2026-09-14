import { NextResponse } from "next/server";
import { HQ_COOKIE_NAME } from "../../../lib/hqAuth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/hq/login", request.url), 303);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
  } as const;

  response.cookies.set(HQ_COOKIE_NAME, "", { ...cookieOptions, path: "/" });
  response.cookies.set(HQ_COOKIE_NAME, "", { ...cookieOptions, path: "/hq" });
  return response;
}
