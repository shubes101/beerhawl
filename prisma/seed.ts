import { PrismaClient } from "@prisma/client";
import { reseed } from "../src/lib/menuSeed";

const prisma = new PrismaClient();

async function main() {
  // Idempotent: only seed an empty database. This runs during the Vercel build,
  // so it must not wipe content added later via the Telegram bot.
  const existing = await prisma.menuItem.count();
  if (existing > 0) {
    console.log(`Seed skipped — ${existing} menu items already present.`);
    return;
  }

  const result = await reseed(prisma);
  console.log(`Seeded ${result.menuItems} menu items and ${result.events} events.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
