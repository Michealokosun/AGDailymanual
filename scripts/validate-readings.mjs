import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const directory = path.resolve("content/readings");
const files = await readdir(directory);
const markdownFiles = files.filter((file) => file.toLowerCase().endsWith(".md") && file !== "TEMPLATE.md");
const failures = [];

for (const fileName of markdownFiles) {
  if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(fileName)) {
    failures.push(`${fileName}: name each reading YYYY-MM-DD.md`);
    continue;
  }

  const filePath = path.join(directory, fileName);
  try {
    const source = await readFile(filePath, "utf8");
    const { data, content } = matter(source);
    const id = fileName.slice(0, -3);
    const parsedDate = new Date(`${id}T00:00:00Z`);
    const validDate = !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === id;

    if (!validDate) failures.push(`${fileName}: filename must contain a real calendar date`);
    if (data.date !== id) failures.push(`${fileName}: front matter date must match the filename (${id})`);
    if (data.type !== "daily" && data.type !== "sunday-school") failures.push(`${fileName}: type must be daily or sunday-school`);
    if (typeof data.topic !== "string" || !data.topic.trim()) failures.push(`${fileName}: topic is required`);
    if (!content.trim()) failures.push(`${fileName}: add the message or lesson below the front matter`);
  } catch (error) {
    failures.push(`${fileName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error("Reading content check failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Reading content check passed (${markdownFiles.length} reading${markdownFiles.length === 1 ? "" : "s"}).`);
}
