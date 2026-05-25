export const restaurant = {
  name: "Bierhaul",
  tagline: "Pull up a bench.",
  city: "Thornton, PA",
  established: "2023",
  address: ["341 Thornton Rd", "Thornton, PA 19373"],
  phone: "610.550.3440",
  email: "hello@bierhaul.com",
  social: {
    instagram: "https://www.instagram.com/bierhaul",
    facebook: "https://www.facebook.com/Bierhaul/",
  },
  about:
    "A modern farmhouse lagerhaus in the rolling country west of Philly. Twenty-four taps, a thoughtful menu, and long communal tables built for slowing down.",
  hours: [
    { day: "Monday", time: "Closed" },
    { day: "Tuesday", time: "12:00 PM – 11:00 PM" },
    { day: "Wednesday", time: "12:00 PM – 11:00 PM" },
    { day: "Thursday", time: "12:00 PM – 12:00 AM" },
    { day: "Friday", time: "12:00 PM – 12:00 AM" },
    { day: "Saturday", time: "12:00 PM – 12:00 AM" },
    { day: "Sunday", time: "12:00 PM – 9:00 PM" },
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
  lunch: "Served Tuesday through Saturday, noon to four.",
  dinner: "From four until close. Family-style portions on request.",
  cocktail: "House menu changes seasonally. Spirit-free options too.",
  specials: "Tonight only. When they're gone, they're gone.",
};

export function isMenuType(value: string): value is MenuType {
  return (MENU_TYPES as readonly string[]).includes(value);
}
