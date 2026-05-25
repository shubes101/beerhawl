import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { MENU_TYPES, MenuType, isMenuType, restaurant } from "@/lib/restaurant";

// Per-request model routing: photos (OCR) use the vision-strong model; text-only
// requests downshift to a cheaper one. ANTHROPIC_MODEL, if set, forces a single
// model for both (disables routing).
const FORCED_MODEL = process.env.ANTHROPIC_MODEL;
const VISION_MODEL = FORCED_MODEL ?? process.env.ANTHROPIC_MODEL_VISION ?? "claude-opus-4-7";
const TEXT_MODEL = FORCED_MODEL ?? process.env.ANTHROPIC_MODEL_TEXT ?? "claude-sonnet-4-6";
const MAX_TURNS = 8;

// Constructed lazily so a missing ANTHROPIC_API_KEY only fails at request time,
// not at import/build time.
let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

/* -------------------------------------------------------------------------- */
/*  Tool definitions                                                          */
/* -------------------------------------------------------------------------- */

const TOOLS: Anthropic.Tool[] = [
  {
    name: "replace_menu",
    description:
      "Replace the ENTIRE contents of one menu with a new set of items. Use this when given a photo of a full menu (e.g. the new dinner menu) — extract every item and call this once. This deletes all current items for that menu first.",
    input_schema: {
      type: "object",
      properties: {
        menu_type: { type: "string", enum: [...MENU_TYPES] },
        items: {
          type: "array",
          description: "Items in the order they should appear on the page.",
          items: {
            type: "object",
            properties: {
              section: {
                type: "string",
                description: "Heading this item sits under, e.g. 'Starters', 'Mains', 'Drafts'. Omit if the menu has no sections.",
              },
              name: { type: "string" },
              description: { type: "string" },
              price: {
                type: "string",
                description: "Free-form price as printed, e.g. '14', '$14', or 'Market'.",
              },
              tags: {
                type: "array",
                items: { type: "string", enum: ["veg", "vgn", "gf", "gfo"] },
                description: "Dietary tags. Map menu marks: (v)→veg, (veg)→vgn, (GF)→gf, (GFO)→gfo.",
              },
            },
            required: ["name"],
          },
        },
      },
      required: ["menu_type", "items"],
    },
  },
  {
    name: "propose_menu",
    description:
      "Stage a full menu captured from a PHOTO for staff to review before it goes live. Use this — NOT replace_menu — whenever the change comes from a menu photo (or when correcting a still-pending capture). Nothing is published until the user taps Publish. Same fields as replace_menu.",
    input_schema: {
      type: "object",
      properties: {
        menu_type: { type: "string", enum: [...MENU_TYPES] },
        items: {
          type: "array",
          description: "The full menu in display order.",
          items: {
            type: "object",
            properties: {
              section: { type: "string", description: "Heading this item sits under, e.g. 'Shareables', 'Sandwiches'." },
              name: { type: "string" },
              description: { type: "string" },
              price: { type: "string", description: "Free-form price as printed, e.g. '14', '$14', or 'Market'." },
              tags: {
                type: "array",
                items: { type: "string", enum: ["veg", "vgn", "gf", "gfo"] },
                description: "Dietary tags. Map menu marks: (v)→veg, (veg)→vgn, (GF)→gf, (GFO)→gfo.",
              },
            },
            required: ["name"],
          },
        },
      },
      required: ["menu_type", "items"],
    },
  },
  {
    name: "add_menu_item",
    description: "Add a single item to a menu without touching the rest of it.",
    input_schema: {
      type: "object",
      properties: {
        menu_type: { type: "string", enum: [...MENU_TYPES] },
        section: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        price: { type: "string" },
        tags: {
          type: "array",
          items: { type: "string", enum: ["veg", "vgn", "gf", "gfo"] },
          description: "Dietary tags: (v)→veg, (veg)→vgn, (GF)→gf, (GFO)→gfo.",
        },
      },
      required: ["menu_type", "name"],
    },
  },
  {
    name: "remove_menu_item",
    description:
      "PERMANENTLY delete a single menu item by its id. Only use when staff explicitly want it gone for good (e.g. \"delete the schnitzel permanently\"). For a temporary sold-out, use eighty_six_item instead. Call list_menu first to find the id.",
    input_schema: {
      type: "object",
      properties: { item_id: { type: "string" } },
      required: ["item_id"],
    },
  },
  {
    name: "eighty_six_item",
    description:
      "\"86\" a single menu item by its id: mark it temporarily sold out (it stays on the site, struck-through as Sold Out, and is remembered so it can be recalled later). Use for \"86 the garden gimlet\", \"we're out of the wedge\", \"drop the schnitzel for now\". Call list_menu first to find the id.",
    input_schema: {
      type: "object",
      properties: { item_id: { type: "string" } },
      required: ["item_id"],
    },
  },
  {
    name: "recall_item",
    description:
      "Recall a previously 86'd item by its id: clear its sold-out flag so it shows normally again. Use for \"recall the garden gimlet\", \"the wedge is back\". Call list_menu first to find the id (it flags which items are currently 86'd).",
    input_schema: {
      type: "object",
      properties: { item_id: { type: "string" } },
      required: ["item_id"],
    },
  },
  {
    name: "list_menu",
    description: "List the current items (with ids) for one menu.",
    input_schema: {
      type: "object",
      properties: { menu_type: { type: "string", enum: [...MENU_TYPES] } },
      required: ["menu_type"],
    },
  },
  {
    name: "add_event",
    description: "Add an event to the events page.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        date: {
          type: "string",
          description: "Calendar date in YYYY-MM-DD. Resolve relative dates (e.g. 'next Friday') using the current date provided in the message.",
        },
        time_label: {
          type: "string",
          description: "Human-readable time as it should display, e.g. '7:00 PM' or '6–9 PM'. Optional.",
        },
        location: { type: "string" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "list_events",
    description: "List upcoming events (with ids).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "remove_event",
    description: "Remove an event by its id. Call list_events first to find the id.",
    input_schema: {
      type: "object",
      properties: { event_id: { type: "string" } },
      required: ["event_id"],
    },
  },
  {
    name: "set_specials_enabled",
    description:
      "Show or hide the Specials menu across the whole site (its section, its tab, and the home specials block). Turn it OFF when there are no specials; turn it back ON when specials return. Saved specials items are kept either way.",
    input_schema: {
      type: "object",
      properties: {
        enabled: { type: "boolean", description: "true to show specials, false to hide them" },
      },
      required: ["enabled"],
    },
  },
];

