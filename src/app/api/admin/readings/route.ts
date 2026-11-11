import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Devotional } from "@/data/readings";
import { isAdminAuthenticated, isSameOrigin } from "@/lib/admin-auth";
import { notifyNewReading } from "@/lib/push";
import { saveReading } from "@/lib/reading-store";

export const runtime = "nodejs";

type ReadingInput = {
  id?: unknown; mode?: unknown; date?: unknown; category?: unknown; title?: unknown; body?: unknown;
  scripture?: unknown; keyVerse?: unknown; keyVerseReference?: unknown; translation?: unknown;
  publication?: unknown; learningObjectives?: unknown; annualTheme?: unknown; annualThemeReference?: unknown;
  unit?: unknown; lessonNumber?: unknown; centralTruth?: unknown; controllingThought?: unknown;
  prayer?: unknown; biblePlan?: unknown;
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function memoryVerseReference(body: string): string {
  const heading = body.search(/\b(?:MEMORY\s*(?:VERSE|SCRIPTURE)|KEY\s*VERSE|SCRIPTURE\s*VERSE)\b/i);
  if (heading < 0) return "";
  const section = body.slice(heading, heading + 1500).split(/\n\s*#{1,6}\s+(?:CENTRAL TRUTH|LESSON OUTLINE|LEARNING OBJECTIVES|INTRODUCING THE LESSON)\b/i)[0];
  const reference = section.match(/((?:[1-3]\s*)?[A-Za-z]+(?:\s+[A-Za-z]+){0,3}\s+\d+:\d+(?:\s*[-–—]\s*\d+)?)(?:\s*\(([^)\n]+)\))?/);
  return reference?.[1]?.trim() ?? "";
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let input: ReadingInput;
  try {
    input = (await request.json()) as ReadingInput;
  } catch {
    return NextResponse.json({ error: "The editor sent invalid data." }, { status: 400 });
  }

  const date = stringValue(input.date);
  const requestedId = stringValue(input.id);
  const category = stringValue(input.category);
  const title = stringValue(input.title);
  const body = stringValue(input.body);
  const mode = input.mode === "update" ? "update" : input.mode === "create" ? "create" : undefined;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (!mode || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: "Choose a valid reading date." }, { status: 400 });
  }
  if (category !== "daily" && category !== "sunday-school") {
    return NextResponse.json({ error: "Choose Daily Reading or Sunday School." }, { status: 400 });
  }
  if (!title || !body) return NextResponse.json({ error: "Add a title and some body content before publishing." }, { status: 400 });
  if (Buffer.byteLength(body, "utf8") > 900_000) return NextResponse.json({ error: "The reading is too long to publish." }, { status: 413 });

  const slug = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "reading";
  const id = mode === "update" ? requestedId : `${date}--${slug}-${randomUUID().slice(0, 8)}`;
  if (!/^\d{4}-\d{2}-\d{2}(?:--[a-z0-9-]+)?$/.test(id) || (mode === "update" && !requestedId)) {
    return NextResponse.json({ error: "Choose a valid reading to update." }, { status: 400 });
  }

  const keyVerseReference = stringValue(input.keyVerseReference) || (category === "sunday-school" ? memoryVerseReference(body) : "");
  const learningObjectives = stringValue(input.learningObjectives).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const reading: Devotional = {
    id, date, kind: category, title, topic: title, body, available: true,
    scripture: category === "sunday-school" ? keyVerseReference : stringValue(input.scripture),
    keyVerse: stringValue(input.keyVerse), keyVerseReference, translation: stringValue(input.translation),
    publication: stringValue(input.publication), annualTheme: stringValue(input.annualTheme),
    annualThemeReference: stringValue(input.annualThemeReference), unit: stringValue(input.unit),
    lessonNumber: stringValue(input.lessonNumber), centralTruth: stringValue(input.centralTruth),
    controllingThought: stringValue(input.controllingThought), prayer: stringValue(input.prayer),
    biblePlan: stringValue(input.biblePlan), learningObjectives,
  };

  try {
    await saveReading(reading, mode);
    let notified = 0;
    if (mode === "create") {
      try {
        notified = await notifyNewReading({ id, date, topic: title });
      } catch (notificationError) {
        console.error("Reading saved, but push notification delivery failed", notificationError);
      }
    }
    return NextResponse.json({ ok: true, id, date, title, mode, scripture: reading.scripture, notified });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The reading could not be saved.";
    console.error("Admin reading publish failed", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
