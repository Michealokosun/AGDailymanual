import { NextResponse } from "next/server";
import webpush from "web-push";
import type { PushSubscription } from "web-push";
import {
  deletePushSubscription,
  savePushSubscription,
} from "@/lib/push";

export const runtime = "nodejs";

type IncomingSubscription = {
  endpoint?: unknown;
  expirationTime?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function validSubscription(value: IncomingSubscription): value is {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
} {
  if (typeof value.endpoint !== "string") return false;
  try {
    if (new URL(value.endpoint).protocol !== "https:") return false;
  } catch {
    return false;
  }
  return (
    typeof value.keys?.p256dh === "string" &&
    typeof value.keys.auth === "string"
  );
}

export async function POST(request: Request): Promise<Response> {
  let value: IncomingSubscription;
  try {
    value = (await request.json()) as IncomingSubscription;
  } catch {
    return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
  }

  if (!validSubscription(value)) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  const subscription: PushSubscription = {
    endpoint: value.endpoint,
    expirationTime:
      typeof value.expirationTime === "number" ? value.expirationTime : null,
    keys: { p256dh: value.keys.p256dh, auth: value.keys.auth },
  };

  try {
    await savePushSubscription(subscription);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not save push subscription", error);
    return NextResponse.json(
      { error: "Push subscription storage is not configured" },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  let endpoint: unknown;
  try {
    ({ endpoint } = (await request.json()) as { endpoint?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Missing subscription endpoint" }, { status: 400 });
  }
  try {
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not remove push subscription", error);
    return NextResponse.json(
      { error: "Push subscription storage is not configured" },
      { status: 503 },
    );
  }
}
