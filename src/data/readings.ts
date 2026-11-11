import "server-only";

import { findReading, listReadings } from "@/lib/reading-store";

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

function placeholder(id: string): Devotional {
  const date = id.slice(0, 10);
  const sundaySchool = new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
  return {
    id,
    date,
    kind: sundaySchool ? "sunday-school" : "daily",
    title: sundaySchool ? "Sunday School" : "Daily Reading",
    available: false,
  };
}

export async function getReading(id: string): Promise<Devotional> {
  if (!/^\d{4}-\d{2}-\d{2}(?:--[a-z0-9-]+)?$/.test(id)) return placeholder("invalid-date");
  const reading = await findReading(id);
  if (reading) return reading;
  if (/^\d{4}-\d{2}-\d{2}$/.test(id)) {
    const sameDate = (await listReadings()).find((item) => item.date === id);
    if (sameDate) return sameDate;
  }
  return placeholder(id);
}

export async function getReadingsForDates(ids: string[]): Promise<Record<string, Devotional>> {
  const entries = await Promise.all(ids.map(async (id) => [id, await getReading(id)] as const));
  return Object.fromEntries(entries);
}

export async function getAllReadings(): Promise<Devotional[]> {
  return listReadings();
}
