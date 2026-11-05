type ReadingDraft = {
  date: string;
  type: "daily" | "sunday-school";
  topic: string;
  scripture?: string;
  keyVerse?: string;
  keyVerseReference?: string;
  translation?: string;
  annualTheme?: string;
  annualThemeReference?: string;
  publication?: string;
  unit?: string;
  lessonNumber?: string;
  centralTruth?: string;
  learningObjectives?: string[];
  controllingThought?: string;
  prayer?: string;
  biblePlan?: string;
  body: string;
};

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

function cleanLine(line: string): string {
  return line.replace(/[`*_<>]/g, "").replace(/<[^>]*>/g, "").trim();
}

function cleanValue(value: string): string {
  return value
    .split("\n")
    .map((line) => /^\s*[_—-]{4,}\s*$/.test(line) ? "" : cleanLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanBody(value: string): string {
  return value
    .split("\n")
    .filter((line) => !/^\s*[_—-]{4,}\s*$/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findDate(source: string): string | undefined {
  const iso = source.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const named = source.match(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (!named) return undefined;
  const month = MONTHS[named[1].toLowerCase()];
  return `${named[3]}-${month}-${named[2].padStart(2, "0")}`;
}

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function section(source: string, label: string, labels: string[]): string | undefined {
  const lines = source.split("\n");
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
  const target = normalize(label);
  const headings = lines
    .map((line, index) => ({ line: cleanLine(line), index }))
    .filter(({ line }) => labels.some((candidate) => normalize(line).startsWith(normalize(candidate))));
  const heading = headings.find(({ line }) => normalize(line).startsWith(target));
  if (!heading) return undefined;

  const startLine = lines[heading.index];
  const labelMatch = cleanLine(startLine).match(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:?\\s*(.*)$`, "i"));
  const inlineValue = labelMatch?.[1] ?? "";
  const next = headings.find(({ index }) => index > heading.index);
  const endIndex = next?.index ?? lines.length;
  const content = [inlineValue, ...lines.slice(heading.index + 1, endIndex)].join("\n");
  return cleanValue(content) || undefined;
}

function sectionByPrefix(source: string, prefix: string, nextPrefixes: string[]): string | undefined {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => cleanLine(line).toLowerCase().startsWith(prefix.toLowerCase()));
  if (start < 0) return undefined;
  const end = lines.findIndex((line, index) => index > start && nextPrefixes.some((next) => cleanLine(line).toLowerCase().startsWith(next.toLowerCase())));
  const heading = cleanLine(lines[start]);
  const suffix = heading.slice(prefix.length).replace(/^\s*[-:–—]?\s*/, "");
  const raw = [suffix, ...lines.slice(start + 1, end < 0 ? lines.length : end)].join("\n");
  return cleanValue(raw) || undefined;
}

