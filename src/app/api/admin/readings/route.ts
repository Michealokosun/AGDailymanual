import matter from "gray-matter";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated, isSameOrigin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type ReadingInput = {
  id?: unknown;
  mode?: unknown;
  date?: unknown;
  category?: unknown;
  title?: unknown;
  body?: unknown;
  scripture?: unknown;
  keyVerse?: unknown;
  keyVerseReference?: unknown;
  translation?: unknown;
  publication?: unknown;
  learningObjectives?: unknown;
  annualTheme?: unknown;
  annualThemeReference?: unknown;
  unit?: unknown;
  lessonNumber?: unknown;
  centralTruth?: unknown;
  controllingThought?: unknown;
  prayer?: unknown;
  biblePlan?: unknown;
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

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function saveMarkdown(id: string, date: string, markdown: string, mode: "create" | "update"): Promise<void> {
  const owner = requiredEnvironment("GITHUB_OWNER");
  const repository = requiredEnvironment("GITHUB_REPO");
  const token = requiredEnvironment("GITHUB_TOKEN");
  const branch = process.env.GITHUB_BRANCH?.trim() || process.env.VERCEL_GIT_COMMIT_REF?.trim() || "master";
  const path = `content/readings/${id}.md`;
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${path}`;
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
    "content-type": "application/json",
  };
  const existing = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  let sha: string | undefined;
  if (existing.ok) {
    if (mode === "create") throw new Error("A reading with this ID already exists. Refresh the list and try again.");
    const item = (await existing.json()) as { sha?: unknown };
    if (typeof item.sha !== "string") throw new Error("GitHub did not return the current file version.");
    sha = item.sha;
  } else if (existing.status === 404 && mode === "update") {
    throw new Error("This reading no longer exists in GitHub. Refresh the list and try again.");
  } else if (existing.status !== 404) {
    throw new Error(`GitHub could not check the reading (status ${existing.status}).`);
  }

  const saved = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `${mode === "create" ? "Add" : "Update"} reading for ${date}`,
      content: Buffer.from(markdown, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!saved.ok) {
    const details = (await saved.json().catch(() => null)) as { message?: unknown } | null;
    const reason = typeof details?.message === "string" ? ` ${details.message}` : "";
    throw new Error(`GitHub could not save the reading (status ${saved.status}).${reason}`);
  }
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

  const keyVerseReference = stringValue(input.keyVerseReference) ||
    (category === "sunday-school" ? memoryVerseReference(body) : "");
  const attributes: Record<string, unknown> = {
    date,
    type: category,
    topic: title,
  };
  const fields: Array<[string, unknown]> = [
    ["scripture", category === "sunday-school" ? keyVerseReference : stringValue(input.scripture)],
    ["keyVerse", stringValue(input.keyVerse)],
    ["keyVerseReference", keyVerseReference],
    ["translation", stringValue(input.translation)],
    ["publication", stringValue(input.publication)],
    ["annualTheme", stringValue(input.annualTheme)],
    ["annualThemeReference", stringValue(input.annualThemeReference)],
    ["unit", stringValue(input.unit)],
    ["lessonNumber", stringValue(input.lessonNumber)],
    ["centralTruth", stringValue(input.centralTruth)],
    ["controllingThought", stringValue(input.controllingThought)],
    ["prayer", stringValue(input.prayer)],
    ["biblePlan", stringValue(input.biblePlan)],
  ];
  for (const [key, value] of fields) if (value) attributes[key] = value;
  const learningObjectives = stringValue(input.learningObjectives).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (learningObjectives.length) attributes.learningObjectives = learningObjectives;

  try {
    await saveMarkdown(id, date, matter.stringify(body, attributes), mode);
    return NextResponse.json({ ok: true, id, date, title, mode, scripture: category === "sunday-school" ? keyVerseReference : stringValue(input.scripture) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The reading could not be saved.";
    console.error("Admin reading publish failed", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