/* -------------------------------------------------------------------------- */
/*  Tool executors                                                            */
/* -------------------------------------------------------------------------- */

function dateFromYmd(ymd: string): Date {
  // Store at noon UTC so the event renders on the same calendar day everywhere.
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${ymd}`);
  return d;
}

function ymdFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type ToolOutput = { content: string; isError?: boolean };

function ok(data: unknown): ToolOutput {
  return { content: JSON.stringify(data) };
}

function fail(message: string): ToolOutput {
  return { content: JSON.stringify({ error: message }), isError: true };
}

const ALLOWED_TAGS = ["veg", "vgn", "gf", "gfo"];
function cleanTags(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).filter((t) => ALLOWED_TAGS.includes(t)) : [];
}

export type MenuItemInput = {
  section: string | null;
  name: string;
  description: string | null;
  price: string | null;
  tags: string[];
};

/** Normalize raw tool/JSON items into the stored shape (drops nameless rows). */
export function normalizeItems(raw: unknown): MenuItemInput[] {
  const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return arr
    .map((it) => ({
      section: it.section ? String(it.section) : null,
      name: String(it.name ?? "").trim(),
      description: it.description ? String(it.description) : null,
      price: it.price !== undefined && it.price !== null ? String(it.price) : null,
      tags: cleanTags(it.tags),
    }))
    .filter((it) => it.name.length > 0);
}

/** Replace a whole menu's items. Used by replace_menu (text) and Publish (callback). */
export async function writeMenu(menuType: string, items: MenuItemInput[]): Promise<number> {
  if (!isMenuType(menuType)) throw new Error(`Unknown menu type: ${menuType}`);
  await prisma.$transaction([
    prisma.menuItem.deleteMany({ where: { menuType } }),
    prisma.menuItem.createMany({
      data: items.map((it, i) => ({
        menuType,
        section: it.section,
        name: it.name,
        description: it.description,
        price: it.price,
        tags: it.tags,
        sortOrder: i,
      })),
    }),
  ]);
  return items.length;
}

/** The "captured" readout shown for a menu (photo OCR proposal or replace). */
export function formatCapture(menuType: string, items: MenuItemInput[]): string {
  const lines = items.slice(0, 80).map((it) => {
    const price = it.price && it.price.trim() ? ` — ${it.price}` : "";
    return `• ${it.name}${price}`;
  });
  const more = items.length > 80 ? `\n…and ${items.length - 80} more` : "";
  return `📋 Read the ${menuType} menu — captured ${items.length} item${
    items.length === 1 ? "" : "s"
  }:\n${lines.join("\n")}${more}`;
}

async function executeTool(name: string, input: unknown): Promise<ToolOutput> {
  const args = (input ?? {}) as Record<string, unknown>;
  try {
    switch (name) {
      case "replace_menu": {
        const menuType = String(args.menu_type ?? "");
        if (!isMenuType(menuType)) return fail(`Unknown menu_type. Use one of: ${MENU_TYPES.join(", ")}.`);
        const items = normalizeItems(args.items);
        if (items.length === 0) return fail("No items provided.");
        await writeMenu(menuType, items);
        return ok({ menu_type: menuType, items_set: items.length });
      }

      case "add_menu_item": {
        const menuType = String(args.menu_type ?? "");
        if (!isMenuType(menuType)) return fail(`Unknown menu_type. Use one of: ${MENU_TYPES.join(", ")}.`);
        const last = await prisma.menuItem.findFirst({
          where: { menuType },
          orderBy: { sortOrder: "desc" },
        });
        const created = await prisma.menuItem.create({
          data: {
            menuType,
            section: args.section ? String(args.section) : null,
            name: String(args.name ?? "").trim(),
            description: args.description ? String(args.description) : null,
            price: args.price !== undefined && args.price !== null ? String(args.price) : null,
            tags: cleanTags(args.tags),
            sortOrder: (last?.sortOrder ?? -1) + 1,
          },
        });
        return ok({ added: { id: created.id, name: created.name } });
      }

      case "remove_menu_item": {
        const id = String(args.item_id ?? "");
        const existing = await prisma.menuItem.findUnique({ where: { id } });
        if (!existing) return fail("No menu item with that id.");
        await prisma.menuItem.delete({ where: { id } });
        return ok({ removed: { id, name: existing.name } });
      }

      case "eighty_six_item": {
        const id = String(args.item_id ?? "");
        const existing = await prisma.menuItem.findUnique({ where: { id } });
        if (!existing) return fail("No menu item with that id.");
        if (existing.eightySixedAt) return ok({ already_86ed: true, id, name: existing.name });
        await prisma.menuItem.update({ where: { id }, data: { eightySixedAt: new Date() } });
        return ok({ eighty_sixed: { id, name: existing.name } });
      }

      case "recall_item": {
        const id = String(args.item_id ?? "");
        const existing = await prisma.menuItem.findUnique({ where: { id } });
        if (!existing) return fail("No menu item with that id.");
        await prisma.menuItem.update({ where: { id }, data: { eightySixedAt: null } });
        return ok({ recalled: { id, name: existing.name } });
      }

      case "list_menu": {
        const menuType = String(args.menu_type ?? "");
        if (!isMenuType(menuType)) return fail(`Unknown menu_type. Use one of: ${MENU_TYPES.join(", ")}.`);
        const items = await prisma.menuItem.findMany({
          where: { menuType },
          orderBy: { sortOrder: "asc" },
        });
        return ok({
          menu_type: menuType,
          items: items.map((i) => ({
            id: i.id,
            section: i.section,
            name: i.name,
            description: i.description,
            price: i.price,
            tags: i.tags,
            eighty_sixed: i.eightySixedAt !== null,
          })),
        });
      }

      case "add_event": {
        const created = await prisma.event.create({
          data: {
            title: String(args.title ?? "").trim(),
            description: args.description ? String(args.description) : null,
            date: dateFromYmd(String(args.date ?? "")),
            timeLabel: args.time_label ? String(args.time_label) : null,
            location: args.location ? String(args.location) : null,
          },
        });
        return ok({
          added: { id: created.id, title: created.title, date: ymdFromDate(created.date) },
        });
      }

      case "list_events": {
        const events = await prisma.event.findMany({ orderBy: { date: "asc" } });
        return ok({
          events: events.map((e) => ({
            id: e.id,
            title: e.title,
            date: ymdFromDate(e.date),
            time_label: e.timeLabel,
            location: e.location,
          })),
        });
      }

      case "remove_event": {
        const id = String(args.event_id ?? "");
        const existing = await prisma.event.findUnique({ where: { id } });
        if (!existing) return fail("No event with that id.");
        await prisma.event.delete({ where: { id } });
        return ok({ removed: { id, title: existing.title } });
      }

      case "set_specials_enabled": {
        const enabled = Boolean(args.enabled);
        await prisma.setting.upsert({
          where: { key: "specials_enabled" },
          update: { value: String(enabled) },
          create: { key: "specials_enabled", value: String(enabled) },
        });
        return ok({ specials_enabled: enabled });
      }

      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Tool execution failed.");
  }
}

/* -------------------------------------------------------------------------- */
/*  Agent loop                                                                */
/* -------------------------------------------------------------------------- */

const SYSTEM: Anthropic.TextBlockParam[] = [
  {
    type: "text",
    text: `You are the content manager for ${restaurant.name} in ${restaurant.city}. You receive messages and photos from the restaurant's staff over Telegram and keep the public website up to date.

You can manage:
- Menus: ${MENU_TYPES.join(", ")}.
- Events on the events page.
- Whether the Specials menu is shown or hidden on the site.

How to work:
- ALWAYS act in the same response: when you decide to make a change, call the matching tool immediately. Never reply that you'll do something and then stop without calling a tool.
- PHOTO(S) of a menu → call propose_menu (NOT replace_menu). A single message may contain SEVERAL photos that are different PAGES of the same menu — read ALL of them and combine into ONE proposal. Read every item, price, section and dietary mark and stage the FULL menu. This does NOT publish — the staff get a "captured" readout with Publish/Discard buttons. Extract everything, don't just describe it. If it's genuinely unclear which menu the photo is (lunch, dinner, cocktail, specials), ask first.
- If the message note says a menu capture is PENDING: when this message is a CORRECTION, call propose_menu again with the full corrected menu. When this message is ANOTHER PHOTO of the SAME menu type, treat it as ADDITIONAL PAGE(S) — call propose_menu with the pending items PLUS the new page's items, combined into the full menu in order (don't duplicate a section header or an item that already appears). If the new photo is clearly a DIFFERENT menu type, propose that as a new menu instead. Always re-stage the full menu for review; never use replace_menu for photo captures.
- TEXT requests ("add taco night next Thursday at 6", "86 the garden gimlet") are applied immediately with the matching tool (replace_menu, add_menu_item, eighty_six_item, recall_item, remove_menu_item, add_event, remove_event, set_specials_enabled). To act on a single item, call list_menu first to get its id, then call the right tool by id.
- Taking an item off the menu: "86 X", "we're out of X", "drop X", "X is sold out / unavailable" → eighty_six_item (a TEMPORARY sold-out that's remembered and can be recalled — the item stays listed, struck-through). Bringing it back: "recall X", "X is back", "un-86 X" → recall_item. Use remove_menu_item ONLY when staff are explicit that it should be gone for good ("delete X permanently", "remove X for good"). When unsure between 86 and permanent delete, prefer eighty_six_item since it's reversible. list_menu marks which items are currently 86'd, so use it to pick the right id to recall.
- To hide or show the Specials menu, use set_specials_enabled — off when there are no specials, on when they return.
- Resolve relative dates using the current date given in the message.
- Read prices and item names exactly as written; don't invent items, descriptions, or prices. If something in a photo is unreadable, make your best guess and call it out.
- Capture dietary marks as each item's tags: (v)→veg, (veg)→vgn, (GF)→gf, (GFO)→gfo.
- Final reply: one short, friendly line. For text edits, summarize what you changed and invite corrections ("…— let me know if it needs any fixes."). For a staged photo capture, tell them to review and tap Publish (or send a tweak). No preamble, no markdown.`,
    cache_control: { type: "ephemeral" },
  },
];

export type AgentImage = { data: string; mediaType: string };

export function buildUserContent(opts: {
  text?: string;
  images?: AgentImage[];
  nowLabel: string;
}): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [
    { type: "text", text: `Current date and time (America/New_York): ${opts.nowLabel}` },
  ];

  for (const img of opts.images ?? []) {
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: img.data,
      },
    });
  }

  if (opts.text && opts.text.trim()) {
    blocks.push({ type: "text", text: opts.text.trim() });
  }

  return blocks;
}

function textFromResponse(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function hasImage(content: Anthropic.ContentBlockParam[]): boolean {
  return content.some((b) => b.type === "image");
}

export type MenuProposal = { menuType: string; items: MenuItemInput[]; summary: string };
export type PendingProposal = { menuType: string; items: MenuItemInput[] };
export type EightySixed = { itemId: string; name: string };

export type ProgressFn = (text: string) => Promise<void> | void;

type ToolInput = Record<string, unknown>;

// A "what I captured" message sent BEFORE the DB write (esp. for photo OCR).
function progressBefore(name: string, input: ToolInput): string | null {
  if (name === "replace_menu") {
    return formatCapture(String(input.menu_type ?? "menu"), normalizeItems(input.items));
  }
  if (name === "add_menu_item") {
    return `➕ Adding "${String(input.name ?? "").trim()}" to the ${String(
      input.menu_type ?? "menu",
    )} menu…`;
  }
  if (name === "add_event") {
    const when = input.date ? ` on ${String(input.date)}` : "";
    return `📅 Adding event "${String(input.title ?? "").trim()}"${when}…`;
  }
  return null;
}

// A confirmation sent AFTER the DB write commits (or an error if it failed).
function progressAfter(name: string, input: ToolInput, result: ToolOutput): string | null {
  if (result.isError) {
    let reason = "something went wrong";
    try {
      reason = (JSON.parse(result.content) as { error?: string }).error ?? reason;
    } catch {
      /* keep default */
    }
    return `⚠️ Couldn't complete that: ${reason}`;
  }
  switch (name) {
    case "replace_menu": {
      const menu = String(input.menu_type ?? "menu");
      const n = Array.isArray(input.items) ? input.items.length : 0;
      return `✅ Saved the ${menu} menu to the site (${n} item${n === 1 ? "" : "s"}).`;
    }
    case "add_menu_item":
      return `✅ Added "${String(input.name ?? "").trim()}" — it's live on the site.`;
    case "remove_menu_item":
      return "✅ Removed that item from the site.";
    case "eighty_six_item": {
      const data = (() => {
        try {
          return JSON.parse(result.content) as { eighty_sixed?: { name?: string }; already_86ed?: boolean; name?: string };
        } catch {
          return {} as { eighty_sixed?: { name?: string }; already_86ed?: boolean; name?: string };
        }
      })();
      const name = data.eighty_sixed?.name ?? data.name ?? "that item";
      if (data.already_86ed) return `🚫 "${name}" was already 86'd.`;
      return `🚫 86'd "${name}" — marked sold out on the site.`;
    }
    case "recall_item": {
      let name = "that item";
      try {
        name = (JSON.parse(result.content) as { recalled?: { name?: string } }).recalled?.name ?? name;
      } catch {
        /* keep default */
      }
      return `↩️ Recalled "${name}" — it's back on the menu.`;
    }
    case "add_event":
      return `✅ Event "${String(input.title ?? "").trim()}" is live on the events page.`;
    case "remove_event":
      return "✅ Removed that event.";
    case "set_specials_enabled":
      return `✅ Specials are now ${input.enabled ? "showing" : "hidden"} on the site.`;
    default:
      return null; // list_menu / list_events are read-only
  }
}

