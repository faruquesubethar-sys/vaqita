/**
 * Seeds one bought-in lot of graphic tees.
 *
 * These are purchased resale stock, not second-hand pieces — so there is no
 * grading, no "one owner before you", and no invented provenance in the copy.
 * They describe the garment: the print, the colourway, the cut.
 *
 * Imagery is a plain flat-lay in each true colourway. The graphics are
 * third-party artwork, so they are not reproduced here — upload the real
 * photograph of each piece through the admin's Photo → 3D panel, which also
 * drives the 3D preview.
 *
 *   npx tsx prisma/seed-thrift-lot.ts
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
  /** One line describing what is actually printed on it. */
  print: string;
  colour: string;
  hex: string;
  /** Rupees. */
  price: number;
  sizes: string[];
  stock: number;
  image: string;
};

const SIZES_SML = ["S", "M", "L"];
const SIZES_MLX = ["M", "L", "XL"];
const SIZES_FULL = ["S", "M", "L", "XL"];

const LOT: Piece[] = [
  // ---- lot one --------------------------------------------------------
  { slug: "pablo-photo-tee", name: "Pablo Photo Tee", subtitle: "Photo print · Front and back", print: "a four-panel photo print across the back", colour: "Washed Pink", hex: "#d4708f", price: 1290, sizes: SIZES_MLX, stock: 3, image: "lot-pablo" },
  { slug: "graffiti-cherub-tee", name: "Graffiti Cherub Tee", subtitle: "Spray script · Oversized", print: "a sprayed script over a cherub illustration", colour: "Dusk Purple", hex: "#6f6a80", price: 1390, sizes: SIZES_MLX, stock: 4, image: "lot-cherub" },
  { slug: "panther-camo-tee", name: "Panther Camo Tee", subtitle: "All-over camo", print: "a heavy type treatment over an all-over camo ground", colour: "Ash Camo", hex: "#c8c6c0", price: 1190, sizes: SIZES_MLX, stock: 3, image: "lot-panther" },
  { slug: "calm-down-cowboy-tee", name: "Calm Down Cowboy Tee", subtitle: "Western script · Star", print: "a western script over a distressed star", colour: "Bone Cream", hex: "#ded5c2", price: 1490, sizes: SIZES_FULL, stock: 4, image: "lot-cowboy" },
  { slug: "white-dragon-tee", name: "White Dragon Tee", subtitle: "Large back print", print: "a full-width dragon across the back", colour: "Faded Black", hex: "#1f1f22", price: 1350, sizes: SIZES_FULL, stock: 5, image: "lot-dragon" },
  { slug: "hanging-on-tee", name: "Hanging On Tee", subtitle: "Block type · Photo inset", print: "stacked block type with a small photo inset", colour: "Charcoal", hex: "#3a3a3c", price: 1150, sizes: SIZES_MLX, stock: 3, image: "lot-hangingon" },
  { slug: "skull-cartoon-tee", name: "Skull Cartoon Tee", subtitle: "Airbrush print", print: "an airbrushed cartoon skull panel", colour: "Jet Black", hex: "#232326", price: 1290, sizes: SIZES_MLX, stock: 4, image: "lot-skulls" },
  { slug: "spine-floral-tee", name: "Spine Floral Tee", subtitle: "All-over floral · Centre print", print: "a centre spine graphic over an all-over floral", colour: "Night Navy", hex: "#2a2f3f", price: 1590, sizes: SIZES_MLX, stock: 3, image: "lot-spine" },
  { slug: "grillz-records-tee", name: "Grillz Records Tee", subtitle: "Heavy front print", print: "a dense front print with hand-drawn lettering", colour: "Optic White", hex: "#e8e6e0", price: 1450, sizes: SIZES_FULL, stock: 5, image: "lot-grillz" },
  { slug: "angry-bear-tee", name: "Angry Bear Tee", subtitle: "Oversized halftone", print: "an oversized halftone bear in red", colour: "Optic White", hex: "#e9e7e2", price: 1390, sizes: SIZES_FULL, stock: 6, image: "lot-bear" },

  // ---- lot two --------------------------------------------------------
  { slug: "cold-hearted-cherub-tee", name: "Cold Hearted Cherub Tee", subtitle: "Line-art print", print: "a fine line-art cherub with script beneath", colour: "Off White", hex: "#e5e2da", price: 1290, sizes: SIZES_MLX, stock: 4, image: "lot-coldhearted" },
  { slug: "money-print-tee", name: "Money Print Tee", subtitle: "Front and back", print: "a front and back print in white on dark ground", colour: "Seal Brown", hex: "#2e2724", price: 1190, sizes: SIZES_MLX, stock: 3, image: "lot-money" },
  { slug: "race-print-tee", name: "Race Print Tee", subtitle: "Motorsport panels", print: "layered motorsport photo panels", colour: "Off White", hex: "#ddd9d1", price: 1190, sizes: SIZES_MLX, stock: 4, image: "lot-race" },
  { slug: "saint-print-tee", name: "Saint Print Tee", subtitle: "Engraving style", print: "an engraving-style illustration across the chest", colour: "Stone Grey", hex: "#7d7b78", price: 1250, sizes: SIZES_SML, stock: 3, image: "lot-saint" },
  { slug: "corvette-racing-tee", name: "Corvette Racing Tee", subtitle: "Motorsport print", print: "a motorsport print with striping", colour: "Optic White", hex: "#dcd8d0", price: 1350, sizes: SIZES_MLX, stock: 4, image: "lot-corvette" },
  { slug: "mustang-tee", name: "Mustang Tee", subtitle: "Faded front print", print: "a softly faded front print", colour: "Dusty Rose", hex: "#d9a9a3", price: 1250, sizes: SIZES_SML, stock: 3, image: "lot-mustang" },
  { slug: "bolt-band-tee", name: "Bolt Band Tee", subtitle: "Band print", print: "a bolt motif band print", colour: "Heather Grey", hex: "#b3b1ac", price: 1590, sizes: SIZES_MLX, stock: 4, image: "lot-bolt" },
  { slug: "number-88-tee", name: "Number 88 Tee", subtitle: "Oversized numeral", print: "an oversized numeral across the front", colour: "Jet Black", hex: "#1e1e20", price: 1290, sizes: SIZES_FULL, stock: 6, image: "lot-88" },
  { slug: "high-roller-tee", name: "High Roller Tee", subtitle: "Card print", print: "a playing-card print with script", colour: "Field Olive", hex: "#4e4c33", price: 1350, sizes: SIZES_MLX, stock: 4, image: "lot-highroller" },
  { slug: "skaters-camo-tee", name: "Skaters Camo Tee", subtitle: "Realtree-style camo", print: "a script print over a woodland camo ground", colour: "Bark Camo", hex: "#5c4a38", price: 1450, sizes: SIZES_MLX, stock: 3, image: "lot-skaters" },
  { slug: "los-angeles-portrait-tee", name: "Los Angeles Portrait Tee", subtitle: "Tie-dye ground", print: "a portrait print over a blue tie-dye ground", colour: "Indigo Wash", hex: "#2f3d5c", price: 1490, sizes: SIZES_MLX, stock: 3, image: "lot-losangeles" },
  { slug: "the-eyes-tee", name: "The Eyes Tee", subtitle: "Front print", print: "a small chest print with a photographic panel", colour: "Deep Red", hex: "#a5252a", price: 1250, sizes: SIZES_MLX, stock: 4, image: "lot-eyes" },
  { slug: "motorcycle-tee", name: "Motorcycle Tee", subtitle: "Heritage print", print: "a heritage motorcycle illustration", colour: "Oxblood", hex: "#6e2b32", price: 1690, sizes: SIZES_MLX, stock: 3, image: "lot-motorcycle" },
  { slug: "arachnid-camo-tee", name: "Arachnid Camo Tee", subtitle: "Woodland camo", print: "a large graphic over a woodland camo ground", colour: "Bark Camo", hex: "#4a3b2e", price: 1450, sizes: SIZES_MLX, stock: 3, image: "lot-arachnid" },
  { slug: "seven-jersey-tee", name: "Seven Jersey Tee", subtitle: "Athletic jersey", print: "a numbered athletic jersey print", colour: "Optic White", hex: "#e6e3db", price: 1390, sizes: SIZES_MLX, stock: 4, image: "lot-seven" },
  { slug: "rb20-racing-tee", name: "RB20 Racing Tee", subtitle: "Team print", print: "a team motorsport print", colour: "Team Navy", hex: "#1e2a4a", price: 1590, sizes: SIZES_FULL, stock: 5, image: "lot-rb20" },
  { slug: "shakur-portrait-tee", name: "Shakur Portrait Tee", subtitle: "Portrait print", print: "a portrait print with text beneath", colour: "Field Olive", hex: "#4a4c35", price: 1690, sizes: SIZES_MLX, stock: 4, image: "lot-shakur" },
  { slug: "swoosh-character-tee", name: "Swoosh Character Tee", subtitle: "Cartoon print", print: "a cartoon character print", colour: "Sky Blue", hex: "#7d9ad1", price: 1490, sizes: SIZES_MLX, stock: 5, image: "lot-swoosh" },
  { slug: "basketball-tee", name: "Basketball Tee", subtitle: "Court print", print: "a court graphic print", colour: "Slate Navy", hex: "#24303c", price: 1190, sizes: SIZES_MLX, stock: 4, image: "lot-basketball" },
  { slug: "la-black-tee", name: "LA Black Tee", subtitle: "Small chest print", print: "a small chest print", colour: "Jet Black", hex: "#24242a", price: 990, sizes: SIZES_FULL, stock: 5, image: "lot-lablack" },
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
    const data = {
      name: p.name,
      subtitle: p.subtitle,
      description: `Cotton graphic tee in ${p.colour.toLowerCase()}, carrying ${p.print}. Regular cut, ribbed collar.`,
      story:
        "Bought in as a small run rather than made to order, so the sizes listed are the sizes we have. Cotton jersey with a ribbed collar and a standard body — nothing unusual in the construction, which is the point: the graphic is what you are buying. Washed cold and inside out, a screen print on jersey will outlast the shirt it is on.",
      composition: "100% cotton",
      care: "Cold wash inside out. Hang dry. Do not iron directly on the print.",
      madeIn: "Bought-in stock",
      fit: "Regular",
      garmentType: "TEE",
      graphicStyle: "NONE",
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
      data: {
        productId: product.id,
        url: `/products/${p.image}.svg`,
        alt: `${p.name}, ${p.colour}`,
        position: 0,
      },
    });

    let vp = 0;
    for (const size of p.sizes) {
      await db.variant.upsert({
        where: {
          productId_size_color: { productId: product.id, size, color: p.colour },
        },
        update: { colorHex: p.hex, stock: p.stock, position: vp },
        create: {
          productId: product.id,
          sku: `VQ-LOT-${p.slug.slice(0, 8).toUpperCase()}-${size}`,
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

  console.log(`Added ${LOT.length} tees, ${variants} variants.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
