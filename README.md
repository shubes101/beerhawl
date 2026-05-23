# Bierhaul

Website for **Bierhaul**, a beer hall in Thornton, PA — plus a Telegram agent that
lets staff update the site by messaging it. Send the bot a photo of a menu and it
reads the items with Claude's vision and publishes them; send it a note like
"add live jazz next Friday at 8pm" and it updates the events page.

## Stack

- **Next.js (App Router)** — serves the public site and hosts the Telegram webhook
  at `/api/telegram`.
- **Claude (`claude-opus-4-7`)** — one model does both the menu-photo OCR and the
  natural-language → structured-update parsing, via tool use.
- **Prisma + Postgres (Neon)** for menus/events storage.
- **Telegram Bot API** for the messaging interface.

## How it works

```
Telegram message/photo ──▶ /api/telegram ──▶ Claude (vision + tools)
                                                 │
                          replace_menu / add_event / … tools
                                                 │
                                                 ▼
                                            Prisma DB ──▶ public pages
```

The agent (`src/lib/agent.ts`) exposes tools — `replace_menu`, `add_menu_item`,
`remove_menu_item`, `list_menu`, `add_event`, `list_events`, `remove_event` — and
runs a tool-use loop until it has applied the change, then replies with a short
confirmation. The site pages read from the database at request time, so updates
appear immediately.

## Local setup

1. **Install** (requires Node 20.6+; Node 22 recommended):

   ```bash
   npm install
   ```

2. **Configure env** — copy and fill in:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` + `DIRECT_URL` to a Postgres (a [Neon](https://neon.tech)
   project — a free dev branch works for local). Set `ANTHROPIC_API_KEY` and
   `TELEGRAM_BOT_TOKEN` (from [@BotFather](https://t.me/BotFather)) for the bot.

3. **Create and seed the database:**

   ```bash
   npm run db:push   # pushes the schema to Postgres
   npm run db:seed   # loads sample menus + events
   ```

4. **Run:**

   ```bash
   npm run dev
   ```

   The site is at http://localhost:3000.

## Wiring up the Telegram bot

1. Create a bot with [@BotFather](https://t.me/BotFather), put the token in
   `TELEGRAM_BOT_TOKEN`.
2. Pick a webhook secret and put it in `TELEGRAM_WEBHOOK_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```

3. Deploy the app somewhere with a public HTTPS URL and set `PUBLIC_URL` to it.
4. Register the webhook:

   ```bash
   npm run telegram:set-webhook
   ```

5. Message your bot once. It will reply with your **chat ID** — add it to
   `TELEGRAM_ALLOWED_CHAT_IDS` (comma-separated for multiple people) and redeploy.
   Only whitelisted chats can change the site.

Now send the bot:

- a **photo** of the lunch / dinner / cocktail / specials menu (optionally with a
  caption saying which one), or
- a **message** like _"add trivia night every—no—on June 12 at 7pm in the beer garden"_
  or _"86 the garden gimlet"_.

> **Local testing without a public URL:** run `npm run dev`, expose it with a
> tunnel (e.g. `ngrok http 3000`), set `PUBLIC_URL` to the tunnel URL, then
> `npm run telegram:set-webhook`.

## Deploying to Vercel (with Neon Postgres)

1. **Provision the database.** Add the **Neon** Postgres integration from the Vercel
   dashboard (Storage tab), or create a project at [neon.tech](https://neon.tech).
   You need two connection strings: the **pooled** one (host contains `-pooler`)
   and the **direct** one.
2. **Set env vars** in Vercel → Settings → Environment Variables (see `.env.example`):
   `DATABASE_URL` = pooled, `DIRECT_URL` = direct, plus `ANTHROPIC_API_KEY` and the
   `TELEGRAM_*` vars for the bot.
3. **Create the schema** against Neon (once), from your machine with the same env:
   ```bash
   npm run db:push && npm run db:seed
   ```
4. **Deploy.** `next build` runs `prisma generate` automatically; pages read the DB
   at request time on the Node runtime.
5. After the first deploy, set `PUBLIC_URL` to your Vercel URL and run
   `npm run telegram:set-webhook` to point Telegram at `/api/telegram`.

## Notes

- The webhook handler runs the model synchronously and replies when done; a single
  photo/instruction completes well within Telegram's webhook window. If you add
  heavier workflows, move processing to a queue.
- Requests are verified two ways: the `X-Telegram-Bot-Api-Secret-Token` header
  must match `TELEGRAM_WEBHOOK_SECRET`, and the chat must be in
  `TELEGRAM_ALLOWED_CHAT_IDS`.
