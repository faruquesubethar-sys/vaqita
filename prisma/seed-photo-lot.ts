/**
 * Seeds the photographed lot — the tees we have real pictures of.
 *
 * Three of these came in as standalone full-resolution shots and are sharp.
 * The other thirteen are crops out of one group photo, so they are soft: the
 * source frame holds sixteen shirts in 720x960, which leaves roughly 150px per
 * garment. Replace them by re-shooting individually; the product rows and the
 * Photo → 3D panel already accept a better file with no code change.
 *
 *   npx tsx prisma/seed-photo-lot.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client.ts";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const INR = (rupees: number) => rupees * 100;

type Piece = {
  slug: string;
  name: string;
  subtitle: string;
  print: string;
  colour: string;
  hex: string;
  price: number;
  sizes: string[];
  stock: number;
  /** File in public/products/photos, without extension. */
  photo: string;
  /** True when the photo is a full-resolution standalone shot, not a crop. */
  sharp?: boolean;
};

const S_M_L = ["S", "M", "L"];
const M_L_XL = ["M", "L", "XL"];
const FULL = ["S", "M", "L", "XL"];

const LOT: Piece[] = [
  { slug: "spider-raglan-tee", name: "Spider Raglan Tee", subtitle: "Raglan sleeve · Splatter ground", print: "a spider motif on a splattered cream ground with contrast sleeves", colour: "Cream / Red", hex: "#ddd6cb", price: 1490, sizes: M_L_XL, stock: 3, photo: "spider-raglan" },
  { slug: "cat-pack-racing-tee", name: "Cat Pack Racing Tee", subtitle: "Racing print · Chequer trim", print: "a racing team print with chequered detailing", colour: "Jet Black", hex: "#1c1c20", price: 1390, sizes: M_L_XL, stock: 4, photo: "cat-pack" },
  { slug: "flame-racing-tee", name: "Flame Racing Tee", subtitle: "All-over flames · Numeral", print: "yellow flames rising from the hem with a large numeral at the chest", colour: "Jet Black", hex: "#16161a", price: 1690, sizes: FULL, stock: 5, photo: "yamaha-flames", sharp: true },
  { slug: "moto-sketch-tee", name: "Moto Sketch Tee", subtitle: "Technical sketch", print: "a technical motorcycle sketch with annotation", colour: "Optic White", hex: "#dedad2", price: 1290, sizes: M_L_XL, stock: 4, photo: "moto-sketch" },
  { slug: "lmtd-edtn-tee", name: "Lmtd Edtn Tee", subtitle: "All-over script", print: "an all-over script pattern with a large chest wordmark", colour: "Bone", hex: "#d8d2c4", price: 1450, sizes: M_L_XL, stock: 3, photo: "lmtd-edtn" },
  { slug: "panel-sport-tee", name: "Panel Sport Tee", subtitle: "Colour-blocked panels", print: "a striped upper panel over a plain body", colour: "Cocoa / White", hex: "#b9a89a", price: 1390, sizes: M_L_XL, stock: 3, photo: "panel-sport" },
  { slug: "lowrider-sunset-tee", name: "Lowrider Sunset Tee", subtitle: "Sunset photo print", print: "a lowrider and palms against a sunset", colour: "Ash Grey", hex: "#b0b2ae", price: 1490, sizes: M_L_XL, stock: 4, photo: "lowrider" },
  { slug: "dangerous-script-tee", name: "Dangerous Script Tee", subtitle: "Gothic script", print: "a single line of gothic script across the chest", colour: "Optic White", hex: "#e4e2dc", price: 1250, sizes: FULL, stock: 5, photo: "dangerous" },
  { slug: "panda-navy-tee", name: "Panda Navy Tee", subtitle: "Character print", print: "an illustrated character print at the chest", colour: "Night Navy", hex: "#22304a", price: 1390, sizes: M_L_XL, stock: 4, photo: "panda-navy" },
  { slug: "west-tee", name: "West Tee", subtitle: "Stacked type", print: "stacked type in green over a centre graphic", colour: "Field Olive", hex: "#56603f", price: 1350, sizes: M_L_XL, stock: 4, photo: "west-kanye" },
  { slug: "stay-humble-tee", name: "Stay Humble Tee", subtitle: "Circular type", print: "circular type around a centre compass motif", colour: "Oxblood", hex: "#4a2a28", price: 1390, sizes: M_L_XL, stock: 3, photo: "stay-humble" },
  { slug: "youth-panda-tee", name: "Youth Panda Tee", subtitle: "Character print", print: "an illustrated character print with block type above", colour: "Optic White", hex: "#e6e4de", price: 1390, sizes: FULL, stock: 5, photo: "youth-panda" },
  { slug: "limited-edition-face-tee", name: "Limited Edition Face Tee", subtitle: "Line-art panel", print: "a single-line face drawing inside a tonal panel", colour: "Cream", hex: "#e8e2d2", price: 1590, sizes: M_L_XL, stock: 4, photo: "limited-edition", sharp: true },
  { slug: "certified-legend-tee", name: "Certified Legend Tee", subtitle: "Serif chest type", print: "small serif type at the chest", colour: "Jet Black", hex: "#18181c", price: 1290, sizes: FULL, stock: 5, photo: "certified-legend" },
  { slug: "plain-sage-tee", name: "Plain Sage Tee", subtitle: "No print · Chest pocket", print: "no print — a plain body with a chest pocket", colour: "Sage", hex: "#8d968a", price: 1150, sizes: FULL, stock: 6, photo: "plain-sage" },
  { slug: "tennis-club-tee", name: "Tennis Club Tee", subtitle: "Circular crest print", print: "a large circular crest print at the chest", colour: "Sand", hex: "#e4dcc4", price: 1890, sizes: M_L_XL, stock: 4, photo: "tennis-club", sharp: true },
];

