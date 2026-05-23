import { revalidatePath } from "next/cache";
import { buildUserContent, runAgent, type AgentImage } from "@/lib/agent";
import { downloadImage, sendChatAction, sendMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type TelegramPhotoSize = { file_id: string };
type TelegramDocument = { file_id: string; mime_type?: string };
type TelegramMessage = {
  chat?: { id: number };
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
};
type TelegramUpdate = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
};

function allowedChatIds(): Set<string> {
  return new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function nowLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

async function collectImages(message: TelegramMessage): Promise<AgentImage[]> {
  const images: AgentImage[] = [];

  if (message.photo && message.photo.length > 0) {
    // The last PhotoSize is the highest resolution.
    const largest = message.photo[message.photo.length - 1];
    images.push(await downloadImage(largest.file_id));
  }

  if (message.document?.mime_type?.startsWith("image/")) {
    images.push(await downloadImage(message.document.file_id));
  }

  return images;
}

export async function POST(req: Request): Promise<Response> {
  // Verify the request really came from Telegram.
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) {
      return new Response("forbidden", { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: true });
  }

  const message = update.message ?? update.edited_message ?? update.channel_post;
  const chatId = message?.chat?.id;
  if (!message || chatId === undefined) {
    return Response.json({ ok: true });
  }

  const text = (message.text ?? message.caption ?? "").trim();

  // Authorize. On denial we still share the chat id so an owner can whitelist it.
  if (!allowedChatIds().has(String(chatId))) {
    await sendMessage(
      chatId,
      `This bot is private. If you manage Bierhaul, add this chat ID to TELEGRAM_ALLOWED_CHAT_IDS:\n\n${chatId}`,
    );
    return Response.json({ ok: true });
  }

  // Simple commands.
  if (/^\/(start|help)\b/.test(text)) {
    await sendMessage(
      chatId,
      "Hi! I keep the Bierhaul website up to date.\n\n• Send a photo of a menu (lunch, dinner, cocktails, or specials) and I'll read it and update that page.\n• Or just tell me things like \"add live jazz next Friday at 8pm\" or \"remove the schnitzel from dinner\".\n\nYour chat ID: " +
        chatId,
    );
    return Response.json({ ok: true });
  }
  if (/^\/id\b/.test(text)) {
    await sendMessage(chatId, `Your chat ID: ${chatId}`);
    return Response.json({ ok: true });
  }

  try {
    await sendChatAction(chatId, "typing");

    const images = await collectImages(message);

    if (images.length === 0 && !text) {
      await sendMessage(chatId, "Send me a menu photo or a note about an event.");
      return Response.json({ ok: true });
    }

    const content = buildUserContent({ text, images, nowLabel: nowLabel() });
    const reply = await runAgent(content);

    // Public pages read from the DB at request time, but revalidate the cached
    // routes too in case any are statically held.
    revalidatePath("/");
    revalidatePath("/menus");
    revalidatePath("/events");

    await sendMessage(chatId, reply);
  } catch (err) {
    console.error("Telegram handler error:", err);
    await sendMessage(chatId, "Sorry — something went wrong handling that. Please try again.");
  }

  return Response.json({ ok: true });
}
