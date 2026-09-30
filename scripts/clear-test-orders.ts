/**
 * Removes orders created while testing, leaving the seeded catalogue intact.
 *
 *   npx tsx scripts/clear-test-orders.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client.ts";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const { count } = await db.order.deleteMany({
    where: { email: "test@example.com" },
  });
  console.log(`removed ${count} test order(s)`);
  await db.cartItem.deleteMany({});
  await db.cart.deleteMany({});
  console.log("cleared carts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
