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
      name: "Shareables",
      items: [
        { name: "Vesper Board", description: "German fare for 2–3: three chilled sausages, cheeses, and various accoutrements." },
        { name: "Smoke Show Nachos", description: "White corn tortilla chips, smoked pulled pork, beer cheese, shredded lettuce, roasted corn, pickled red onion and jalapeño, lime crema, chimichurri." },
        { name: "Sesame & Sea Salt Pretzel", description: "Bavarian soft pretzel with sesame seeds, B&B pickles, German mustard, beer cheese." },
        { name: "French Onion Soup", description: "Port wine beef stock, crostini croutons, gruyère, provolone, fried leek, scallion." },
        { name: "Roasted Red Pepper Hummus", description: "White bean, roasted garlic and red pepper, crispy chickpeas, olive tapenade, charred cauliflower, carrot and cucumber, seasoned house chips." },
        { name: "Obatzda", description: "Warm Bavarian cheese dip — brie, cream cheese, onion, chives, paprika, caraway. Crispy shallots, served with pretzel nuggets." },
        { name: "Crab Dip", description: "Crab and claw meat, cream cheese, mozzarella, gruyère, old bay, lemon, scallions. Served with white corn tortilla chips." },
        { name: "Marinated Wings", description: "Choice of: Buffalo, Dry Rub, Ginger Soy, Honey Gochujang, Honey Old Bay, Nashville Hot, Spice Bag Dry Rub, or Guinness BBQ." },
        { name: "Peach Caprese", description: "Hot-honey roasted peaches, heirloom tomatoes, fresh mozzarella, pesto-marinated ciliegine, marinated cherry tomatoes, balsamic glaze, basil." },
        { name: "Potstickers", description: "Chicken, corn, lemongrass and onion potstickers. Ginger soy glaze, sesame seeds, scallions." },
        { name: "Shaved Brussels Sprouts", description: "Bacon, apples, balsamic glaze, goat cheese crumbles." },
        { name: "Fried Green Tomatoes", description: "Burrata, honey, balsamic glaze, pork belly, pickled red onions, arugula." },
        { name: "Cheese Curds", description: "Served with marinara." },
        { name: "Fried Pickle Chips", description: "Served with ranch." },
      ],
    },
    {
      name: "The Passion of the Crust",
      items: [
        { name: "Classic Cheese", price: "14", description: "Marinara, mozzarella." },
        { name: "Truffle Mushroom", price: "22", description: "Mushroom blend, pork belly, crispy shallots, truffle zest, mozzarella." },
        { name: "Peach Hot Honey", price: "20", description: "Roasted peaches, bacon, burrata, arugula, Mike's Hot Honey, balsamic glaze." },
        { name: "Pepperoni", price: "18", description: "Cupped pepperoni, mozzarella, Mike's Hot Honey." },
        { name: "Burrata Margherita", price: "18", description: "Heirloom tomatoes, mozzarella, basil." },
        { name: "Veggie", price: "18", description: "Heirloom tomatoes, mozzarella, pickled red onions, mushrooms, asparagus, arugula, balsamic glaze." },
        { name: "Pesto Chicken", price: "20", description: "Braised chicken, house pesto, mozzarella, marinated tomatoes, red onion." },
      ],
    },
    {
      name: "Sandwiches",
      items: [
        { name: "Irish Spice Bag Chicken", description: "Fried chicken thigh, spice bag seasoning, charred bell pepper and onion, arugula, Irish curry aioli, brioche bun. Served with fries." },
        { name: "Salmon BLT", description: "Salmon, thick-cut bacon, romaine, tomato, lemon dill aioli, sourdough. Served with fries." },
        { name: "Bison Burger", description: "Ground bison, bacon, brie, arugula, balsamic glaze, truffle mayo, crispy shallots, brioche bun. Served with fries." },
        { name: "The Schnitzel", description: "Breaded pork loin, arugula, lemon dill aioli, pickled red onion, lemon zest, pretzel bun. Served with fries." },
        { name: "Inglorious Bratwurst", description: "Grilled burnt-end bratwurst, beer-braised kraut, German mustard, beer cheese, pretzel roll. Served with fries." },
        { name: "Smash Burger", description: "Smashed patty, white cheddar, special sauce, B&B pickles, grilled onion, tomato, romaine, brioche. Served with fries." },
        { name: "Gruzka's Smoked Pulled Pork", description: "Smoked pulled pork, coleslaw, arugula, pretzel bun. Served with a side of Guinness BBQ and fries." },
        { name: "Reuben Cheesesteak", description: "Smoked brisket pastrami, beer-braised kraut, gruyère, house Russian dressing, pretzel roll. Served with fries." },
      ],
    },
    {
      name: "Salads",
      items: [
        { name: "Balsamic Salad", description: "Arcadian lettuce, charred cauliflower, crispy shaved sprouts, marinated cherry tomatoes, goat cheese, pickled red onions, pretzel croutons, blistered tomato vinaigrette, balsamic glaze." },
        { name: "Goat Cheese Salad", description: "Goat cheese, blackened blueberries, red onion, spiced walnuts, blueberry-thyme yuzu dressing." },
        { name: "Flatbread Salad", description: "Arcadian lettuce, fried flatbread, cucumber, marinated cherry tomatoes, pickled red onion, crispy chickpeas, green goddess dressing, vegan dill aioli." },
        { name: "Wedge", description: "Iceberg wedge, candied bacon, avocado, hard-boiled egg, marinated tomato, red onion, blue cheese crumbles and dressing." },
        { name: "Caesar Salad", description: "Romaine, shaved parmesan, pretzel croutons, caesar dressing." },
      ],
    },
    {
      name: "Large Plates",
      items: [
        { name: "Baked Mac & Cheese", description: "Pretzel breadcrumbs, scallions. Add chicken, pork belly, or shrimp." },
        { name: "Fish and Chips", description: "Beer-battered flounder, coleslaw, fries, malt vinegar aioli, seafood sauce, tartar, lemon." },
        { name: "Steamed Mussels", description: "Choice of broth: Irish curry, Belgian bier (bacon & pearl pepper), Fra Diavolo (spicy tomato), or lemon pepper crème." },
        { name: "Pork Schnitzel", description: "Breaded pork loin, German potato salad, side arugula salad, pickled red onion, lemon zest." },
      ],
    },
    {
      name: "Sides",
      items: [
        { name: "Fries" },
        { name: "Truffle Fries" },
        { name: "Irish Curry Fries" },
        { name: "German Potato Salad" },
        { name: "Spätzle" },
        { name: "Coleslaw" },
        { name: "Mixed Green Salad" },
      ],
    },
    {
      name: "Kids in the Haul",
      items: [
        { name: "Kids Pizza", price: "10" },
        { name: "Cheeseburger and Fries", price: "10" },
        { name: "Fingers and Fries", price: "10" },
        { name: "Buttered Noodles", price: "10" },
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
  // Idempotent: only seed an empty database. This runs during the Vercel build,
  // so it must not wipe content added later via the Telegram bot.
  const existing = await prisma.menuItem.count();
  if (existing > 0) {
    console.log(`Seed skipped — ${existing} menu items already present.`);
    return;
  }

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
