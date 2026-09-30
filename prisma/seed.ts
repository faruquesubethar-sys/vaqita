/**
 * Seeds VAQITA Mens Fashion Hub.
 *
 * Sections only — no products. The catalogue is populated from the admin
 * panel, because every piece is real stock with its own photograph, and
 * invented demo products on a live shop are worse than an empty rail.
 *
 * Idempotent: sections are upserted by slug, and sections no longer listed
 * here are removed. Products are never touched by this script.
 *
 *   npm run db:seed
 */

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client.ts";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const COLLECTIONS = [
  {
    slug: "surplus",
    name: "Surplus",
    tagline: "Issued, never used.",
    description:
      "Deadstock and service-issue pieces that never made it to a shop floor. Heavier cloth, squarer cuts, and hardware specified by someone who was not thinking about fashion.",
    heroImage: "/products/collection-surplus.svg",
    position: 1,
  },
  {
    slug: "vintage",
    name: "Vintage",
    tagline: "Older than it looks.",
    description:
      "Pieces with a decade or more behind them. The fades are real and uneven, the cotton has relaxed, and nothing here can be reordered once its size is gone.",
    heroImage: "/products/collection-thrift-tees.svg",
    position: 2,
  },
  {
    slug: "tees",
    name: "Tees",
    tagline: "The graphic is the point.",
    description:
      "Cotton graphic tees, bought in as short runs. Ribbed collars, standard bodies, and prints worth the wall space — the sizes listed are the sizes we have.",
    heroImage: "/products/collection-polos.svg",
    position: 3,
  },
  {
    slug: "polo-tees",
    name: "Polo Tees",
    tagline: "Collar, no ceremony.",
    description:
      "Knitted collars and clean plackets, cut to sit flat under a jacket. The one thing in the shop you can wear to an office and a bar without changing.",
    heroImage: "/products/collection-track.svg",
    position: 4,
  },
  {
    slug: "trouser",
    name: "Trouser",
    tagline: "From the waist down.",
    description:
      "Pleated, flat-fronted and drawstring, in wool, twill and corduroy. Shipped unhemmed where the cloth allows it, so your tailor sets the break.",
    heroImage: "/products/collection-trousers.svg",
    position: 5,
  },
];

/**
 * Decides the admin login before a single row is written.
 *
 * Checked up front rather than beside the user upsert at the end: seeding a
 * remote database and only failing after the collections had been created
 * would leave a half-seeded shop behind every time.
 */
function adminCredentials() {
  // Whether this is a real shop is decided by the database being seeded, not
  // by NODE_ENV. You seed the live database from your own laptop, where
  // NODE_ENV is not "production" — so keying the check on that would have let
  // the published password walk straight onto the live site.
  const dbUrl = process.env.DATABASE_URL ?? "";
  const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]|^file:/.test(dbUrl);
  const email = process.env.ADMIN_EMAIL ?? "admin@vaqita.com";
  const password = process.env.ADMIN_PASSWORD;

  if (!isLocalDb && !password) {
    throw new Error(
      "This DATABASE_URL is not a local database. Set ADMIN_EMAIL and " +
        "ADMIN_PASSWORD in .env before seeding it, or the shop goes live with " +
        "the password that is published in this repository.",
    );
  }
  if (password && password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  return { email, password, isLocalDb };
}

async function main() {
  const admin = adminCredentials();

  console.log("Seeding VAQITA Mens Fashion Hub…");

  // Sections not in the list above are retired. Products that referenced them
  // fall to collectionId = null rather than being deleted (onDelete: SetNull).
  const keep = COLLECTIONS.map((c) => c.slug);
  const removed = await db.collection.deleteMany({
    where: { slug: { notIn: keep } },
  });
  if (removed.count > 0) console.log(`  removed ${removed.count} retired section(s)`);

  for (const c of COLLECTIONS) {
    await db.collection.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        heroImage: c.heroImage,
        position: c.position,
      },
      create: c,
    });
  }
  console.log(`  sections: ${COLLECTIONS.map((c) => c.name).join(", ")}`);

  const productCount = await db.product.count();
  console.log(`  products: ${productCount} (added from the admin panel)`);

  // ---------------------------------------------------------------- accounts
  //
  // The admin login comes from the environment. It used to be a hardcoded
  // "vaqita-admin", which is exactly the kind of thing that survives all the
  // way to a live site and hands the shop to whoever reads the repository.
  //
  // Seeding a live shop therefore requires you to choose the password: set
  // ADMIN_EMAIL and ADMIN_PASSWORD in .env, then run `npm run db:seed`.
  //
  // Whether this is a real shop is decided by the database being seeded, not by
  // NODE_ENV. You seed the live database from your own laptop, where NODE_ENV
  // is not "production" — so keying the check on that would have let the
  // published password walk straight onto the live site.
  const adminPassword = await bcrypt.hash(admin.password ?? "vaqita-admin", 12);
  await db.user.upsert({
    where: { email: admin.email },
    update: { role: "ADMIN", passwordHash: adminPassword },
    create: {
      email: admin.email,
      name: "VAQITA Hub",
      role: "ADMIN",
      passwordHash: adminPassword,
    },
  });
  console.log(
    `  admin: ${admin.email}${admin.password ? "" : " (password: vaqita-admin)"}`,
  );

  // The demo shopper exists so the checkout can be exercised locally. A live
  // shop has no use for a published account with a published password.
  if (admin.isLocalDb) {
    const customerPassword = await bcrypt.hash("vaqita-demo", 12);
    await db.user.upsert({
      where: { email: "demo@vaqita.com" },
      update: { passwordHash: customerPassword },
      create: {
        email: "demo@vaqita.com",
        name: "Demo Customer",
        role: "CUSTOMER",
        passwordHash: customerPassword,
      },
    });
    console.log("  demo shopper: demo@vaqita.com / vaqita-demo");
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
