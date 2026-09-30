import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.ts";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const products = await db.product.findMany({
    include: {
      collection: true,
      variants: true,
      images: true,
    }
  });
  console.log(JSON.stringify(products, null, 2));
}

main().finally(() => db.$disconnect());
