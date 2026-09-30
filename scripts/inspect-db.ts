/**
 * Prints a summary of the catalogue, orders and carts. Handy for verifying a
 * checkout actually committed, or that a seed landed.
 *
 *   npx tsx scripts/inspect-db.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client.ts";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const collections = await db.collection.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { products: true } } },
  });
  console.log("sections:");
  for (const c of collections) {
    console.log(`  ${c.slug.padEnd(12)} ${c._count.products} products`);
  }

  const active = await db.product.count({ where: { status: "ACTIVE" } });
  const archived = await db.product.count({ where: { status: "ARCHIVED" } });
  const variants = await db.variant.count();
  const stock = await db.variant.aggregate({ _sum: { stock: true } });
  console.log(
    `\nproducts: ${active} active, ${archived} archived · ${variants} variants · ${stock._sum.stock} units in stock`,
  );

  const lowStock = await db.variant.count({ where: { stock: { lte: 3 } } });
  console.log(`low stock (3 or fewer): ${lowStock} variants`);

  const orders = await db.order.findMany({ include: { items: true } });
  console.log(`\norders: ${orders.length}`);
  for (const o of orders) {
    console.log(
      `  ${o.number}  ${o.status}/${o.paymentStatus}  Rs.${(o.totalCents / 100).toFixed(0)}  ${o.items.length} items`,
    );
  }

  console.log(`\ncarts: ${await db.cart.count()} (${await db.cartItem.count()} items)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
