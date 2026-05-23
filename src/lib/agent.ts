import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { MENU_TYPES, MenuType, isMenuType, restaurant } from "@/lib/restaurant";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
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
    description: "Remove a single menu item by its id. Call list_menu first to find the id.",
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

async function executeTool(name: string, input: unknown): Promise<ToolOutput> {
  const args = (input ?? {}) as Record<string, unknown>;
  try {
    switch (name) {
      case "replace_menu": {
        const menuType = String(args.menu_type ?? "");
        if (!isMenuType(menuType)) return fail(`Unknown menu_type. Use one of: ${MENU_TYPES.join(", ")}.`);
        const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : [];
        if (items.length === 0) return fail("No items provided.");

        await prisma.$transaction([
          prisma.menuItem.deleteMany({ where: { menuType } }),
          prisma.menuItem.createMany({
            data: items.map((it, i) => ({
              menuType,
              section: it.section ? String(it.section) : null,
              name: String(it.name ?? "").trim(),
              description: it.description ? String(it.description) : null,
              price: it.price !== undefined && it.price !== null ? String(it.price) : null,
              tags: cleanTags(it.tags),
              sortOrder: i,
            })),
          }),
        ]);
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
- To hide or show the Specials menu, use set_specials_enabled — turn it off when there are no specials, on when they return. If you add specials items while it's hidden, turn it back on so they show.
- When sent a PHOTO of a menu, read every item, price, and section from the image and call replace_menu for the matching menu in this same response — extract everything and call the tool, do not just describe what you see. If it is genuinely unclear which menu the photo is (lunch, dinner, cocktail, or specials), ask before changing anything.
- For natural-language requests ("add taco night next Thursday at 6", "drop the schnitzel from dinner", "86 the garden gimlet"), use the appropriate tools. To remove something, list first to get its id, then remove by id.
- Resolve relative dates using the current date given in the message.
- Read prices and item names exactly as written; don't invent items, descriptions, or prices. If something in a photo is unreadable, make your best guess and mention the uncertainty in your reply.
- Capture dietary marks as each item's tags: (v)→veg, (veg)→vgn, (GF)→gf, (GFO)→gfo.
- A separate system already posts a "captured" readout and a "saved" confirmation for each change, so your final reply should be one short, friendly line — and call out anything you were unsure about (e.g. an item or price you couldn't read clearly). No preamble, no markdown.`,
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

export type ProgressFn = (text: string) => Promise<void> | void;

type ToolInput = Record<string, unknown>;

// A "what I captured" message sent BEFORE the DB write (esp. for photo OCR).
function progressBefore(name: string, input: ToolInput): string | null {
  if (name === "replace_menu") {
    const menu = String(input.menu_type ?? "menu");
    const items = Array.isArray(input.items) ? (input.items as ToolInput[]) : [];
    const lines = items.slice(0, 60).map((it) => {
      const price =
        it.price !== undefined && it.price !== null && String(it.price).trim()
          ? ` — ${String(it.price)}`
          : "";
      return `• ${String(it.name ?? "").trim()}${price}`;
    });
    return `📋 Read the ${menu} menu — captured ${items.length} item${
      items.length === 1 ? "" : "s"
    }:\n${lines.join("\n")}`;
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

/** Runs the tool-using agent to completion and returns its reply text. */
export async function runAgent(
  userContent: Anthropic.ContentBlockParam[],
  onProgress?: ProgressFn,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userContent }];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      return textFromResponse(response) || "Done.";
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const input = (block.input ?? {}) as ToolInput;
        if (onProgress) {
          const pre = progressBefore(block.name, input);
          if (pre) await onProgress(pre);
        }
        const result = await executeTool(block.name, block.input);
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
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "I started on that but ran out of steps — please check the site and try again if needed.";
}
