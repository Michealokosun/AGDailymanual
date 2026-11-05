import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications are not configured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    { publicKey },
    { headers: { "cache-control": "no-store" } },
  );
}
