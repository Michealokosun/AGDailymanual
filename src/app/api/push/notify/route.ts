import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { notifyNewReading } from "@/lib/push";

export const runtime = "nodejs";

function matchesSecret(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.PUSH_WEBHOOK_SECRET?.trim();
  if (
    !expected ||
    !matchesSecret(
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null,
      expected,
    )
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; date?: unknown; topic?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; date?: unknown; topic?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
    (body.id !== undefined && (typeof body.id !== "string" || !/^\d{4}-\d{2}-\d{2}(?:--[a-z0-9-]+)?$/.test(body.id))) ||
    typeof body.topic !== "string" ||
    !body.topic.trim() ||
    body.topic.length > 250
  ) {
    return NextResponse.json(
      { error: "Invalid reading data" },
      { status: 400 },
    );
  }

  try {
    const notified = await notifyNewReading({
      date: body.date,
      id: typeof body.id === "string" ? body.id : body.date,
      topic: body.topic.trim(),
    });
    return NextResponse.json({ ok: true, notified });
  } catch (error) {
    console.error("Push notification delivery failed", error);
    return NextResponse.json(
      { error: "Could not deliver push notifications" },
      { status: 503 },
    );
  }
}
