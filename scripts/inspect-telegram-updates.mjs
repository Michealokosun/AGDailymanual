const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN first.");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10&allowed_updates=%5B%22message%22%5D`);
const result = await response.json();
if (!response.ok || !result.ok) {
  console.error("Telegram could not return updates:", result.description ?? response.statusText);
  console.error("getUpdates is unavailable while a webhook is registered. Remove it with deleteWebhook, then try again.");
  process.exit(1);
}

const messages = (result.result ?? []).map((update) => update.message).filter(Boolean);
if (!messages.length) {
  console.log("No messages yet. Send a message in the target Telegram group and run this command again.");
} else {
  for (const message of messages) {
    console.log(JSON.stringify({
      chatId: message.chat?.id,
      chatType: message.chat?.type,
      chatTitle: message.chat?.title,
      senderId: message.from?.id,
      senderName: message.from?.first_name,
    }));
  }
}
