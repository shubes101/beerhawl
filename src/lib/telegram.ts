const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
const FILE_API = `https://api.telegram.org/file/bot${TOKEN}`;

export type TelegramImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

export type DownloadedImage = {
  data: string; // base64
  mediaType: TelegramImageMediaType;
};

async function call<T = unknown>(method: string, body: object): Promise<T> {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  }
  return json.result as T;
}

export async function sendMessage(chatId: number | string, text: string): Promise<void> {
  // Telegram caps messages at 4096 chars.
  const safe = text.length > 4000 ? `${text.slice(0, 3990)}…` : text;
  await call("sendMessage", { chat_id: chatId, text: safe });
}

export async function sendChatAction(
  chatId: number | string,
  action: "typing" | "upload_photo" = "typing",
): Promise<void> {
  try {
    await call("sendChatAction", { chat_id: chatId, action });
  } catch {
    // non-critical
  }
}

function mediaTypeFromPath(path: string): TelegramImageMediaType {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

/** Resolves a Telegram file_id to base64 image data for the Anthropic API. */
export async function downloadImage(fileId: string): Promise<DownloadedImage> {
  const file = await call<{ file_path?: string }>("getFile", { file_id: fileId });
  if (!file.file_path) throw new Error("Telegram getFile returned no file_path");

  const res = await fetch(`${FILE_API}/${file.file_path}`);
  if (!res.ok) throw new Error(`Failed to download Telegram file (${res.status})`);

  const buf = Buffer.from(await res.arrayBuffer());
  return {
    data: buf.toString("base64"),
    mediaType: mediaTypeFromPath(file.file_path),
  };
}
