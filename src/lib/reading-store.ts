import "server-only";

import { neon } from "@neondatabase/serverless";
import type { Devotional } from "@/data/readings";

function getSql() {
  const connectionString = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  if (!connectionString) throw new Error("Missing DATABASE_URL for reading storage");
  return neon(connectionString);
}

export async function ensureReadingsTable(): Promise<void> {
  const sql = getSql();
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
}

function fromRow(row: Record<string, unknown>): Devotional {
  const metadata = row.metadata && typeof row.metadata === "object"
    ? row.metadata as Record<string, unknown>
    : {};
  const date = row.reading_date instanceof Date
    ? row.reading_date.toISOString().slice(0, 10)
    : String(row.reading_date).slice(0, 10);
  const kind = row.category === "sunday-school" ? "sunday-school" : "daily";
  const text = (key: string) => typeof metadata[key] === "string" ? metadata[key] as string : undefined;
  const learningObjectives = Array.isArray(metadata.learningObjectives)
    ? metadata.learningObjectives.filter((item): item is string => typeof item === "string")
    : undefined;

  return {
    id: String(row.id), date, kind, title: String(row.title), topic: String(row.title),
    body: String(row.body), available: true,
    ...(text("publication") && { publication: text("publication") }),
    ...(text("unit") && { unit: text("unit") }),
    ...(text("lessonNumber") && { lessonNumber: text("lessonNumber") }),
    ...(text("annualTheme") && { annualTheme: text("annualTheme") }),
    ...(text("annualThemeReference") && { annualThemeReference: text("annualThemeReference") }),
    ...(text("scripture") && { scripture: kind === "sunday-school" ? text("keyVerseReference") : text("scripture") }),
    ...(text("keyVerse") && { keyVerse: text("keyVerse") }),
    ...(text("keyVerseReference") && { keyVerseReference: text("keyVerseReference") }),
    ...(text("translation") && { translation: text("translation") }),
    ...(text("centralTruth") && { centralTruth: text("centralTruth") }),
    ...(learningObjectives?.length && { learningObjectives }),
    ...(text("controllingThought") && { controllingThought: text("controllingThought") }),
    ...(text("prayer") && { prayer: text("prayer") }),
    ...(text("biblePlan") && { biblePlan: text("biblePlan") }),
  };
}

export async function listReadings(): Promise<Devotional[]> {
  await ensureReadingsTable();
  const sql = getSql();
  const rows = await sql`SELECT id, reading_date, category, title, body, metadata
    FROM readings ORDER BY reading_date DESC, category, title`;
  return (rows as Record<string, unknown>[]).map(fromRow);
}

export async function findReading(id: string): Promise<Devotional | undefined> {
  await ensureReadingsTable();
  const sql = getSql();
  const rows = await sql`SELECT id, reading_date, category, title, body, metadata
    FROM readings WHERE id = ${id} LIMIT 1`;
  return rows.length ? fromRow(rows[0] as Record<string, unknown>) : undefined;
}

export async function saveReading(reading: Devotional, mode: "create" | "update"): Promise<void> {
  await ensureReadingsTable();
  const sql = getSql();
  const existing = await sql`SELECT id FROM readings WHERE id = ${reading.id} LIMIT 1`;
  if (mode === "create" && existing.length) throw new Error("A reading with this ID already exists. Refresh the list and try again.");
  if (mode === "update" && !existing.length) throw new Error("This reading no longer exists in the database. Refresh the list and try again.");

  const metadata = {
    publication: reading.publication,
    unit: reading.unit,
    lessonNumber: reading.lessonNumber,
    annualTheme: reading.annualTheme,
    annualThemeReference: reading.annualThemeReference,
    scripture: reading.scripture,
    keyVerse: reading.keyVerse,
    keyVerseReference: reading.keyVerseReference,
    translation: reading.translation,
    centralTruth: reading.centralTruth,
    learningObjectives: reading.learningObjectives,
    controllingThought: reading.controllingThought,
    prayer: reading.prayer,
    biblePlan: reading.biblePlan,
  };

  if (mode === "create") {
    await sql`INSERT INTO readings (id, reading_date, category, title, body, metadata)
      VALUES (${reading.id}, ${reading.date}, ${reading.kind}, ${reading.title}, ${reading.body ?? ""}, ${JSON.stringify(metadata)}::jsonb)`;
  } else {
    await sql`UPDATE readings SET reading_date = ${reading.date}, category = ${reading.kind},
      title = ${reading.title}, body = ${reading.body ?? ""}, metadata = ${JSON.stringify(metadata)}::jsonb,
      updated_at = NOW() WHERE id = ${reading.id}`;
  }
}
