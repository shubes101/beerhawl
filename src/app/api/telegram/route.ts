import { revalidatePath } from "next/cache";
import {
  buildUserContent,
  runAgent,
  writeMenu,
  type AgentImage,
  type MenuItemInput,
} from "@/lib/agent";
import { prisma } from "@/lib/db";
import {
  answerCallbackQuery,
  downloadImage,
  editMessageText,
  sendChatAction,
  sendMessage,
  sendMessageWithButtons,
} from "@/lib/telegram";

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
type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from?: { id: number };
  message?: { message_id: number; chat?: { id: number } };
};
type TelegramUpdate = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
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

function revalidatePublicPages() {
  revalidatePath("/");
  revalidatePath("/menus");
  revalidatePath("/events");
}

// Publish / Discard taps on a pending menu capture.
async function handleCallback(cb: TelegramCallbackQuery): Promise<void> {
  const chatId = cb.message?.chat?.id ?? cb.from?.id;
  const messageId = cb.message?.message_id;
  if (chatId === undefined || messageId === undefined) {
    await answerCallbackQuery(cb.id);
    return;
  }
  if (!allowedChatIds().has(String(chatId))) {
    await answerCallbackQuery(cb.id, "Not authorized.");
    return;
  }

  await answerCallbackQuery(cb.id);

  // Recall (un-86) tap — carries the item id, no pending menu involved.
  if (cb.data?.startsWith("rcl:")) {
    const id = cb.data.slice(4);
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      await editMessageText(chatId, messageId, "That item no longer exists.");
      return;
    }
    await prisma.menuItem.update({ where: { id }, data: { eightySixedAt: null } });
    revalidatePublicPages();
    await editMessageText(chatId, messageId, `↩️ Recalled "${existing.name}" — it's back on the menu.`);
    return;
  }

  const pending = await prisma.pendingMenu.findUnique({ where: { chatId: String(chatId) } });
  if (!pending) {
    await editMessageText(chatId, messageId, "This capture has expired.");
    return;
  }
  // A newer capture replaced this one — these buttons are stale.
  if (pending.messageId && pending.messageId !== messageId) {
    await editMessageText(chatId, messageId, "Superseded by a newer capture.");
    return;
  }

  try {
    if (cb.data === "pub") {
      const count = await writeMenu(
        pending.menuType,
        JSON.parse(pending.items) as MenuItemInput[],
      );
      await prisma.pendingMenu.delete({ where: { chatId: String(chatId) } });
      revalidatePublicPages();
      await editMessageText(
        chatId,
        messageId,
        `✅ Published the ${pending.menuType} menu (${count} item${count === 1 ? "" : "s"}) — it's live.`,
      );
    } else {
      await prisma.pendingMenu.delete({ where: { chatId: String(chatId) } });
      await editMessageText(chatId, messageId, "✖️ Discarded — nothing was published.");
    }
  } catch (err) {
    console.error("Publish error:", err);
    await editMessageText(chatId, messageId, "⚠️ Something went wrong publishing that.");
  }
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

  // Button taps (Publish / Discard).
  if (update.callback_query) {
    try {
      await handleCallback(update.callback_query);
    } catch (err) {
      console.error("Telegram callback error:", err);
    }
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
      "Hi! I keep the Bierhaul website up to date.\n\n• Send a photo of a menu (lunch, dinner, cocktails, or specials) — I'll read it and show you what I captured to Publish or Discard.\n• Or just tell me things like \"add live jazz next Friday at 8pm\" or \"86 the garden gimlet\" (marks it sold out — tap Recall, or say \"recall the garden gimlet\", to bring it back).\n\nYour chat ID: " +
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

    const pendingRow = await prisma.pendingMenu.findUnique({ where: { chatId: String(chatId) } });
    const pending = pendingRow
      ? { menuType: pendingRow.menuType, items: JSON.parse(pendingRow.items) as MenuItemInput[] }
      : undefined;

    const content = buildUserContent({ text, images, nowLabel: nowLabel() });
    const { reply, proposal, eightySixed } = await runAgent(
      content,
      (msg) => sendMessage(chatId, msg),
      pending,
    );

    if (proposal) {
      // Photo capture staged — show it with Publish/Discard buttons, don't publish yet.
      const body =
        proposal.summary +
        (reply ? `\n\n${reply}` : "") +
        '\n\nTap ✅ Publish to put it live, or send a correction (e.g. "set the wedge to $16").';
      const messageId = await sendMessageWithButtons(chatId, body, [
        [
          { text: "✅ Publish", callback_data: "pub" },
          { text: "✖️ Discard", callback_data: "dis" },
        ],
      ]);
      await prisma.pendingMenu.upsert({
        where: { chatId: String(chatId) },
        update: {
          menuType: proposal.menuType,
          items: JSON.stringify(proposal.items),
          summary: proposal.summary,
          messageId,
        },
        create: {
          chatId: String(chatId),
          menuType: proposal.menuType,
          items: JSON.stringify(proposal.items),
          summary: proposal.summary,
          messageId,
        },
      });
    } else {
      // Immediate text edit — already applied; pages read fresh from the DB.
      revalidatePublicPages();
      if (eightySixed && eightySixed.length > 0) {
        // Offer a one-tap recall for each item just 86'd.
        const buttons = eightySixed.map((e) => [
          { text: `↩️ Recall ${e.name}`, callback_data: `rcl:${e.itemId}` },
        ]);
        await sendMessageWithButtons(chatId, reply, buttons);
      } else {
        await sendMessage(chatId, reply);
      }
    }
  } catch (err) {
    console.error("Telegram handler error:", err);
    await sendMessage(chatId, "Sorry — something went wrong handling that. Please try again.");
  }

  return Response.json({ ok: true });
}
