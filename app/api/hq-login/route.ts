import { NextResponse } from "next/server";
import { createHqSessionToken, HQ_COOKIE_NAME, HQ_SESSION_MAX_AGE, isHqAuthConfigured, verifyHqPassword } from "../../../lib/hqAuth";

function safeDestination(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/hq";
  return value.startsWith("/hq") && !value.startsWith("//") ? value : "/hq";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get("password");
  const destination = safeDestination(formData.get("next"));

  if (!isHqAuthConfigured()) {
    return NextResponse.redirect(new URL("/hq/login?error=config", request.url), 303);
  }
  if (typeof password !== "string" || !(await verifyHqPassword(password))) {
    const loginUrl = new URL("/hq/login", request.url);
    loginUrl.searchParams.set("error", "invalid");
    loginUrl.searchParams.set("next", destination);
    return NextResponse.redirect(loginUrl, 303);
  }

  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(HQ_COOKIE_NAME, await createHqSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/hq",
    maxAge: HQ_SESSION_MAX_AGE,
  });
  return response;
}
