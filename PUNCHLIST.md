# Bierhaul — Owner Punch List

Action items that only you can do (accounts, credentials, decisions). The code
that depends on each item is already stubbed and will light up once you provide
the values.

## Untappd: beer list + check-in leaderboard

Both features come from **Untappd for Business (UTFB) Premium**. Right now both
render tasteful "coming soon" placeholders (On Tap section on `/menus`, and the
`/leaderboard` page).

- [ ] Subscribe to **Untappd for Business Premium** (required for both features).
- [ ] UTFB → **Website Embed**: copy the menu embed URL → set `UNTAPPD_MENU_EMBED_URL`.
      _(This one env var alone turns on the live beer list.)_
- [ ] UTFB → **API**: generate a **read-only token** → set `UNTAPPD_API_TOKEN`.
- [ ] Note your **location ID** in UTFB (not the public venue id `11290340`) → set `UNTAPPD_LOCATION_ID`.
- [ ] Decide beer-menu style: keep the **Untappd embed** (fast, Untappd-styled) or
      have us render it **native** to match the site theme.
- [x] Leaderboard name display: **first name** as the main line, **@username** as
      the subtitle. _(Decided.)_

Once the env vars are set, ping me and I'll: add the `Checkin` table, build the
check-in poller, and implement the live leaderboard (top drinkers + most-popular
beers over the last 6 hours).

## Hosting + database

- [ ] Pick a Postgres provider (Neon via Vercel integration, or Supabase) and set
      `DATABASE_URL` (pooled) + a direct URL for migrations.
- [ ] If on Vercel and you want the 6-hour leaderboard to refresh every few
      minutes, you'll need **Vercel Pro** (Hobby cron runs ~daily) or an external
      trigger (GitHub Actions / cron-job.org / Upstash QStash).
- [ ] Set every var from `.env.example` in your host's dashboard.

## Telegram bot

- [ ] Create the bot via @BotFather → set `TELEGRAM_BOT_TOKEN`.
- [ ] Generate and set `TELEGRAM_WEBHOOK_SECRET`.
- [ ] Message the bot, grab the chat ID it replies with, add it to
      `TELEGRAM_ALLOWED_CHAT_IDS`.
- [ ] After deploy, run `npm run telegram:set-webhook`.
