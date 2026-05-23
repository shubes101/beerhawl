# Bierhaul — Website Design Brief

A self-contained brief for generating/refining the visual design of the Bierhaul
website. Paste this whole file into Claude. Where exact brand values are needed,
this brief points Claude at the live sources to extract them.

---

## 0. How to use this brief

1. Paste this file into Claude.
2. Give Claude the two **brand sources** below so it can lift the *exact* palette,
   typography, logo, and photography style. If Claude can't browse them, attach
   screenshots of the Farmhouse site (home, menu, any interior/food shots) and the
   logo.
3. Ask Claude to produce: a refined style guide (exact hex + font stacks), then
   page mockups for **Home, Menus, Events, Leaderboard** (desktop + mobile), and
   the key component states.

**Brand sources (source of truth — reconcile the style guide in §6 against these):**
- Brand site: **https://bierhaul.com/farmhouse/** — use for palette, type, logo,
  photography style, and voice.
- Untappd venue: **https://untappd.com/v/bierhaul-farmhouse/11290340** — the live
  beer/tap list and check-in activity that the site surfaces.

> Note: the §6 style guide reflects what's currently *implemented* in code. Treat
> the live Farmhouse site as authoritative and update §6 to match it.

---

## 1. Product overview

**What it is:** the public website for **Bierhaul**, a modern farmhouse Bierhaul
in **Thornton, PA**, plus a back-office content agent that lets staff update the
site by texting a Telegram bot (including photos of printed menus).

**Audience:** local diners and beer drinkers deciding where to go tonight; regulars
checking events and the tap list.

**Goals:**
- Make the menus, events, and tap list effortless to browse on a phone.
- Feel warm, communal, and craft-forward — the real Bierhaul, not a generic
  template.
- Let non-technical staff keep it current with zero CMS training (via Telegram).

**Voice & tone:** warm, unfussy, a little wry. Short lines. "Pull up a bench."
Confident about the beer and food without being precious.

---

## 2. Information architecture

| Page | Route | Purpose / contents |
|---|---|---|
| Home | `/` | Hero (location eyebrow, tagline, short about, two CTAs); This Week's Specials (3 cards); Our Menus (links to each menu); Upcoming Events (up to 3). |
| Menus | `/menus` | **On Tap** (live beer list from Untappd) first, then Lunch, Dinner, Cocktails, Specials — each grouped into sections (e.g. Starters/Mains). |
| Events | `/events` | Upcoming events as a vertical list, each with a date chip. |
| Leaderboard | `/leaderboard` | Untappd check-ins over the last 6 hours: **Top Drinkers** and **Most Popular** beers. |
| (Global) | header/footer | Header: wordmark + nav (Home, Menus, Events, Leaderboard). Footer: name/tagline, Visit (address, phone, email), Hours. |

Primary nav order: **Home · Menus · Events · Leaderboard**.

---

## 3. Functionality & backend (what design must account for)

**Stack:** Next.js (App Router) renders the site and hosts the back end as
serverless routes. Pages are dynamic — they read the database at request time, so
edits appear immediately. Target host: Vercel + hosted Postgres.

**Telegram content agent (the "CMS"):** staff message a private Telegram bot.
- Send a **photo of a printed menu** → Claude (`claude-opus-4-7`) reads it with
  vision (OCR) and replaces that menu.