/**
 * Runs the tool-using agent. Returns the reply text and, if a menu photo was
 * staged via propose_menu, the proposal for the caller to persist + confirm.
 * Model is routed per request: photos → vision model, text → cheaper model.
 */
export async function runAgent(
  userContent: Anthropic.ContentBlockParam[],
  onProgress?: ProgressFn,
  pending?: PendingProposal,
): Promise<{ reply: string; proposal?: MenuProposal; eightySixed?: EightySixed[] }> {
  const model = hasImage(userContent) ? VISION_MODEL : TEXT_MODEL;
  console.log(`[agent] model=${model} images=${hasImage(userContent)} pending=${!!pending}`);

  const firstContent: Anthropic.ContentBlockParam[] = [...userContent];
  if (pending) {
    firstContent.unshift({
      type: "text",
      text: `NOTE: a ${pending.menuType} menu capture is PENDING review (not yet published). These are the pages captured so far: ${JSON.stringify(
        pending.items,
      )}. If this message is ANOTHER PHOTO of the ${pending.menuType} menu, it's an ADDITIONAL PAGE — call propose_menu with these items PLUS the new page's items combined into the full menu (preserve order, no duplicates). If this message CORRECTS the capture, call propose_menu with the full corrected ${pending.menuType} menu. If it's a different menu type or unrelated, handle it normally.`,
    });
  }

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: firstContent }];
  let proposal: MenuProposal | undefined;
  const eightySixed: EightySixed[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client().messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      return { reply: textFromResponse(response) || "Done.", proposal, eightySixed };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      // propose_menu stages a capture for review instead of writing to the DB.
      if (block.name === "propose_menu") {
        const inp = (block.input ?? {}) as ToolInput;
        const menuType = String(inp.menu_type ?? "");
        const items = normalizeItems(inp.items);
        if (!isMenuType(menuType) || items.length === 0) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ error: "Invalid proposal — need a valid menu_type and at least one item." }),
            is_error: true,
          });
        } else {
          proposal = { menuType, items, summary: formatCapture(menuType, items) };
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ staged: true, menu_type: menuType, count: items.length }),
          });
        }
        continue;
      }

      const input = (block.input ?? {}) as ToolInput;
      if (onProgress) {
        const pre = progressBefore(block.name, input);
        if (pre) await onProgress(pre);
      }
      const result = await executeTool(block.name, block.input);
      if (block.name === "eighty_six_item" && !result.isError) {
        try {
          const parsed = JSON.parse(result.content) as { eighty_sixed?: { id: string; name: string } };
          if (parsed.eighty_sixed) {
            eightySixed.push({ itemId: parsed.eighty_sixed.id, name: parsed.eighty_sixed.name });
          }
        } catch {
          /* no recall button if we can't parse the id */
        }
      }
      if (onProgress) {
        const post = progressAfter(block.name, input, result);
        if (post) await onProgress(post);
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.content,
        is_error: result.isError,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "I started on that but ran out of steps — please check the site and try again if needed.",
    proposal,
    eightySixed,
  };
}

