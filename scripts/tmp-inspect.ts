import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.ts";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
db.product
  .findMany({ include: { images: true, variants: true, collection: true } })
  .then((ps) => {
    for (const p of ps) {
      console.log("slug:", p.slug, "| status:", p.status, "| garmentType:", p.garmentType);
      console.log("  collection:", p.collection?.slug ?? "NONE", "| price:", p.priceCents);
      console.log("  textureUrl:", p.textureUrl);
      console.log("  images:", p.images.map((i) => i.url).join(", ") || "none");
      console.log("  variants:", p.variants.length);
    }
  })
  .finally(() => db.$disconnect());
