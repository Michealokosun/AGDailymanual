import { readFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import matter from "gray-matter";

const before = process.env.GITHUB_EVENT_BEFORE;
const commit = process.env.GITHUB_SHA;
const notifyUrl = process.env.PUSH_NOTIFY_URL?.replace(/\/$/, "");
const secret = process.env.PUSH_WEBHOOK_SECRET;

if (!before || !commit || !notifyUrl || !secret) {
  throw new Error("GitHub push notification environment is incomplete");
}

const allZeroBefore = /^0+$/.test(before);
const diffArgs = allZeroBefore
  ? ["diff-tree", "--root", "--no-commit-id", "--name-status", "--diff-filter=A", "-r", commit]
  : ["diff", "--name-status", "--diff-filter=A", before, commit, "--", "content/readings"];
const addedFiles = execFileSync("git", diffArgs, { encoding: "utf8" })
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("A\t"))
  .map((line) => line.slice(2))
  .filter((file) => /^content\/readings\/\d{4}-\d{2}-\d{2}\.md$/.test(file));

for (const file of addedFiles) {
  const markdown = await readFile(file, "utf8");
  const { data } = matter(markdown);
  const date = path.basename(file, ".md");
  const topic = typeof data.topic === "string" ? data.topic.trim() : "";
  if (!topic || data.date !== date) {
    throw new Error(`Reading ${file} is missing a matching date or topic`);
  }

  const response = await fetch(`${notifyUrl}/api/push/notify`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ date, topic }),
  });
  if (!response.ok) {
    throw new Error(`Notification request for ${date} failed with status ${response.status}`);
  }
  const result = await response.json();
  console.log(`Sent reading notification for ${date} to ${result.notified} device(s).`);
}

if (addedFiles.length === 0) {
  console.log("No new dated readings were added in this push.");
}
