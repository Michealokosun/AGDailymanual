import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type Devotional = {
  id: string;
  date: string;
  kind: "daily" | "sunday-school";
  title: string;
  publication?: string;
  unit?: string;
  lessonNumber?: string;
  annualTheme?: string;
  annualThemeReference?: string;
  topic?: string;
  scripture?: string;
  keyVerse?: string;
  keyVerseReference?: string;
  translation?: string;
  centralTruth?: string;
  learningObjectives?: string[];
  body?: string;
  controllingThought?: string;
  prayer?: string;
  biblePlan?: string;
  available: boolean;
};

type Frontmatter = Record<string, unknown>;
const readingsDirectory = path.join(process.cwd(), "content", "readings");
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(id: string): boolean {
  if (!datePattern.test(id)) return false;
  const parsed = new Date(`${id}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === id;
}

function textField(data: Frontmatter, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function listField(data: Frontmatter, key: string): string[] | undefined {
  const value = data[key];
  if (!Array.isArray(value)) return undefined;
  const entries = value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  return entries.length ? entries : undefined;
}

function placeholder(id: string): Devotional {
  const sundaySchool = new Date(`${id}T12:00:00Z`).getUTCDay() === 0;
  return {
    id,
    date: id,
    kind: sundaySchool ? "sunday-school" : "daily",
    title: sundaySchool ? "Sunday School" : "Daily Reading",
    available: false,
  };
}

async function readMarkdown(fileId: string): Promise<Devotional | undefined> {
  const filePath = path.join(readingsDirectory, `${fileId}.md`);
  let file: string;
  try {
    file = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }

  const { data, content } = matter(file);
  const metadata = data as Frontmatter;
  const fileDate = textField(metadata, "date");
  const kind = textField(metadata, "type");
  const topic = textField(metadata, "topic");
  const body = content.trim();

  if (!fileDate || !isValidDate(fileDate)) throw new Error(`Reading file ${fileId}.md must have a valid front matter date`);
  if (kind !== "daily" && kind !== "sunday-school") throw new Error(`Reading file ${fileId}.md must set type to "daily" or "sunday-school"`);
  if (!topic) throw new Error(`Reading file ${fileId}.md is missing its required topic`);
  if (!body) throw new Error(`Reading file ${fileId}.md has no Markdown content below its front matter`);

  const keyVerse = textField(metadata, "keyVerse");
  const keyVerseReference = textField(metadata, "keyVerseReference");
  const scripture = kind === "sunday-school"
    ? keyVerseReference
    : textField(metadata, "scripture");
  const translation = textField(metadata, "translation");
  const annualTheme = textField(metadata, "annualTheme");
  const annualThemeReference = textField(metadata, "annualThemeReference");
  const controllingThought = textField(metadata, "controllingThought");
  const prayer = textField(metadata, "prayer");
  const biblePlan = textField(metadata, "biblePlan");
  const publication = textField(metadata, "publication");
  const unit = textField(metadata, "unit");
  const lessonNumber = textField(metadata, "lessonNumber");
  const centralTruth = textField(metadata, "centralTruth");
  const learningObjectives = listField(metadata, "learningObjectives");

  return {
    id: fileId,
    date: fileDate,
    kind,
    title: topic,
    topic,
    body,
    available: true,
    ...(publication && { publication }),
    ...(unit && { unit }),
    ...(lessonNumber && { lessonNumber }),
    ...(annualTheme && { annualTheme }),
    ...(annualThemeReference && { annualThemeReference }),
    ...(scripture && { scripture }),
    ...(keyVerse && { keyVerse }),
    ...(keyVerseReference && { keyVerseReference }),
    ...(translation && { translation }),
    ...(centralTruth && { centralTruth }),
    ...(learningObjectives && { learningObjectives }),
    ...(controllingThought && { controllingThought }),
    ...(prayer && { prayer }),
    ...(biblePlan && { biblePlan }),
  };
}

export async function getReading(id: string): Promise<Devotional> {
  if (/^\d{4}-\d{2}-\d{2}$/.test(id) && isValidDate(id)) {
    const readings = await getAllReadings();
    return readings.find((reading) => reading.id === id) ?? readings.find((reading) => reading.date === id) ?? placeholder(id);
  }
  if (!/^\d{4}-\d{2}-\d{2}(?:--[a-z0-9-]+)?$/.test(id) || !isValidDate(id.slice(0, 10))) return placeholder("invalid-date");
  const reading = await readMarkdown(id);
  return reading ?? placeholder(id.slice(0, 10));
}

export async function getReadingsForDates(ids: string[]): Promise<Record<string, Devotional>> {
  const entries = await Promise.all(ids.map(async (id) => [id, await getReading(id)] as const));
  return Object.fromEntries(entries);
}

export async function getAllReadings(): Promise<Devotional[]> {
  let files: string[];
  try {
    files = await readdir(readingsDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const ids = files
    .filter((file) => /^\d{4}-\d{2}-\d{2}(?:--[a-z0-9-]+)?\.md$/.test(file))
    .map((file) => file.slice(0, -3))
    .sort();
  const readings = await Promise.all(ids.map((id) => readMarkdown(id).then((reading) => reading!)));
  return readings.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
}
