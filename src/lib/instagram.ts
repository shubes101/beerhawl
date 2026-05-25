// Instagram integration — reads the restaurant's OWN posts via the Instagram
// Graph API (a Business/Creator account linked to a Facebook Page + a long-lived
// access token). Third-party accounts can't be read programmatically; scraping
// breaks Instagram's ToS. See INTEGRATIONS.md for the owner's setup steps.
//
// Ships DORMANT: the daily poller no-ops until both the env vars are set AND
// INSTAGRAM_EVENT_SYNC_ENABLED is "true".

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const USER_ID = process.env.INSTAGRAM_USER_ID;
const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION ?? "v21.0";

/** True once a token + user id are present (i.e. the API can be called). */
export function isInstagramConfigured(): boolean {
  return Boolean(ACCESS_TOKEN && USER_ID);
}

/** The kill switch — the feature stays off until this is explicitly "true". */
export function isEventSyncEnabled(): boolean {
  return process.env.INSTAGRAM_EVENT_SYNC_ENABLED === "true";
}

export type InstagramMedia = {
  id: string;
  caption: string;
  permalink: string | null;
  timestamp: string | null; // ISO 8601 from the Graph API
};

type GraphMediaItem = {
  id?: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
};

/**
 * Most recent media for the configured account, newest first. Returns [] when
 * unconfigured or on any API error (the caller treats that as "nothing new").
 */
export async function fetchRecentMedia(limit = 25): Promise<InstagramMedia[]> {
  if (!isInstagramConfigured()) return [];

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${USER_ID}/media`);
  url.searchParams.set("fields", "id,caption,permalink,timestamp,media_type");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", ACCESS_TOKEN as string);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[instagram] media fetch failed: ${res.status} ${await res.text()}`);
      return [];
    }
    const json = (await res.json()) as { data?: GraphMediaItem[] };
    return (json.data ?? [])
      .filter((m): m is GraphMediaItem & { id: string } => Boolean(m.id))
      .map((m) => ({
        id: m.id,
        caption: m.caption ?? "",
        permalink: m.permalink ?? null,
        timestamp: m.timestamp ?? null,
      }));
  } catch (err) {
    console.error("[instagram] media fetch error:", err);
    return [];
  }
}
