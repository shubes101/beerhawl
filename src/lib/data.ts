import { prisma } from "@/lib/db";
import { MENU_TYPES, MenuType } from "@/lib/restaurant";

export type MenuSection = {
  title: string | null;
  items: {
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    tags: string[];
    soldOut: boolean;
  }[];
};

/** Returns a menu's items grouped into sections, preserving sortOrder. */
export async function getMenu(menuType: MenuType): Promise<MenuSection[]> {
  const items = await prisma.menuItem.findMany({
    where: { menuType },
    orderBy: { sortOrder: "asc" },
  });

  const sections: MenuSection[] = [];
  const indexByTitle = new Map<string, number>();

  for (const item of items) {
    const key = item.section ?? "";
    let idx = indexByTitle.get(key);
    if (idx === undefined) {
      idx = sections.length;
      indexByTitle.set(key, idx);
      sections.push({ title: item.section ?? null, items: [] });
    }
    sections[idx].items.push({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      tags: item.tags,
      soldOut: item.eightySixedAt !== null,
    });
  }

  return sections;
}

/** All menus, keyed by type, each grouped into sections. */
export async function getAllMenus(): Promise<Record<MenuType, MenuSection[]>> {
  const entries = await Promise.all(
    MENU_TYPES.map(async (type) => [type, await getMenu(type)] as const),
  );
  return Object.fromEntries(entries) as Record<MenuType, MenuSection[]>;
}

export function menuItemCount(sections: MenuSection[]): number {
  return sections.reduce((n, s) => n + s.items.length, 0);
}

/** Start of today in the server's local time, used to filter past events. */
function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function getUpcomingEvents(limit?: number) {
  return prisma.event.findMany({
    where: { date: { gte: startOfToday() } },
    orderBy: { date: "asc" },
    take: limit,
  });
}

export type CreateEventInput = {
  title: string;
  date: string; // YYYY-MM-DD
  description?: string | null;
  timeLabel?: string | null;
  location?: string | null;
};

/** Store at noon UTC so the event renders on the same calendar day everywhere. */
function dateFromYmd(ymd: string): Date {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${ymd}`);
  return d;
}

/** Centralized event write (used by the Telegram Publish flow + Instagram sync). */
export async function createEvent(input: CreateEventInput) {
  return prisma.event.create({
    data: {
      title: input.title.trim(),
      description: input.description ? String(input.description) : null,
      date: dateFromYmd(input.date),
      timeLabel: input.timeLabel ? String(input.timeLabel) : null,
      location: input.location ? String(input.location) : null,
    },
  });
}

/** Specials show by default; hidden only when the flag is explicitly "false". */
export async function isSpecialsEnabled(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: "specials_enabled" } });
  return row?.value !== "false";
}
