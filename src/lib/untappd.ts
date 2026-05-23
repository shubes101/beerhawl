// Untappd integration — PLACEHOLDER.
//
// Both the live beer/draft list and the check-in leaderboard come from Untappd
// for Business (UTFB), which is a Premium-tier feature. Until the owner
// provisions UTFB access and sets the env vars below, these features render
// "coming soon" placeholders. See PUNCHLIST.md for the owner's setup steps.

export const UNTAPPD_VENUE_URL =
  "https://untappd.com/v/bierhaul-farmhouse/11290340";

export const LEADERBOARD_WINDOW_HOURS = 6;

// Filled in once UTFB access is available (see PUNCHLIST.md):
//   UNTAPPD_MENU_EMBED_URL - iframe src from UTFB → Website Embed (lights up the beer list)
//   UNTAPPD_API_TOKEN      - read-only token from UTFB → API
//   UNTAPPD_LOCATION_ID    - UTFB location id (NOT the public venue id 11290340)
const MENU_EMBED_URL = process.env.UNTAPPD_MENU_EMBED_URL;
const API_TOKEN = process.env.UNTAPPD_API_TOKEN;
const LOCATION_ID = process.env.UNTAPPD_LOCATION_ID;

export function getMenuEmbedUrl(): string | null {
  return MENU_EMBED_URL ?? null;
}

export function isCheckinApiConfigured(): boolean {
  return Boolean(API_TOKEN && LOCATION_ID);
}

export type LeaderboardEntry = { name: string; subtitle?: string; count: number };
export type Leaderboards = {
  windowHours: number;
  topUsers: LeaderboardEntry[];
  topBeers: LeaderboardEntry[];
};

/**
 * Returns leaderboard data for the trailing window, or `null` when Untappd is
 * not configured yet (renders the placeholder).
 *
 * TODO — implement once UTFB Premium is available:
 *   1. Add a `Checkin` model to prisma/schema.prisma
 *      (checkinId @unique, firstName, username, beerName, breweryName, createdAt) + db push.
 *   2. Add a poller (Vercel Cron on Pro, or an external trigger) that calls
 *      GET https://business.untappd.com/api/v1/locations/{LOCATION_ID}/checkins
 *      with `Authorization: <UNTAPPD_API_TOKEN>`, dedupes by checkinId, stores rows.
 *   3. Implement below: select check-ins where createdAt >= now - window, then
 *      - topUsers: group by user → { name: firstName, subtitle: "@" + username, count }
 *      - topBeers: group by beer → { name: beerName, subtitle: breweryName, count }
 *      sorted desc, take top N.
 */
export async function getLeaderboards(): Promise<Leaderboards | null> {
  if (!isCheckinApiConfigured()) return null;
  // Configured but not yet implemented — show an empty (live) board.
  return { windowHours: LEADERBOARD_WINDOW_HOURS, topUsers: [], topBeers: [] };
}
