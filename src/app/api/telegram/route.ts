import { revalidatePath } from "next/cache";
import {
  buildUserContent,
  runAgent,
  writeMenu,
  type AgentImage,
  type MenuItemInput,
} from "@/lib/agent";
import { createEvent } from "@/lib/data";
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
  media_group_id?: string;
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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// The Telegram file_ids of any images in a message (highest-res photo + image docs).
function collectFileIds(message: TelegramMessage): string[] {
  const ids: string[] = [];
  if (message.photo && message.photo.length > 0) {
    // The last PhotoSize is the highest resolution.
    ids.push(message.photo[message.photo.length - 1].file_id);
  }
  if (message.document?.mime_type?.startsWith("image/")) {
    ids.push(message.document.file_id);
  }
  return ids;
}

async function collectImages(message: TelegramMessage): Promise<AgentImage[]> {
  return Promise.all(collectFileIds(message).map((id) => downloadImage(id)));
}

function revalidatePublicPages() {
  revalidatePath("/");
  revalidatePath("/menus");
  revalidatePath("/events");
}

// Runs the agent on the given image(s)/text, merging into any pending capture,
// then either stages a menu proposal (Publish/Discard buttons) or sends the
// immediate reply. Shared by the single-message and album paths.
async function stageOrReply(
  chatId: number,
  images: AgentImage[],
  text: string,
): Promise<void> {
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
      '\n\nSend more pages to add to this, or tap ✅ Publish to put it live. You can also send a correction (e.g. "set the wedge to $16").';
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
}

// Telegram delivers an album as several separate webhooks sharing a
// media_group_id. We buffer each photo, then debounce: whichever webhook sees a
// stable count after the wait claims the whole set and OCRs the pages together.
async function handleAlbumMessage(
  chatId: number,
  message: TelegramMessage,
  text: string,
): Promise<void> {
  const mediaGroupId = message.media_group_id;
  if (!mediaGroupId) return;
  const fileIds = collectFileIds(message);
  if (fileIds.length === 0) return;

  const where = { chatId: String(chatId), mediaGroupId };
  await prisma.albumPhoto.createMany({
    data: fileIds.map((fileId) => ({
      chatId: String(chatId),
      mediaGroupId,
      fileId,
      caption: text || null,
    })),
  });

  // Wait for the rest of the album to arrive. If the count grows during the
  // wait, a later webhook will be the one to settle this group.
  const before = await prisma.albumPhoto.count({ where });
  await sleep(3000);
  const after = await prisma.albumPhoto.count({ where });
  if (after !== before) return;

  // Claim the set atomically — only the webhook whose delete removes rows wins.
  const rows = await prisma.albumPhoto.findMany({ where, orderBy: { createdAt: "asc" } });
  if (rows.length === 0) return;
  const claimed = await prisma.albumPhoto.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  if (claimed.count === 0) return;

  await sendChatAction(chatId, "typing");
  const images = await Promise.all(rows.map((r) => downloadImage(r.fileId)));
  // Telegram attaches a caption to one album item; the rest are null.
  const caption = rows.map((r) => r.caption).filter((c): c is string => !!c).join(" ").trim();
  await stageOrReply(chatId, images, caption);
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

  // Publish / Discard taps on an event detected from Instagram.
  if (cb.data?.startsWith("evpub:") || cb.data?.startsWith("evdis:")) {
    const id = cb.data.slice(6);
    const pe = await prisma.pendingEvent.findUnique({ where: { id } });
    if (!pe) {
      await editMessageText(chatId, messageId, "This event proposal has expired.");
      return;
    }
    if (cb.data.startsWith("evdis:")) {
      await prisma.pendingEvent.delete({ where: { id } });
      await editMessageText(chatId, messageId, "✖️ Discarded — nothing was added.");
      return;
    }
    try {
      // Idempotent: don't double-add if the same event already went live
      // (e.g. published from another chat).
      const existingEvent = await prisma.event.findFirst({
        where: { title: { equals: pe.title, mode: "insensitive" }, date: pe.date },
      });
      if (!existingEvent) {
        await createEvent({
          title: pe.title,
          date: pe.date.toISOString().slice(0, 10),
          description: pe.description,
          timeLabel: pe.timeLabel,
          location: pe.location,
        });
      }
      await prisma.pendingEvent.delete({ where: { id } });
      revalidatePublicPages();
      await editMessageText(chatId, messageId, `✅ Added "${pe.title}" to the events page.`);
    } catch (err) {
      console.error("Event publish error:", err);
      await editMessageText(chatId, messageId, "⚠️ Something went wrong adding that event.");
    }
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
      "Greetings — I am BH-88, Bierhaul's Protocol Droid. I keep the website up to date.\n\n• Send a photo of a menu (lunch, dinner, cocktails, or specials) — I'll read it and show you what I captured to Publish or Discard.\n• Or just tell me things like \"add live jazz next Friday at 8pm\" or \"86 the garden gimlet\" (marks it sold out — tap Recall, or say \"recall the garden gimlet\", to bring it back).\n\nYour chat ID: " +
        chatId,
    );
    return Response.json({ ok: true });
  }
  if (/^\/id\b/.test(text)) {
    await sendMessage(chatId, `Your chat ID: ${chatId}`);
    return Response.json({ ok: true });
  }

  // Album: several photos sent together arrive as separate webhooks sharing a
  // media_group_id. Buffer and OCR them as one menu.
  if (message.media_group_id) {
    try {
      await handleAlbumMessage(chatId, message, text);
    } catch (err) {
      console.error("Telegram album handler error:", err);
    }
    return Response.json({ ok: true });
  }

  try {
    await sendChatAction(chatId, "typing");

    const images = await collectImages(message);

    if (images.length === 0 && !text) {
      await sendMessage(chatId, "Send me a menu photo or a note about an event.");
      return Response.json({ ok: true });
    }

    await stageOrReply(chatId, images, text);
  } catch (err) {
    console.error("Telegram handler error:", err);
    await sendMessage(chatId, "Sorry — something went wrong handling that. Please try again.");
  }

  return Response.json({ ok: true });
}
