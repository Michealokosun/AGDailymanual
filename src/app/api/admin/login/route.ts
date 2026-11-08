import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSession, isSameOrigin, passwordMatches } from "@/lib/admin-auth";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "Enter your admin password." }, { status: 400 });
  }
  if (typeof body.password !== "string" || !body.password) {
    return NextResponse.json({ error: "Enter your admin password." }, { status: 400 });
  }
  try {
    if (!passwordMatches(body.password)) {
      return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
    }
    const session = createAdminSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: session.maxAge,
    });
    return response;
  } catch (error) {
    console.error("Admin sign-in is not configured", error);
    return NextResponse.json({ error: "Admin sign-in is not configured yet." }, { status: 503 });
  }
}
