const encoder = new TextEncoder();

export const HQ_COOKIE_NAME = "ss_hq_session";
export const HQ_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function isHqAuthConfigured() {
  return Boolean(process.env.HQ_PASSWORD && process.env.HQ_SESSION_SECRET);
}

export async function verifyHqPassword(candidate: string) {
  const password = process.env.HQ_PASSWORD;
  const secret = process.env.HQ_SESSION_SECRET;
  if (!password || !secret) return false;

  const [candidateSignature, passwordSignature] = await Promise.all([
    sign(candidate, secret),
    sign(password, secret),
  ]);
  return constantTimeEqual(candidateSignature, passwordSignature);
}

export async function createHqSessionToken() {
  const secret = process.env.HQ_SESSION_SECRET;
  if (!secret) throw new Error("HQ authentication is not configured.");

  const expiresAt = Date.now() + HQ_SESSION_MAX_AGE * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifyHqSessionToken(token?: string) {
  const secret = process.env.HQ_SESSION_SECRET;
  if (!secret || !token) return false;

  const [payload, providedSignature, extra] = token.split(".");
  const expiresAt = Number(payload);
  if (extra || !payload || !providedSignature || !Number.isFinite(expiresAt)) {
    return false;
  }
  if (expiresAt <= Date.now()) return false;

  const expectedSignature = await sign(payload, secret);
  return constantTimeEqual(providedSignature, expectedSignature);
}
