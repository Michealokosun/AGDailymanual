import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
if (!connectionString) throw new Error("Set DATABASE_URL (or POSTGRES_URL) before importing readings.");

const sql = neon(connectionString);
const directory = path.resolve("content/readings");
await sql`CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  reading_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('daily', 'sunday-school')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
await sql`CREATE INDEX IF NOT EXISTS readings_date_category_idx ON readings (reading_date DESC, category)`;

const files = (await readdir(directory)).filter((file) => /^\d{4}-\d{2}-\d{2}(?:--[a-z0-9-]+)?\.md$/.test(file));
let imported = 0;
let skipped = 0;
for (const file of files) {
  const id = file.slice(0, -3);
  const source = await readFile(path.join(directory, file), "utf8");
  const { data, content } = matter(source);
  const date = id.slice(0, 10);
  if (data.date !== date || !["daily", "sunday-school"].includes(data.type) || typeof data.topic !== "string" || !content.trim()) {
    throw new Error(`${file} has invalid date, category, title, or body content.`);
  }
  const exists = await sql`SELECT id FROM readings WHERE id = ${id} LIMIT 1`;
  if (exists.length) {
    skipped += 1;
    continue;
  }
  const metadata = Object.fromEntries(Object.entries(data).filter(([key]) => !["date", "type", "topic"].includes(key)));
  await sql`INSERT INTO readings (id, reading_date, category, title, body, metadata)
    VALUES (${id}, ${date}, ${String(data.type)}, ${data.topic.trim()}, ${content.trim()}, ${JSON.stringify(metadata)}::jsonb)`;
  imported += 1;
}

console.log(`Imported ${imported} reading${imported === 1 ? "" : "s"}; skipped ${skipped} already in the database.`);