async function main() {
  const collection = await db.collection.findUnique({ where: { slug: "thrift-tees" } });
  if (!collection) {
    throw new Error("Thrift Tees section not found — run `npm run db:seed` first.");
  }

  const maxPosition = await db.product.aggregate({ _max: { position: true } });
  let position = (maxPosition._max.position ?? 0) + 1;
  let variants = 0;

  for (const p of LOT) {
    const url = `/products/photos/${p.photo}.webp`;

    const data = {
      name: p.name,
      subtitle: p.subtitle,
      description: `Cotton graphic tee in ${p.colour.toLowerCase()}, carrying ${p.print}. Regular cut, ribbed collar.`,
      story:
        "Bought in as a small run rather than made to order, so the sizes listed are the sizes we have. Cotton jersey, ribbed collar, standard body — nothing unusual in the construction, which is the point: the graphic is what you are buying.",
      composition: "100% cotton",
      care: "Cold wash inside out. Hang dry. Do not iron directly on the print.",
      madeIn: "Bought-in stock",
      fit: "Regular",
      garmentType: "TEE",
      graphicStyle: "NONE",
      // Every photographed piece projects its own photograph.
      //
      // The 3D uses a separately trimmed, alpha-cut file rather than the card
      // image: the card is a 4:5 crop with margin around the garment, and the
      // shader stretches whatever it is given across the garment silhouette,
      // so a margined image lands the print too small and drags background
      // onto the shoulders.
      //
      // Thirteen of these come from one group photo and are soft. They are
      // used anyway — a soft photograph of the real print reads as the real
      // garment, where a crisp flat colour reads as a mock-up.
      textureUrl: `/products/photos/${p.photo}-tex.webp`,
      priceCents: INR(p.price),
      compareAtCents: null,
      featured: false,
      position: position++,
      collectionId: collection.id,
      status: "ACTIVE",
    };

    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });

    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.create({
      data: { productId: product.id, url, alt: `${p.name}, ${p.colour}`, position: 0 },
    });

    let vp = 0;
    for (const size of p.sizes) {
      await db.variant.upsert({
        where: { productId_size_color: { productId: product.id, size, color: p.colour } },
        update: { colorHex: p.hex, stock: p.stock, position: vp },
        create: {
          productId: product.id,
          sku: `VQ-PH-${p.slug.slice(0, 8).toUpperCase()}-${size}`,
          size,
          color: p.colour,
          colorHex: p.hex,
          stock: p.stock,
          position: vp,
        },
      });
      vp += 1;
      variants += 1;
    }
  }

  const sharp = LOT.filter((p) => p.sharp).length;
  console.log(
    `Added ${LOT.length} photographed tees, ${variants} variants ` +
      `(${sharp} sharp enough to drive the 3D preview).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
