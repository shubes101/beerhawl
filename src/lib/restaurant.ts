export const restaurant = {
  name: "Bierhaul",
  tagline: "A modern beer hall in Thornton",
  city: "Thornton, PA",
  address: "Thornton, Pennsylvania 19373",
  phone: "(610) 555-0142",
  email: "hello@bierhaul.com",
  about:
    "Bierhaul is a neighborhood beer hall serving wood-fired plates, a deep draft list, and seasonal cocktails. Long tables, warm light, and good company — pull up a bench.",
  hours: [
    { days: "Mon – Tue", time: "Closed" },
    { days: "Wed – Thu", time: "4:00 PM – 10:00 PM" },
    { days: "Fri", time: "4:00 PM – 12:00 AM" },
    { days: "Sat", time: "11:00 AM – 12:00 AM" },
    { days: "Sun", time: "11:00 AM – 9:00 PM" },
  ],
} as const;

export const MENU_TYPES = ["lunch", "dinner", "cocktail", "specials"] as const;
export type MenuType = (typeof MENU_TYPES)[number];

export const MENU_LABELS: Record<MenuType, string> = {
  lunch: "Lunch",
  dinner: "Dinner",
  cocktail: "Cocktails",
  specials: "Specials",
};

export const MENU_BLURBS: Record<MenuType, string> = {
  lunch: "Midday plates and sandwiches.",
  dinner: "Wood-fired mains and shareable starters.",
  cocktail: "Seasonal cocktails and what's on draft.",
  specials: "Rotating features — here this week only.",
};

export function isMenuType(value: string): value is MenuType {
  return (MENU_TYPES as readonly string[]).includes(value);
}
