/**
 * Registers (or clears) the Telegram webhook so updates are delivered to
 * <PUBLIC_URL>/api/telegram.
 *
 * Usage:
 *   npm run telegram:set-webhook            # set the webhook from .env
 *   npm run telegram:set-webhook -- --delete  # remove the webhook
 */

// Node 20.6+ / 22 can load a .env file directly.
try {
  (process as { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(".env");
} catch {
  // .env is optional if vars are already in the environment
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const publicUrl = process.env.PUBLIC_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set.");
  process.exit(1);
}

async function main() {
  const api = `https://api.telegram.org/bot${token}`;

  if (process.argv.includes("--delete")) {
    const res = await fetch(`${api}/deleteWebhook`, { method: "POST" });
    console.log(await res.json());
    return;
  }

  if (!publicUrl) {
    console.error("PUBLIC_URL is not set (e.g. https://bierhaul.vercel.app).");
    process.exit(1);
  }

  const webhookUrl = `${publicUrl.replace(/\/$/, "")}/api/telegram`;
  const res = await fetch(`${api}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret || undefined,
      allowed_updates: ["message", "edited_message", "channel_post"],
    }),
  });

  const json = await res.json();
  console.log(`Webhook → ${webhookUrl}`);
  console.log(json);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
