import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Store an event on a given calendar day at noon UTC so it renders on the same
// day across US time zones.
function day(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T12:00:00.000Z`);
}

async function main() {
  await prisma.menuItem.deleteMany();
  await prisma.event.deleteMany();

  const dinner = [
    { section: "Starters", name: "Bavarian Pretzel", description: "Warm, salted, with house beer-cheese and stone-ground mustard", price: "11" },
    { section: "Starters", name: "Charred Wings", description: "Smoked then fried, tossed in honey-gochujang", price: "15" },
    { section: "Mains", name: "Bierhaul Burger", description: "Dry-aged blend, smoked gouda, caramelized onion, brioche", price: "19" },
    { section: "Mains", name: "Schnitzel", description: "Pork cutlet, lemon-caper butter, warm potato salad", price: "24" },
    { section: "Mains", name: "Roast Half Chicken", description: "Brick-pressed, charred lemon, herb jus", price: "26" },
    { section: "Sides", name: "Duck Fat Fries", description: "Rosemary, sea salt, garlic aioli", price: "9" },
  ];

  const lunch = [
    { section: "Sandwiches", name: "Reuben", description: "House-cured corned beef, kraut, swiss, rye", price: "16" },
    { section: "Sandwiches", name: "Turkey Club", description: "Smoked turkey, bacon, herb mayo, sourdough", price: "15" },
    { section: "Bowls", name: "Harvest Grain Bowl", description: "Farro, roasted squash, kale, tahini", price: "14" },
  ];

  const cocktail = [
    { section: "Signatures", name: "Smoked Old Fashioned", description: "Bourbon, demerara, applewood smoke", price: "15" },
    { section: "Signatures", name: "Garden Gimlet", description: "Gin, cucumber, lime, basil", price: "13" },
    { section: "On Draft", name: "Rotating IPA", description: "Ask your server for today's pour", price: "8" },
  ];

  const specials = [
    { section: "This Week", name: "Tuesday Mussels", description: "White wine, garlic, grilled bread — all night", price: "16" },
    { section: "This Week", name: "Steak Frites Friday", description: "Hanger steak, duck fat fries, peppercorn", price: "29" },
  ];

  const groups: Array<[string, typeof dinner]> = [
    ["dinner", dinner],
    ["lunch", lunch],
    ["cocktail", cocktail],
    ["specials", specials],
  ];

  for (const [menuType, items] of groups) {
    await prisma.menuItem.createMany({
      data: items.map((it, i) => ({ ...it, menuType, sortOrder: i })),
    });
  }

  await prisma.event.createMany({
    data: [
      {
        title: "Live Jazz Trio",
        description: "An evening of standards and slow pours.",
        date: day("2026-06-05"),
        timeLabel: "7:00 PM",
        location: "Main Hall",
      },
      {
        title: "Oktoberfest Kickoff",
        description: "Stein hoisting, brats, and the fall draft list.",
        date: day("2026-09-19"),
        timeLabel: "4:00 PM",
        location: "Beer Garden",
      },
    ],
  });

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
