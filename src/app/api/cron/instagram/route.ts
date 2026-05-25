import { extractEvents } from "@/lib/agent";
import { getUpcomingEvents } from "@/lib/data";
import { prisma } from "@/lib/db";
import {
  fetchRecentMedia,
  isEventSyncEnabled,
  isInstagramConfigured,
  type InstagramMedia,
} from "@/lib/instagram";
import { sendMessageWithButtons } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Don't backfill events from old posts (esp. on the first run after enabling).
const RECENCY_DAYS = 21;

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

function allowedChatIds(): string[] {
  return (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`; manual runs may pass
// `x-cron-secret` or `?key=`. 403 if unset, 401 on mismatch.
function authorize(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response("Cron disabled — set CRON_SECRET to enable.", { status: 403 });
  }
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided =
    bearer ?? req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("key");
  if (provided !== secret) {
    return new Response("Forbidden", { status: 401 });
  }
  return null;
}

async function run(): Promise<Response> {
  // Ships dormant: stays off until the token is set AND the flag is flipped on.
  if (!isEventSyncEnabled() || !isInstagramConfigured()) {
    return Response.json({ ok: true, skipped: "disabled" });
  }

  const media = await fetchRecentMedia();

  // Drop posts already evaluated on a previous run.
  const ids = media.map((m) => m.id);
  const seen = new Set(
    (
      await prisma.processedPost.findMany({ where: { id: { in: ids } }, select: { id: true } })
    ).map((r) => r.id),
  );
  const fresh = media.filter((m) => !seen.has(m.id));

  // Recency guard: silently mark older unprocessed posts done instead of
  // proposing stale events.
  const cutoff = Date.now() - RECENCY_DAYS * 24 * 60 * 60 * 1000;
  const recent: InstagramMedia[] = [];
  const stale: InstagramMedia[] = [];
  for (const m of fresh) {
    const t = m.timestamp ? new Date(m.timestamp).getTime() : NaN;
    if (!Number.isNaN(t) && t < cutoff) stale.push(m);
    else recent.push(m);
  }
  if (stale.length > 0) {
    await prisma.processedPost.createMany({
      data: stale.map((m) => ({ id: m.id, permalink: m.permalink })),
      skipDuplicates: true,
    });
  }

  // Existing upcoming events + already-staged proposals, for de-duplication.
  const [upcoming, pendings] = await Promise.all([
    getUpcomingEvents(),
    prisma.pendingEvent.findMany(),
  ]);
  const existingKeys = new Set<string>([
    ...upcoming.map((e) => `${e.title.trim().toLowerCase()}|${ymd(e.date)}`),
    ...pendings.map((e) => `${e.title.trim().toLowerCase()}|${ymd(e.date)}`),
  ]);

  const chatIds = allowedChatIds();
  const label = nowLabel();
  let staged = 0;

  // Oldest first, so review messages arrive in chronological order.
  for (const m of recent.slice().reverse()) {
    try {
      const events = await extractEvents(m.caption, label);
      for (const ev of events) {
        const key = `${ev.title.trim().toLowerCase()}|${ev.date}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);

        const lines = [`📅 Found an event on Instagram: ${ev.title}`];
        lines.push(`When: ${ev.date}${ev.timeLabel ? ` · ${ev.timeLabel}` : ""}`);
        if (ev.location) lines.push(`Where: ${ev.location}`);
        if (ev.description) lines.push("", ev.description);
        if (m.permalink) lines.push("", m.permalink);
        lines.push("", "Add it to the events page?");
        const body = lines.join("\n");

        for (const chatId of chatIds) {
          const pending = await prisma.pendingEvent.create({
            data: {
              title: ev.title,
              description: ev.description ?? null,
              date: new Date(`${ev.date}T12:00:00.000Z`),
              timeLabel: ev.timeLabel ?? null,
              location: ev.location ?? null,
              sourceUrl: m.permalink,
              chatId,
            },
          });
          try {
            const messageId = await sendMessageWithButtons(chatId, body, [
              [
                { text: "✅ Publish", callback_data: `evpub:${pending.id}` },
                { text: "✖️ Discard", callback_data: `evdis:${pending.id}` },
              ],
            ]);
            await prisma.pendingEvent.update({
              where: { id: pending.id },
              data: { messageId },
            });
          } catch (err) {
            console.error("[cron/instagram] telegram send failed:", err);
          }
        }
        staged++;
      }
    } catch (err) {
      console.error(`[cron/instagram] extract failed for ${m.id}:`, err);
    } finally {
      // Always mark processed so we don't re-evaluate this post tomorrow.
      await prisma.processedPost
        .create({ data: { id: m.id, permalink: m.permalink } })
        .catch(() => {});
    }
  }

  return Response.json({ ok: true, scanned: recent.length, staged });
}

export async function GET(req: Request): Promise<Response> {
  const denied = authorize(req);
  if (denied) return denied;
  return run();
}

export const POST = GET;
