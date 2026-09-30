/**
 * Removes every product, leaving the sections and accounts in place.
 *
 * Everything seeded so far was placeholder stock with invented copy. Real
 * pieces are added from the admin panel, each with its own photograph.
 *
 * Orders are untouched: OrderItem keeps a snapshot of what was bought, so
 * order history survives its products being deleted.
 *
 *   npx tsx scripts/clear-catalogue.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client.ts";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const before = await db.product.count();

  // Cart lines reference variants directly; clear them first so nothing is
  // left pointing at a deleted size.
  await db.cartItem.deleteMany({});
  const { count } = await db.product.deleteMany({}); // images + variants cascade

  console.log(`removed ${count} of ${before} products (variants and images cascaded)`);
  console.log(`orders kept: ${await db.order.count()}`);
  console.log(`sections kept: ${await db.collection.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