function verseDetails(value: string): { text: string; reference?: string; translation?: string } {
  const cleaned = cleanValue(value).replace(/^['“"]|['”"]$/g, "").trim();
  const match = cleaned.match(/\(([^()]*)\)[.!?,;:]?\s*$/);
  if (!match) return { text: cleaned };
  const parts = match[1].split(/,\s*/);
  const reference = parts[0]?.trim();
  const translation = parts.length > 1 ? parts.slice(1).join(", ").trim() : undefined;
  const text = cleaned.slice(0, match.index).replace(/^['“"]|['”"]$/g, "").trim();
  return { text, ...(reference && { reference }), ...(translation && { translation }) };
}

function parseAnnualTheme(source: string): { theme?: string; reference?: string } {
  const match = source.match(/\b20\d{2}\s*:\s*([^\n(]+?)\s*\(([^)]+)\)/);
  if (!match) return {};
  return { theme: match[1].replace(/[🔨⛏️💱]/gu, "").trim(), reference: match[2].trim() };
}

function parseDaily(source: string, date: string): ReadingDraft {
  const labels = ["TOPIC", "TEXT", "KEY VERSE", "MESSAGE", "CONTROLLING THOUGHT", "PRAYER", "ONE YEAR BIBLE STUDY PLAN"];
  const topic = section(source, "TOPIC", labels);
  const scripture = section(source, "TEXT", labels);
  const verse = section(source, "KEY VERSE", labels);
  const body = section(source, "MESSAGE", labels);
  const controllingThought = section(source, "CONTROLLING THOUGHT", labels);
  const prayer = section(source, "PRAYER", labels);
  const biblePlan = section(source, "ONE YEAR BIBLE STUDY PLAN", labels);
  const verseParts = verse ? verseDetails(verse) : undefined;
  const annualTheme = parseAnnualTheme(source);

  if (!topic || !scripture || !body) throw new Error("Daily readings need TOPIC, TEXT, and MESSAGE sections.");
  if (!verseParts?.text || !verseParts.reference) throw new Error("Add the key verse and its Bible reference, for example: (Psalm 139:14, NIV).");

  return {
    date, type: "daily", topic, scripture, body,
    keyVerse: verseParts.text, keyVerseReference: verseParts.reference, translation: verseParts.translation,
    annualTheme: annualTheme.theme, annualThemeReference: annualTheme.reference,
    publication: "Evangel Daily Meal", controllingThought, prayer, biblePlan,
  };
}

function parseSundaySchool(source: string, date: string): ReadingDraft {
  const lines = source.split("\n");
  const dateIndex = lines.findIndex((line) => /\bLESSON\s+\d+/i.test(cleanLine(line)));
  const lessonNumber = dateIndex >= 0 ? cleanLine(lines[dateIndex]).match(/\bLESSON\s+(\d+)/i)?.[1] : undefined;
  const topic = lines.slice(Math.max(0, dateIndex + 1)).map(cleanLine).find((line) => /^[A-Z0-9][A-Z0-9 '&–—:,.!?()-]{3,}$/.test(line) && !/^(UNIT|MEMORY VERSE|CENTRAL TRUTH|THE LESSON OUTLINE)/.test(line));
  const unitIndex = lines.findIndex((line) => /^\s*\*?UNIT\s+\d+/i.test(line));
  const unitNumber = unitIndex >= 0 ? cleanLine(lines[unitIndex]).match(/\bUNIT\s+\d+/i)?.[0] : undefined;
  const unitTitle = unitIndex >= 0 ? lines.slice(unitIndex + 1).map(cleanLine).find(Boolean) ?? "" : "";
  const unit = [unitNumber, unitTitle].filter(Boolean).join(" — ");

  const memoryHeading = lines.find((line) => /MEMORY\s+VERSE/i.test(cleanLine(line)));
  const memoryRef = memoryHeading?.match(/MEMORY\s+VERSE\s*[–—:-]?\s*([^*]+)/i)?.[1]?.trim();
  const memoryIndex = memoryHeading ? lines.indexOf(memoryHeading) : -1;
  const memoryEnd = memoryIndex >= 0 ? lines.findIndex((line, index) => index > memoryIndex && (/^\s*_{4,}\s*$/.test(line) || /CENTRAL\s+TRUTH/i.test(cleanLine(line)))) : -1;
  const memoryText = memoryIndex >= 0 ? cleanValue(lines.slice(memoryIndex + 1, memoryEnd < 0 ? memoryIndex + 3 : memoryEnd).join("\n")) : undefined;
  const verseParts = memoryText ? verseDetails(memoryText) : undefined;
  const centralTruth = sectionByPrefix(source, "CENTRAL TRUTH", ["THE LESSON OUTLINE", "LEARNING OBJECTIVES", "Introducing the Lesson", "THE HOLY SCRIPTURES"]);
  const objectivesText = sectionByPrefix(source, "LEARNING OBJECTIVES", ["Introducing the Lesson", "THE HOLY SCRIPTURES", "Commentary and Application"]);
  const learningObjectives = objectivesText?.split("\n").map((line) => line.replace(/^\d+[.)]\s*/, "").trim()).filter((line) => line && !/^At the end of this lesson/i.test(line));
  const outlineIndex = lines.findIndex((line) => /THE LESSON OUTLINE/i.test(cleanLine(line)));
  const introIndex = lines.findIndex((line) => /INTRODUCING THE LESSON/i.test(cleanLine(line)));
  const bodyStart = outlineIndex >= 0 ? outlineIndex : introIndex;
  const body = bodyStart >= 0 ? cleanBody(lines.slice(bodyStart).join("\n")) : "";
  const publication = lines.map(cleanLine).find((line) => /SUNDAY SCHOOL LESSON/i.test(line)) ?? "Sunday School";

  if (!topic || !body) throw new Error("Sunday School readings need a lesson title and lesson outline or introduction.");
  if (!memoryText || !memoryRef) throw new Error("Add a MEMORY VERSE heading with its reference and verse text.");

  return {
    date, type: "sunday-school", topic, body, publication, unit, lessonNumber,
    keyVerse: verseParts?.text ?? memoryText, keyVerseReference: memoryRef,
    translation: memoryText.match(/\(([^()]*)\)\s*$/)?.[1]?.trim(),
    centralTruth, learningObjectives: learningObjectives?.length ? learningObjectives : undefined,
  };
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function parseTelegramReading(source: string): { draft: ReadingDraft; markdown: string } {
  const date = findDate(source);
  if (!date || !validDate(date)) throw new Error("I couldn’t find a valid reading date. Include a date like ‘Thursday November 5, 2026.’");

  const sundayMarkers = /SUNDAY SCHOOL LESSON|MEMORY VERSE|CENTRAL TRUTH/i.test(source);
  const isSunday = new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
  const draft = sundayMarkers || isSunday ? parseSundaySchool(source, date) : parseDaily(source, date);
  if (draft.type === "sunday-school" && !isSunday) throw new Error("Sunday School lessons must use a Sunday date.");

  const fields: Array<[string, string | undefined]> = [
    ["date", draft.date], ["type", draft.type], ["publication", draft.publication], ["annualTheme", draft.annualTheme],
    ["annualThemeReference", draft.annualThemeReference], ["unit", draft.unit], ["lessonNumber", draft.lessonNumber],
    ["topic", draft.topic], ["scripture", draft.scripture], ["keyVerse", draft.keyVerse],
    ["keyVerseReference", draft.keyVerseReference], ["translation", draft.translation], ["centralTruth", draft.centralTruth],
    ["controllingThought", draft.controllingThought], ["prayer", draft.prayer], ["biblePlan", draft.biblePlan],
  ];
  const frontmatter = fields.filter((entry): entry is [string, string] => typeof entry[1] === "string" && !!entry[1].trim())
    .map(([key, value]) => `${key}: ${yamlString(value)}`);
  if (draft.learningObjectives?.length) {
    frontmatter.push("learningObjectives:");
    for (const objective of draft.learningObjectives) frontmatter.push(`  - ${yamlString(objective)}`);
  }

  const markdown = `---\n${frontmatter.join("\n")}\n---\n\n${draft.body.trim()}\n`;
  return { draft, markdown };
}