- Send **plain instructions** ("add live jazz next Friday at 8pm", "86 the garden
  gimlet") → Claude parses them and updates menus/events via tools
  (`replace_menu`, `add_menu_item`, `remove_menu_item`, `add_event`,
  `remove_event`, …).
- The bot replies with a one-line confirmation. Access is restricted (shared
  secret + chat allowlist). *Design impact: none on the public site, but the
  content can change at any time, so layouts must handle variable item counts,
  long/short descriptions, and missing prices/sections gracefully.*

**Untappd integration (in progress — currently placeholdered):**
- **Beer list (On Tap):** embedded from Untappd for Business (UTFB). Until UTFB
  Premium is connected, a "coming soon / View on Untappd" card shows.
- **Leaderboard:** a poller will pull venue check-ins (UTFB Check-ins API), store
  them, and compute the last-6-hours boards. Currently a "coming soon" placeholder.
- *Design impact: design both the live and the empty/coming-soon states.*

**Data model (shapes the design must render):**
- `MenuItem`: `menuType` (lunch/dinner/cocktail/specials), optional `section`,
  `name`, optional `description`, optional `price` (free-form: "14", "$14",
  "Market"), `sortOrder`.
- `Event`: `title`, optional `description`, `date`, optional `timeLabel`
  ("7:00 PM"), optional `location`.
- `Checkin` (future): per check-in — first name, username, beer name, brewery,
  timestamp. Leaderboard entries render as **first name** (main line) + **@username**
  (subtitle); beers render as **beer name** + **brewery** (subtitle).

---

## 4. Page-by-page layout notes

**Home**
- **Hero:** small uppercase eyebrow ("Thornton, PA") · large serif tagline ·
  one-paragraph about · two buttons (primary "View Menus", secondary "Upcoming
  Events"). Big, warm, photographic if a hero image is available.
- **This Week's Specials:** 3-up cards (name, price, description). Hide if empty.
- **Our Menus:** 4 link cards (Lunch, Dinner, Cocktails, Specials) → jump to
  `/menus#<type>`. Consider adding an On Tap / Leaderboard highlight.
- **Upcoming Events:** 2-up event cards (date chip + details), "All events →".

**Menus**
- Page title, then **On Tap** section (Untappd embed or placeholder card), then
  each food/drink menu as a section with a heading + blurb, items grouped under
  sub-section headers. Item row: name (serif) left, price (gold) right, description
  below in muted text. Must look right with 3 items or 30.

**Events**
- Vertical list of event cards. Each card: square date chip (month abbr + day) +
  title, weekday · time · location line, optional description. Empty state: "No
  events on the calendar right now — check back soon."

**Leaderboard**
- Eyebrow "Last 6 Hours" + title + one-line description. Two columns: **Top
  Drinkers** (rank, first name + @username subtitle, count) and **Most Popular**
  (rank, beer + brewery subtitle, count). Empty/coming-soon state needed.

---

## 5. Component inventory

Design these as a system (with hover/empty states where relevant):
- **Site header** — wordmark ("Bierhaul" + small "Thornton" tag) + horizontal nav.
- **Site footer** — name/tagline · Visit block · Hours table · copyright.
- **Eyebrow label** — small uppercase, wide letter-spacing, accent color.
- **Buttons** — primary (solid accent on dark) and secondary (outlined).
- **Menu item row** — name / price / description.
- **Specials card** — name + price + description.
- **Event card** — date chip + meta line + description.
- **Leaderboard board** — titled panel with ranked two-line rows.
- **On Tap card** — Untappd embed *or* coming-soon placeholder with CTA.
- **Section heading** — serif title + muted blurb.

---

## 6. Style guide (current implementation — reconcile with the live Farmhouse site)

> These are the values currently in the codebase (`tailwind.config.ts`). Replace
> with the exact brand values from https://bierhaul.com/farmhouse/.

**Palette (roles → hex):**
| Role | Token | Hex |
|---|---|---|
| Page background (near-black, warm) | `ink` | `#1b1714` |
| Raised surfaces / sections | `espresso` | `#2a221b` |
| Borders / dividers | `bark` | `#3b2f25` |
| Primary text on dark | `cream` | `#f6f0e3` |
| Secondary text | `parchment` | `#efe6d3` |
| Primary accent (CTAs, eyebrows) | `amber` | `#c8841a` |
| Bright accent / prices | `gold` | `#e2a93e` |
| Deep accent | `copper` | `#9a512c` |
| Muted text / labels | `muted` | `#867a6c` |

Overall feel: dark, warm, candle-lit; amber/gold as the spark.

**Typography:**
- Display/headings: serif — currently `Georgia, "Iowan Old Style", "Times New
  Roman", serif`. *(If the Farmhouse site uses a distinctive display face, adopt
  it.)*
- Body/UI: humanist sans — currently `"Helvetica Neue", Helvetica, Arial,
  system-ui, sans-serif`.
- Eyebrows/labels: uppercase, ~0.25em letter-spacing, amber.
- Scale: hero ~3rem→4.5rem; section H2 ~1.875rem; item name ~1.125rem; body ~1rem;
  labels ~0.75rem.

**Layout & spacing:**
- Centered content column, max ~68rem, generous horizontal padding.
- Sections separated by large vertical rhythm (~5rem).
- Cards/panels: ~0.5rem radius, 1px `bark` borders, slightly translucent
  `espresso` fills.

**Imagery direction:** warm, natural-light photography — communal wood tables,
taps and pours, farmhouse textures (timber, brick, linen), close-up food. Avoid
cold/clinical or stocky shots.

**Accessibility:** maintain contrast — cream/parchment on ink passes; use gold (not
amber) for small text on dark if contrast is tight. Don't encode meaning in color
alone.

---

## 7. Asset checklist (source from the brand / Farmhouse site)

- [ ] Logo / wordmark (SVG preferred) — light version for the dark UI.
- [ ] Hero image(s) — wide, warm interior or pour.
- [ ] 2–4 supporting photos (food, taps, room) for cards/sections.
- [ ] Favicon + social/OG image.
- [ ] Exact brand palette + font files or font names.

> The placeholder address, phone, email, hours, and "about" copy currently in the
> code are inventions — replace with the real Farmhouse details.

---

## 8. What to ask Claude to produce

1. A finalized style guide (exact hex, type scale, spacing tokens) reconciled with
   the live Farmhouse site.
2. Desktop + mobile mockups for Home, Menus (incl. On Tap), Events, Leaderboard.
3. Component states: buttons, menu item row, event card, leaderboard row, and the
   On Tap / Leaderboard "coming soon" states.
4. An OG/social share image concept.
