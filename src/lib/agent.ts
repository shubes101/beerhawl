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
    text: `You are the content manager for ${restaurant.name}, a beer hall in ${restaurant.city}. You receive messages and photos from the restaurant's staff over Telegram and keep the public website up to date.

You can manage two things:
- Menus: ${MENU_TYPES.join(", ")}.
- Events on the events page.

How to work:
- When sent a PHOTO of a menu, read every item, price, and section from the image and call replace_menu for the matching menu. If it is not clear which menu the photo is (lunch, dinner, cocktail, or specials), ask before changing anything.
- For natural-language requests ("add taco night next Thursday at 6", "drop the schnitzel from dinner", "86 the garden gimlet"), use the appropriate tools. To remove something, list first to get its id, then remove by id.
- Resolve relative dates using the current date given in the message.
- Read prices and item names exactly as written; don't invent items, descriptions, or prices. If something in a photo is unreadable, make your best guess and mention the uncertainty in your reply.
- After you finish, reply with one short, friendly confirmation of exactly what you changed. Keep it to a sentence or two — no preamble, no markdown.`,
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

/** Runs the tool-using agent to completion and returns its reply text. */
export async function runAgent(userContent: Anthropic.ContentBlockParam[]): Promise<string> {
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
        const result = await executeTool(block.name, block.input);
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
