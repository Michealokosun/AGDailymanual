import "server-only";

import { neon } from "@neondatabase/serverless";
import webpush from "web-push";
import type { PushSubscription } from "web-push";

export type StoredPushSubscription = {
  endpoint: string;
  subscription: PushSubscription;
};

function getSql() {
  const connectionString =
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL for push subscription storage");
  }
  return neon(connectionString);
}

export async function ensurePushSubscriptionsTable(): Promise<void> {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function savePushSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const sql = getSql();
  await ensurePushSubscriptionsTable();
  await sql`INSERT INTO push_subscriptions (endpoint, subscription)
    VALUES (${subscription.endpoint}, ${JSON.stringify(subscription)}::jsonb)
    ON CONFLICT (endpoint) DO UPDATE SET
      subscription = EXCLUDED.subscription,
      updated_at = NOW()`;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const sql = getSql();
  await ensurePushSubscriptionsTable();
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

async function removePushSubscription(endpoint: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function notifyNewReading({
  topic,
  date,
}: {
  topic: string;
  date: string;
}): Promise<number> {
  const sql = getSql();
  await ensurePushSubscriptionsTable();

  const queryResult = await sql`SELECT endpoint, subscription FROM push_subscriptions`;
  const rows = queryResult as StoredPushSubscription[];
  if (rows.length === 0) return 0;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web Push VAPID environment variables are not configured");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const siteUrl = process.env.APP_URL?.trim()?.replace(/\/$/, "");
  const payload = JSON.stringify({
    title: "A new devotional is available",
    body: topic,
    url: `${siteUrl || ""}/reading/${date}`,
  });

  let delivered = 0;
  let failed = 0;
  for (let index = 0; index < rows.length; index += 50) {
    const batch = rows.slice(index, index + 50);
    const results = await Promise.allSettled(
      batch.map(({ endpoint, subscription }) =>
        webpush.sendNotification(subscription, payload),
      ),
    );

    await Promise.all(
      results.map(async (result, offset) => {
        if (result.status === "fulfilled") {
          delivered += 1;
          return;
        }
        const statusCode = result.reason?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removePushSubscription(batch[offset].endpoint);
        } else {
          failed += 1;
          console.error("Push notification delivery failed", {
            statusCode,
            message:
              result.reason instanceof Error
                ? result.reason.message
                : "Unknown push delivery error",
          });
        }
      }),
    );
  }

  if (failed > 0) {
    throw new Error(`Push delivery failed for ${failed} subscription(s)`);
  }
  return delivered;
}
