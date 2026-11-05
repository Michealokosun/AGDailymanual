import { timingSafeEqual } from "node:crypto";
import { parseTelegramReading } from "@/lib/telegram-reading";

export const runtime = "nodejs";

type TelegramMessage = {
  message_id: number;
  text?: string;
  caption?: string;
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
  chat: { id: number; type: string };
  from?: { id: number };
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

function equalSecret(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function sendTelegramMessage(chatId: number, text: string, replyTo?: number): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...(replyTo ? { reply_to_message_id: replyTo } : {}) }),
  });
  if (!response.ok) throw new Error(`Telegram reply failed with status ${response.status}`);
}

async function downloadTextDocument(fileId: string, fileName: string | undefined, fileSize?: number): Promise<string> {
  if (!fileName || !fileName.toLowerCase().endsWith(".txt")) throw new Error("For long lessons, attach a plain-text .txt file with /reading in its caption.");
  if (fileSize !== undefined && fileSize > 1_000_000) throw new Error("The reading text file must be smaller than 1 MB.");
  const token = requiredEnvironment("TELEGRAM_BOT_TOKEN");
  const fileInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!fileInfoResponse.ok) throw new Error("Telegram could not read the attached text file.");
  const fileInfo = await fileInfoResponse.json() as { ok?: boolean; result?: { file_path?: string } };
  const filePath = fileInfo.result?.file_path;
  if (!fileInfo.ok || !filePath) throw new Error("Telegram did not provide a downloadable file path.");
  const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!fileResponse.ok) throw new Error("Telegram could not download the attached text file.");
  const bytes = await fileResponse.arrayBuffer();
  if (bytes.byteLength > 1_000_000) throw new Error("The reading text file must be smaller than 1 MB.");
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function saveReading(path: string, markdown: string): Promise<void> {
  const owner = requiredEnvironment("GITHUB_OWNER");
  const repository = requiredEnvironment("GITHUB_REPO");
  const token = requiredEnvironment("GITHUB_TOKEN");
  const branch = process.env.GITHUB_BRANCH?.trim() || "main";
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${path}`;
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
    "content-type": "application/json",
  };

  const existing = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (existing.ok) throw new Error("A reading for that date already exists. Nothing was overwritten.");
  if (existing.status !== 404) throw new Error(`GitHub could not check the target file (status ${existing.status}).`);

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `Add reading for ${path.slice("content/readings/".length, -3)}`,
      content: Buffer.from(markdown, "utf8").toString("base64"),
      branch,
    }),
  });
  if (!response.ok) {
    const description = response.status === 422 ? "GitHub rejected the file. It may already exist or the branch may be protected." : `GitHub could not save the file (status ${response.status}).`;
    throw new Error(description);
  }
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !equalSecret(request.headers.get("x-telegram-bot-api-secret-token"), secret)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = update.message;
  const allowedChat = process.env.TELEGRAM_ALLOWED_CHAT_ID?.trim();
  const allowedSenders = new Set((process.env.TELEGRAM_ALLOWED_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean));
  if (!message || !allowedChat || String(message.chat.id) !== allowedChat || !message.from || !allowedSenders.has(String(message.from.id))) {
    return Response.json({ ok: true, ignored: true });
  }

  const input = message.text ?? message.caption ?? "";
  const command = input.match(/^\/reading(?:@[A-Za-z0-9_]+)?(?:\s|$)/);
  if (!command) return Response.json({ ok: true, ignored: true });

  let readingText = input.slice(command[0].length).trim();
  let topic: string;
  let date: string;
  try {
    if (message.document) readingText = await downloadTextDocument(message.document.file_id, message.document.file_name, message.document.file_size);
    if (!readingText) throw new Error("Send the full reading after /reading, with its date and reading sections.");
    const parsed = parseTelegramReading(readingText);
    topic = parsed.draft.topic;
    date = parsed.draft.date;
    const path = `content/readings/${date}.md`;
    await saveReading(path, parsed.markdown);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "The reading could not be saved.";
    try {
      await sendTelegramMessage(message.chat.id, `Reading not saved: ${messageText}`, message.message_id);
    } catch (replyError) {
      console.error("Telegram webhook could not send its result message", replyError);
    }
    return Response.json({ ok: true });
  }

  try {
    await sendTelegramMessage(message.chat.id, `Saved “${topic}” for ${date}. GitHub will deploy the updated reading after the commit is built.`, message.message_id);
  } catch (replyError) {
    console.error("Telegram webhook saved a reading but could not send its result message", replyError);
  }

  return Response.json({ ok: true });
}
