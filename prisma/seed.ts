import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Store an event on a given calendar day at noon UTC so it renders on the same
// day across US time zones.
function day(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T12:00:00.000Z`);
}

type Item = { name: string; price?: string; description?: string; tags?: string[] };
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
        { name: "Vesper Board", price: "38", description: "German fare intended to feed 2–3: three chilled sausages, cheeses, various accoutrements." },
        { name: "Smoke Show Nachos", price: "22", description: "White corn tortilla chips, smoked pulled pork, beer cheese, shredded lettuce, roasted corn, pickled red onion and jalapeño, lime crema, chimichurri." },
        { name: "Sesame & Sea Salt Pretzel", price: "16", description: "Bavarian soft pretzel with sesame seeds, B&B pickles, German mustard, beer cheese.", tags: ["veg"] },
        { name: "French Onion Soup", price: "12", description: "Port wine beef stock, pretzel croutons, gruyère, provolone, fried leeks, scallions.", tags: ["gfo"] },
        { name: "Roasted Red Pepper Hummus", price: "16", description: "White bean, roasted garlic and red pepper blend, crispy chickpeas, olive tapenade, EVOO, charred cauliflower, fresh carrot and cucumber, seasoned house pita.", tags: ["vgn", "gfo"] },
        { name: "Obatzda", price: "16", description: "Warm Bavarian cheese dip — brie, cream cheese, schwarzbier, onion, chive, paprika, caraway. Crispy shallots, served with pretzel nuggets.", tags: ["veg"] },
        { name: "Crab Dip", price: "20", description: "Creamy blend of crab claw meat, cream cheese, mozzarella, gruyère, old bay, lemon, scallions. Served with white corn tortilla chips.", tags: ["gfo"] },
        { name: "Marinated Wings", price: "18", description: "Choice of: Buffalo, Dry Rub, Ginger Soy, Honey Gochujang, Honey Old Bay, Nashville Hot Bacon, Spice Bag Dry Rub, or Guinness BBQ.", tags: ["gfo"] },
        { name: "Peach Caprese", price: "18", description: "Hot honey-roasted peaches, heirloom tomatoes, fresh mozzarella, pesto-marinated ciliegine, marinated cherry tomatoes, balsamic glaze, basil.", tags: ["veg", "gfo"] },
        { name: "Potstickers", price: "13", description: "Chicken, corn, lemongrass and onion potstickers. Ginger soy glaze, sesame seeds, scallions." },
        { name: "Shaved Brussels Sprouts", price: "14", description: "Bacon, apples, balsamic glaze, goat cheese crumbles.", tags: ["gf"] },
        { name: "Fried Green Tomatoes", price: "16", description: "Burrata, honey, balsamic glaze, pork belly, pickled red onions, arugula." },
        { name: "Cheese Curds", price: "12", description: "Served with marinara.", tags: ["veg"] },
        { name: "Fried Pickle Chips", price: "12", description: "Served with ranch.", tags: ["veg"] },
      ],
    },
    {
      name: "The Passion of the Crust",
      items: [
        { name: "Classic Cheese", price: "16", description: "Marinara, mozzarella… duh.", tags: ["veg"] },
        { name: "Truffle Mushroom", price: "22", description: "Mushroom blend, pork belly, crispy shallots, truffle zest, mozzarella." },
        { name: "Peach Hot Honey", price: "20", description: "Roasted peaches, bacon, burrata, arugula, Mike's Hot Honey, balsamic glaze." },
        { name: "Pepperoni", price: "18", description: "Cupped pepperoni, mozzarella, Mike's Hot Honey." },
        { name: "Burrata Margherita", price: "18", description: "Heirloom tomatoes, mozzarella, fresh basil.", tags: ["veg"] },
        { name: "Veggie", price: "18", description: "Heirloom tomatoes, mozzarella, pickled red onions, mushrooms, asparagus, arugula, balsamic glaze.", tags: ["veg"] },
        { name: "Pesto Chicken", price: "20", description: "Braised chicken, house pesto, mozzarella, marinated tomatoes, red onion." },
      ],
    },
    {
      name: "Sandwiches",
      items: [
        { name: "Farm-Raised Grilled Chicken", price: "18", description: "Marinated chicken breast, thick cut bacon, honey mustard, tomato, romaine, red onion, brioche bun. Served with fries.", tags: ["gfo"] },
        { name: "Irish Spice Bag Chicken", price: "20", description: "Fried chicken thigh, spice bag seasoning, charred bell pepper and onion, arugula, Irish curry aioli, brioche bun. Served with fries." },
        { name: "Salmon BLT", price: "22", description: "Salmon, thick cut bacon, romaine, tomato, lemon dill aioli, sourdough. Served with fries.", tags: ["gfo"] },
        { name: "Bison Burger", price: "22", description: "Ground bison, bacon, brie, arugula, balsamic glaze, truffle mayo, crispy shallots, brioche bun. Cooked pink or no pink. Served with fries." },
        { name: "The Schnitzel", price: "18", description: "Breaded pork loin, arugula, lemon dill aioli, pickled red onion, lemon zest, pretzel bun. Served with fries." },
        { name: "Inglorious Bratwurst", price: "18", description: "Grilled burnt-end bratwurst, bier-braised kraut, German mustard, beer cheese, pretzel roll. Served with fries." },
        { name: "Smash Burger", price: "16", description: "4oz medium-well patty, white cheddar, special sauce, B&B pickles, grilled onion, tomato, romaine, brioche. Served with fries. Can be made vegetarian with portobello mushroom.", tags: ["gfo"] },
        { name: "Gruzka's Smoked Pulled Pork", price: "20", description: "Smoked pulled pork, coleslaw, arugula, pretzel bun. Served with a side of Guinness BBQ and fries.", tags: ["gfo"] },
        { name: "Reuben Cheesesteak", price: "18", description: "Smoked pulled pastrami, bier-braised kraut, gruyère, house Russian dressing, pretzel roll. Served with fries.", tags: ["gfo"] },
      ],
    },
    {
      name: "Salads",
      items: [
        { name: "Balsamic Salad", price: "16", description: "Arcadian lettuce, charred cauliflower, crispy shaved sprouts, marinated cherry tomatoes, goat cheese crumbles, pickled red onions, pretzel croutons, blistered tomato vinaigrette, balsamic glaze. Add chicken +8, salmon +11, shrimp +10, steak +11, or tofu +7.", tags: ["veg"] },
        { name: "Goat Cheese Salad", price: "16", description: "Arugula, crispy goat cheese, pickled blueberries, red onion, spiced walnuts, blueberry thyme yuzu dressing.", tags: ["veg"] },
        { name: "Falafel Salad", price: "17", description: "Arcadian lettuce, fried falafel balls, cucumber, marinated cherry tomatoes, pickled red onion, crispy chickpeas, green goddess dressing, vegan dill aioli.", tags: ["vgn", "gf"] },
        { name: "Wedge", price: "16", description: "Iceberg wedge, candied bacon, avocado, hard boiled egg, marinated tomato, red onion, bleu cheese crumbles and bleu cheese dressing.", tags: ["gf"] },
        { name: "Caesar Salad", price: "15", description: "Romaine, shaved parmesan, pretzel croutons, caesar dressing.", tags: ["veg", "gfo"] },
      ],
    },
    {
      name: "Large Plates",
      items: [
        { name: "Baked Mac & Cheese", price: "16", description: "Pretzel breadcrumbs and scallions. Add chicken +8, lobster +14, pork belly +9, shrimp +10, steak +11, or tofu +7.", tags: ["veg"] },
        { name: "Fish and Chips", price: "26", description: "Beer-battered flounder served with coleslaw, fries, malt vinegar aioli, cocktail sauce, tartar, lemon." },
        { name: "Steamed Mussels", price: "20", description: "Served with choice of fries or bread. Broth options: Irish curry crème; Belgian bier (bacon & bell pepper); Fra Diavolo (spicy tomato); or lemon pepper crème." },
        { name: "Pork Schnitzel", price: "28", description: "Breaded pork loin served with German potato salad, side arugula salad, pickled red onions, side demi-glace." },
      ],
    },
    {
      name: "Sides",
      items: [
        { name: "Fries", price: "7" },
        { name: "Truffle Fries", price: "8" },
        { name: "Irish Curry Fries", price: "8" },
        { name: "German Potato Salad", price: "6", tags: ["gf"] },
        { name: "Spätzle", price: "8" },
        { name: "Coleslaw", price: "6", tags: ["gf"] },
        { name: "Mixed Green Salad", price: "6", tags: ["gf"] },
        { name: "Caesar Salad", price: "6", tags: ["gfo"] },
      ],
    },
    {
      name: "Kids in the Haul",
      items: [
        { name: "Kids Pizza", price: "10", description: "For children 12 and under. Served with a soft drink or apple juice." },
        { name: "Cheeseburger and Fries", price: "10", description: "For children 12 and under. Served with a soft drink or apple juice." },
        { name: "Fingers and Fries", price: "10", description: "For children 12 and under. Served with a soft drink or apple juice." },
        { name: "Buttered Noodles", price: "10", description: "For children 12 and under. Served with a soft drink or apple juice." },
      ],
    },
  ],
  cocktail: [
    {
      name: "Potent Potables",
      items: [
        { name: "BH Old Fashioned", price: "13", description: "Old Overholt Rye, turbinado, Regan's Orange & Angostura bitters." },
        { name: "Ol' King Julius", price: "15", description: "Larceny Bourbon, vanilla turbinado, orange cream bitters, lactose." },
        { name: "Ghost Ship", price: "13", description: "Pilar Rum, aged pineapple rum syrup, sparkling coconut water, lime." },
        { name: "Roman Holiday", price: "14", description: "Tito's Vodka, Aperol, strawberry basil shrub, lemon, Prosecco." },
        { name: "Casper Tea", price: "14", description: "House-clarified Long Island iced tea." },
        { name: "Pit of Carcoon", price: "14", description: "Drumshanbo Gin, Domaine de Canton ginger liqueur, cream of coconut, grapefruit, lime." },
        { name: "Adjusted for Inflation", price: "14", description: "Milagro Tequila, apricot brandy, zesty orange juice, orgeat, lime." },
        { name: "It's a Mad Mad Mad Mad Mango", price: "14", description: "Ghost Tequila, house mango mix, jalapeños." },
        { name: "Pina Sangria", price: "12", description: "White wine, coconut rum, pineapple, toasted coconut syrup, cream of coconut, lime." },
        { name: "Chat G&T", price: "13", description: "Choose one of our three signature gins (Tanqueray, Roku, Hendrick's) paired with a premium Fever-Tree tonic (Indian, Elderflower, or Sparkling Lime Yuzu)." },
      ],
    },
    {
      name: "Low Profile",
      items: [
        { name: "Whole Lotta Red", price: "10", description: "Aperol, spiced hibiscus syrup, lemon, club soda." },
        { name: "Par For The Green", price: "11", description: "Parsley vodka, St. Germain, ginger ale, lemon terpene." },
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
        tags: it.tags ?? [],
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