/* -------------------------------------------------------------------------- */
/*  Event extraction from social captions (constrained — no menu tools)       */
/* -------------------------------------------------------------------------- */

export type ProposedEvent = {
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  timeLabel?: string;
  location?: string;
};

// A single forced tool: untrusted captions can NEVER reach the menu/specials
// tools, only describe events back to us.
const EVENT_EXTRACT_TOOL: Anthropic.Tool = {
  name: "report_events",
  description:
    "Report every specific, dated upcoming event announced in the caption. Pass an empty array if the caption isn't announcing a dated event.",
  input_schema: {
    type: "object",
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short event name, e.g. 'Live Jazz Night'." },
            date: {
              type: "string",
              description: "Calendar date in YYYY-MM-DD. Resolve relative dates (e.g. 'this Friday') using the current date provided.",
            },
            description: { type: "string", description: "One short line of detail. Optional." },
            time_label: {
              type: "string",
              description: "Human-readable time as written, e.g. '7:00 PM' or '6–9 PM'. Optional.",
            },
            location: {
              type: "string",
              description: "Only if a place other than the restaurant is named. Optional.",
            },
          },
          required: ["title", "date"],
        },
      },
    },
    required: ["events"],
  },
};

const EVENT_EXTRACT_SYSTEM = `You read social-media captions from ${restaurant.name} and extract any specific, dated UPCOMING events they announce (live music, trivia, tastings, dinners, parties, markets, etc.).

Rules:
- Only report an event when there is a concrete calendar date you can resolve to YYYY-MM-DD. Resolve relative dates ("this Friday", "next weekend", "tomorrow") from the current date given in the message. Assume the date is in the future; never report a date in the past.
- A caption may announce zero, one, or several events — report each one.
- Do NOT invent events. Generic posts (a food photo, "open tonight!", a dateless beer drop) are NOT events — report an empty array.
- Keep titles short and factual; read times and places exactly as written.
- Always answer by calling report_events exactly once.`;

