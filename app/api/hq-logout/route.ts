import { NextResponse } from "next/server";
import { HQ_COOKIE_NAME } from "../../../lib/hqAuth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/hq/login", request.url), 303);
  response.cookies.set(HQ_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/hq",
    maxAge: 0,
  });
  return response;
}
