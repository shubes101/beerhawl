import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Store an event on a given calendar day at noon UTC so it renders on the same
// day across US time zones.
function day(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T12:00:00.000Z`);
}

type Item = { name: string; price?: string; description?: string };
type Section = { name: string; items: Item[] };

const MENUS: Record<string, Section[]> = {
  lunch: [
    {
      name: "Snacks & Starters",
      items: [
        { name: "House Pretzel", price: "8", description: "Soft, blistered, served with hop mustard and beer cheese." },
        { name: "Marinated Olives", price: "7", description: "Castelvetrano, taggiasca, orange peel, fennel pollen." },
        { name: "Fried Cheese Curds", price: "10", description: "Wisconsin curds, beer batter, smoked tomato jam." },
        { name: "Charred Shishitos", price: "9", description: "Lemon, sea salt, bonito flakes." },
      ],
    },
    {
      name: "Sandwiches",
      items: [
        { name: "Smoked Brisket Dip", price: "18", description: "Twelve-hour brisket, gruyère, horseradish, jus." },
        { name: "Schnitzel Sub", price: "16", description: "Pork cutlet, dill pickle, mustard slaw, kaiser." },
        { name: "Garden Reuben", price: "15", description: "Roasted celeriac, sauerkraut, swiss, russian on rye." },
        { name: "The Haul Burger", price: "17", description: "Two smashed patties, american, onion jam, sesame bun." },
      ],
    },
    {
      name: "Bowls & Boards",
      items: [
        { name: "Charcuterie Board", price: "Market", description: "Three meats, three cheeses, mustards, pickles, levain." },
        { name: "Farmhouse Caesar", price: "14", description: "Little gem, pumpernickel crouton, anchovy, pecorino." },
        { name: "Grain Bowl", price: "15", description: "Farro, roasted squash, kale, harissa yogurt, pickled onion." },
      ],
    },
  ],
  dinner: [
    {
      name: "Starters",
      items: [
        { name: "Oyster Mushroom Toast", price: "14", description: "Wood-roasted mushrooms, whipped ricotta, lemon, charred levain." },
        { name: "Chicken Liver Mousse", price: "13", description: "Bourbon, brown butter, grilled brioche, pickled shallot." },
        { name: "Charred Cabbage", price: "12", description: "Smoked anchovy butter, pangrattato, lemon." },
        { name: "Steak Tartare", price: "18", description: "Hand-cut, capers, dijon, quail egg, frites." },
      ],
    },
    {
      name: "Mains",
      items: [
        { name: "Half Chicken, Beer Brick", price: "26", description: "Pressed under a kettle weight over coals. Schmaltz potatoes, salsa verde." },
        { name: "Dry-Aged Strip", price: "44", description: "14 oz, bone-in, smoked bone marrow, watercress." },
        { name: "Trout Almondine", price: "29", description: "Whole-roasted, brown butter, capers, charred lemon." },
        { name: "Pork Schnitzel", price: "27", description: "Hand-pounded, lingonberry, spätzle, dill." },
        { name: "Mushroom Spätzle", price: "22", description: "Hand-rolled noodles, cremini, brown butter, parmigiano." },
        { name: "Roasted Cauliflower", price: "21", description: "Whole head, tahini, sumac, charred scallion." },
      ],
    },
    {
      name: "Sides",
      items: [
        { name: "Spätzle", price: "9" },
        { name: "Smashed Potatoes", price: "8" },
        { name: "Roasted Carrots", price: "9", description: "Honey, harissa, yogurt." },
        { name: "Long Bean Salad", price: "10" },
      ],
    },
  ],
  cocktail: [
    {
      name: "Signatures",
      items: [
        { name: "Garden Gimlet", price: "13", description: "Gin, snap pea cordial, lime, mint." },
        { name: "Smoke & Honey", price: "14", description: "Mezcal, wildflower honey, lemon, chile tincture." },
        { name: "Farmer's Old Fashioned", price: "15", description: "Rye, maple, black walnut bitters, orange." },
        { name: "Plum Sour", price: "13", description: "Bourbon, shiso, plum, lemon, egg white." },
        { name: "Bee's Knees", price: "13", description: "Gin, honey, lemon, salt." },
      ],
    },
    {
      name: "Spirit-Free",
      items: [
        { name: "Garden N/A", price: "9", description: "Snap pea cordial, lime, soda, mint." },
        { name: "Smoked Honey Soda", price: "9", description: "Lapsang tea, honey, lemon, soda." },
      ],
    },
  ],
  specials: [
    {
      name: "This Week",
      items: [
        { name: "Oyster Mushroom Toast", price: "14", description: "Wood-roasted mushrooms, whipped ricotta, lemon, charred levain." },
        { name: "Half Chicken, Beer Brick", price: "26", description: "Pressed under a kettle weight over coals. Schmaltz potatoes, salsa verde." },
        { name: "Garden Gimlet", price: "13", description: "Gin, snap pea cordial, lime, a sprig of mint from the back lot." },
      ],
    },
    {
      name: "Off the Board",
      items: [
        { name: "Lamb Shoulder", price: "32", description: "Slow-roasted, salsa verde, white beans, grilled bread. Serves two." },
        { name: "Whole Striped Bass", price: "Market", description: "Salt-baked, herbs, lemon, drawn butter." },
        { name: "Plum & Almond Tart", price: "11", description: "Buttery pastry, frangipane, last of the local plums." },
      ],
    },
  ],
};

const EVENTS = [
  { title: "Live Jazz — The Cellar Trio", date: day("2026-05-29"), timeLabel: "8:00 PM", location: "Main Hall", description: "Standards, hard bop, and a few originals. No cover, first come first served." },
  { title: "Brewer's Night: Tired Hands", date: day("2026-06-04"), timeLabel: "7:00 PM", location: "Tap Room", description: "Six rotating drafts from the Ardmore farmhouse, plus the head brewer pouring & talking shop." },
  { title: "Sunday Long Table", date: day("2026-06-07"), timeLabel: "5:00 PM", location: "Long Table", description: "Family-style supper. Three courses, one big table, twelve seats. $55 — reserve by Friday." },
  { title: "Trivia Tuesday", date: day("2026-06-09"), timeLabel: "7:30 PM", location: "Tap Room", description: "Five rounds, free to play, winning team gets the next round on us." },
  { title: "Open Mic Comedy", date: day("2026-06-12"), timeLabel: "8:30 PM", location: "The Attic", description: "Local comics, ten-minute sets, an honest crowd. 21+." },
  { title: "Father's Day Pig Roast", date: day("2026-06-21"), timeLabel: "1:00 PM – 6:00 PM", location: "Back Lot", description: "Whole hog on the cinder block pit. Sides, slaw, beer flights. Walk-ins welcome." },
];

async function main() {
  await prisma.menuItem.deleteMany();
  await prisma.event.deleteMany();

  for (const [menuType, sections] of Object.entries(MENUS)) {
    let order = 0;
    const data = sections.flatMap((section) =>
      section.items.map((it) => ({
        menuType,
        section: section.name,
        name: it.name,
        description: it.description ?? null,
        price: it.price ?? null,
        sortOrder: order++,
      })),
    );
    await prisma.menuItem.createMany({ data });
  }

  await prisma.event.createMany({ data: EVENTS });

  console.log("Seeded menus and events.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
