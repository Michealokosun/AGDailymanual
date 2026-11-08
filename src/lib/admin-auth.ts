import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ag_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) throw new Error("Admin sign-in is not configured.");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("Admin sign-in is not configured.");
  const candidateHash = createHmac("sha256", sessionSecret()).update(candidate).digest();
  const expectedHash = createHmac("sha256", sessionSecret()).update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function createAdminSession(): { value: string; maxAge: number } {
  const payload = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_SECONDS };
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [expiresAt, signature, extra] = value.split(".");
  if (!expiresAt || !signature || extra || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  try {
    const expected = Buffer.from(sign(expiresAt));
    const actual = Buffer.from(signature);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
