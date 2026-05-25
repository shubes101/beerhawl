# Bierhaul — Integrations Setup

Two optional integrations ship in this codebase **fully built but turned off**.
Each lights up once you provide its credentials (and, for Instagram, flip an
enable flag). Nothing here requires a code change — only environment variables in
your host (Vercel → Project → Settings → Environment Variables) and a redeploy.

- [Untappd: beer list + check-in leaderboard](#untappd-beer-list--check-in-leaderboard)
- [Meta / Instagram: auto-create events from posts](#meta--instagram-auto-create-events-from-posts)

---

## Untappd: beer list + check-in leaderboard

Both the live "On Tap" beer list and the check-in leaderboard come from
**Untappd for Business (UTFB) Premium**. Until it's configured, the site shows
tasteful "coming soon" placeholders (the On Tap section on `/menus` and the
`/leaderboard` page).

### What you need to do

1. **Subscribe to Untappd for Business Premium** (required for both features).
2. In UTFB, go to **Website Embed** and copy the menu embed URL.
3. In UTFB, go to **API** and generate a **read-only token**.
4. Note your UTFB **location id** — this is the internal id in UTFB, *not* the
   public venue id `11290340`.

### Environment variables

| Variable | Where it comes from | What it turns on |
| --- | --- | --- |
| `UNTAPPD_MENU_EMBED_URL` | UTFB → Website Embed | The live On Tap beer list (this one var alone) |
| `UNTAPPD_API_TOKEN` | UTFB → API (read-only) | The check-in leaderboard |
| `UNTAPPD_LOCATION_ID` | UTFB location id | The check-in leaderboard |

### Status / notes

- Setting `UNTAPPD_MENU_EMBED_URL` is enough to switch the beer list from
  placeholder to live on its own.
- The leaderboard reader (`src/lib/untappd.ts`) is currently a **placeholder**:
  once the API token + location id are set it returns an empty live board. The
  remaining work — a `Checkin` table and a poller that pulls
  `GET https://business.untappd.com/api/v1/locations/{LOCATION_ID}/checkins` and
  dedupes by check-in id — is noted inline in that file and in `PUNCHLIST.md`.
  Ping the dev once the credentials exist and that gets wired up.
- Refresh cadence: a frequent (every-few-minutes) leaderboard refresh needs
  **Vercel Pro** (Hobby cron runs ~daily) or an external trigger.

---

## Meta / Instagram: auto-create events from posts

A once-a-day job reads the restaurant's **own** Instagram posts, asks Claude to
spot any that announce a dated event, and sends each one to Telegram with
**Publish / Discard** buttons — the same review flow as menu photos. Nothing goes
on the events page without a tap.

> **Important:** Instagram only allows programmatic reads of an account you
> own/manage, through the **Instagram Graph API** (a Business or Creator account
> linked to a Facebook Page). Reading third-party accounts isn't possible via the
> official API, and scraping breaks Instagram's Terms of Service.

### This feature ships DISABLED

It stays completely dormant — the daily job runs but does nothing — until **both**
of these are true:

1. The Instagram credentials below are set, **and**
2. `INSTAGRAM_EVENT_SYNC_ENABLED=true`.

So it's safe to deploy now and switch on later.

### What you need to do (one-time Meta setup)

1. **Convert the Instagram account to Business or Creator** (Instagram app →
   Settings → Account type).
2. **Link it to a Facebook Page** (the IG account's Settings → linked Facebook
   Page; create a Page if there isn't one).
3. **Create a Meta app** at <https://developers.facebook.com/apps/> (type:
   "Business") and add the **Instagram Graph API** product.
4. **Generate a long-lived access token** with the
   `instagram_basic` + `pages_show_list` permissions. The quickest path is the
   **Graph API Explorer**: select your app, grant those permissions, generate a
   user token, then exchange it for a **long-lived** token (valid ~60 days).
5. **Find the Instagram-business account id** (the numeric `INSTAGRAM_USER_ID`,
   not the @handle). From the Page you can query:
   `GET /me/accounts` → take the Page id, then
   `GET /{page-id}?fields=instagram_business_account`.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `INSTAGRAM_ACCESS_TOKEN` | yes | The long-lived token from step 4. **Expires ~60 days** — must be refreshed. |
| `INSTAGRAM_USER_ID` | yes | Numeric IG-business account id from step 5. |
| `INSTAGRAM_GRAPH_VERSION` | no | Graph API version, defaults to `v21.0`. |
| `INSTAGRAM_EVENT_SYNC_ENABLED` | yes (to enable) | Set to `true` to turn the feature on. Anything else = off. |
| `CRON_SECRET` | yes | Protects the scheduled job. On Vercel, the platform sends it as `Authorization: Bearer <CRON_SECRET>`. |
| `TELEGRAM_ALLOWED_CHAT_IDS` | yes | Already used by the bot; review messages go to these chats. |

### Turning it on

1. Set all of the variables above in your host and redeploy.
2. The schedule is already defined in `vercel.json` (daily, ~10am ET). Vercel
   picks it up automatically on deploy.
3. When a post announces a dated event, you'll get a Telegram message like
   "📅 Found an event on Instagram: …" with **✅ Publish** / **✖️ Discard**.
   Publish adds it to `/events`; Discard drops it.

### Testing it manually

Trigger the job without waiting for the daily schedule:

```bash
curl -X POST "https://YOUR-SITE/api/cron/instagram?key=YOUR_CRON_SECRET"
```

- While disabled → `{"ok":true,"skipped":"disabled"}`.
- While enabled → `{"ok":true,"scanned":N,"staged":M}` and any detected events
  arrive in Telegram for review.
- Wrong/blank secret → `401` / `403`.

### Things to know

- **Token refresh:** the long-lived token expires ~60 days out and must be
  regenerated and re-set in your host. (An automatic refresh job is a possible
  follow-up.)
- **First run won't backfill:** posts older than ~21 days are skipped so enabling
  the feature doesn't flood you with stale events.
- **Each post is read once** (deduped by Instagram media id), and duplicate
  events (same title + date) are skipped.
- **Frequency:** Vercel Hobby cron is ~daily. Near-real-time would need Vercel
  Pro or an external trigger hitting the same URL.
- **Accuracy:** Claude occasionally misreads a caption — the Publish/Discard
  review step is the safeguard, so nothing is published automatically.