/**
 * Pulls any dated, upcoming events out of one Instagram caption. Uses the cheap
 * text model with a single FORCED tool, so a caption can only ever produce event
 * proposals — it can't touch menus or specials. Returns [] for non-events or on
 * any error. Does not write to the DB.
 */
export async function extractEvents(caption: string, nowLabel: string): Promise<ProposedEvent[]> {
  const text = caption.trim();
  if (!text) return [];

  let response: Anthropic.Message;
  try {
    response = await client().messages.create({
      model: TEXT_MODEL,
      max_tokens: 1024,
      system: EVENT_EXTRACT_SYSTEM,
      tools: [EVENT_EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "report_events" },
      messages: [
        {
          role: "user",
          content: `Current date and time (America/New_York): ${nowLabel}\n\nInstagram caption:\n"""\n${text}\n"""`,
        },
      ],
    });
  } catch (err) {
    console.error("[agent] extractEvents error:", err);
    return [];
  }

  const block = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "report_events",
  );
  if (!block) return [];

  const raw = ((block.input ?? {}) as { events?: unknown }).events;
  const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];

  return arr
    .map((e) => ({
      title: String(e.title ?? "").trim(),
      date: String(e.date ?? "").trim(),
      description: e.description ? String(e.description) : undefined,
      timeLabel: e.time_label ? String(e.time_label) : undefined,
      location: e.location ? String(e.location) : undefined,
    }))
    .filter(
      (e) =>
        e.title.length > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        !Number.isNaN(new Date(`${e.date}T12:00:00.000Z`).getTime()),
    );
}
