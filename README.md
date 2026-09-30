# VAQITA Mens Fashion Hub

A menswear storefront for thrifted tees, deadstock surplus and small-lot
overdye. Full commerce backend, an extruded 3D house mark in the hero, and an
interactive 3D fitting room on every product.

---

## Running it

```bash
npm install
npm run setup   # generate client, create the database, seed the catalogue
npm run dev
```

Open <http://localhost:3000>.

`npm run setup` is idempotent — re-run it any time to restore the catalogue.

### Demo accounts

| Role     | Email               | Password       |
| -------- | ------------------- | -------------- |
| Admin    | `admin@vaqita.com`  | `vaqita-admin` |
| Customer | `demo@vaqita.com`   | `vaqita-demo`  |

Change or remove these in `prisma/seed.ts` before deploying anywhere real.

---

## Stack

| Layer     | Choice                                                         |
| --------- | -------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack)              |
| UI        | React 19, Tailwind v4                                           |
| 3D        | React Three Fiber 9 + three.js, custom GLSL, postprocessing, drei |
| Motion    | GSAP, Lenis, IntersectionObserver                               |
| Data      | Prisma 7 → Postgres via the `pg` driver adapter                 |
| Auth      | JWT session cookie (`jose`) + bcrypt                            |
| Payments  | None by default — orders are PENDING / UNPAID, settled on WhatsApp |

React is pinned to **19.2.8**: React Three Fiber 9 declares a peer range of
`>=19 <19.3`, so taking React 19.3 breaks the 3D stack.

---

## What is built

**Storefront** — homepage with the 3D hero, four sections (Thrift Tee, Surplus,
Overdye, Blanks), product detail with colour/size selection and zoom gallery,
cart page and slide-over drawer, checkout, order confirmation.

**3D fitting room** — every product has a "Try it on" control, on the product
page and on hover over any card. It opens a full-screen viewer with the garment
built to that product's cut and colourway, orbitable and zoomable, with colour
and size switching and add-to-bag in place.

**Admin** — `/admin/products` is a full editor: filter, expand any piece, and
change its name, price, compare-at price, status, featured flag, which 3D
garment it uses and which print it carries. Stock is editable per size, or set
across all sizes at once. There is a create-a-piece form and a bulk reprice
tool that moves a whole section by a percentage.

**Accounts** — register, sign in, sign out, order history.

**Commerce** — server-side cart with stock clamping, anonymous carts that merge
into an account on sign-in, transactional order creation with stock decrement,
Stripe Checkout, and a webhook that confirms payment and releases stock on
expiry.

Admin routes require the `ADMIN` role. Orders can be moved through their
statuses, and cancelling or refunding returns the pieces to sellable stock —
exactly once, no matter how many times the action is repeated.

---

## How money is handled

Every amount is an **integer in minor units** (paise). Floating point never
touches a price, because `0.1 + 0.2 !== 0.3` and that error compounds across a
cart. Formatting happens once, at the edge, in `src/lib/money.ts`.

Shipping and tax are computed by `totalsFor()` — the same function used by the
cart view, the checkout summary and order creation, so the number shown and the
number charged cannot drift apart.

**Prices are never read from the request.** `placeOrder` re-reads every variant
from the database and recomputes the total before writing the order, so a
tampered form can change a delivery address but never an amount.

---

## The 3D work

There are two independent 3D systems, and neither downloads a model file. An
external `.glb` is a licensing question, a network dependency, and cannot
recolour or reshape itself per product — so both are generated in code.

### The house mark (hero)

`src/components/hero/swan-geometry.ts` extrudes the logo's own polygon
coordinates, so the hero and the favicon are literally the same shape. It is
lit as metal, with `RoomEnvironment` generated at runtime for it to reflect —
**a metallic material with no environment map renders essentially black**,
because metals reflect rather than scatter.

Two things that will bite you if you edit it:

- **The beak is deliberately blunted.** `ExtrudeGeometry` offsets each vertex
  along its angle bisector when bevelling, and at a spike that acute the offset
  diverges to NaN — which makes the whole mesh silently invisible. There is a
  runtime check that logs if this ever recurs.
- **It swings, it does not spin.** A flat folded shape rotated through 360°
  spends much of each turn edge-on and effectively invisible.

### The fitting room (every product)

`src/components/tryon/` builds the garment from a 2D silhouette described as a
signed distance field, then *inflates* it: every sample inside the outline
pushes a front vertex toward +Z and a back vertex toward −Z by an amount that
falls to zero at the edge, so the two sheets meet and enclose a volume. Tee,
long sleeve, shirt, tank and hoodie are all the same code with different
silhouettes.

Boundary vertices are then snapped onto the true outline along the field's
gradient — without that the silhouette is visibly stair-stepped, because every
vertex sits wherever the sampling grid happened to put it.

`fabric-material.ts` is what makes it read as cloth rather than plastic. In
order of how much each matters: wrap-around diffuse (cotton scatters light, so
the terminator is soft and creeps past 90°), a knit weave that perturbs both
colour and normal, and a broad grazing-angle sheen with no mirror highlight at
all. Chest prints are drawn in the shader and restricted to the front sheet.

Winding matters: row index grows with +y and column with +x, so `(a, b, cc)` is
the counter-clockwise order whose normal faces the viewer. Getting it backwards
points the front sheet's normals into the mesh, pins fresnel at 1, and floods
the garment with rim colour — a dark green tee renders olive.

### Loading discipline

Neither scene loads for a visitor with `prefers-reduced-motion`, Data Saver, or
a 2G connection. The hero waits for browser idle and sits over a CSS poster
that is a finished hero on its own. The fitting room loads only when someone
actually asks to try something on. Quality tiers set geometry resolution, DPR
and dust density from core count and viewport; the lowest tier drops bloom
entirely and compensates with shader exposure. Rendering stops when the tab is
hidden.

---

## Payments

With no `STRIPE_SECRET_KEY` there is **no payment gateway**. An order is
recorded, stock is reserved, and the order is left `PENDING` / `UNPAID`. The
customer is told on screen that nothing has been charged and is pointed at
WhatsApp to confirm.

It is never marked paid. A "paid" record for money that never arrived is the
one bug here that costs real stock, so the unpaid state is deliberate and the
checkout has no path that fakes it.

To use real test payments:

```bash
# .env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The webhook — not the browser returning to `/checkout/success` — is what marks
an order paid. The success URL is a plain GET anyone could visit, so treating it
as proof of payment would let anyone mark their own order paid.

---

## Moving to Postgres

1. `prisma/schema.prisma` — `provider = "postgresql"`
2. `.env` — `DATABASE_URL="postgresql://user:pass@host:5432/vaqita"`
3. `npm i @prisma/adapter-pg` and swap the adapter in `src/lib/db.ts`
4. `npx prisma db push && npm run db:seed`

No model or application changes are needed. Every field uses types common to
both engines: money is integer minor units, and the string "enums" (`status`,
`role`) are validated in application code rather than at the database level.

---

## Replacing the imagery

Product images are **generated placeholders**, not photographs — garment
flat-lays drawn by `scripts/generate-imagery.mjs` into `public/products/`, in
each piece's real colourway with its real print. The silhouettes mirror the
shapes the 3D fitting room builds, so the card and the viewer show the same
garment.

To use real photography, drop files into `public/products/` and update the
`images` arrays in `prisma/seed.ts`, then re-run `npm run db:seed`.

---

## Scripts

| Command                                 | Does                                    |
| --------------------------------------- | --------------------------------------- |
| `npm run dev`                           | Dev server                              |
| `npm run build` / `npm start`           | Production build and serve              |
| `npm run setup`                         | Generate + push schema + seed           |
| `npm run db:seed`                       | Re-seed the catalogue (idempotent)      |
| `npm run db:studio`                     | Prisma Studio                           |
| `npm run typecheck`                     | `tsc --noEmit`                          |
| `node scripts/generate-imagery.mjs`     | Regenerate placeholder imagery          |
| `npx tsx scripts/inspect-db.ts`         | Print orders, stock and cart state      |
| `npx tsx scripts/clear-test-orders.ts`  | Remove test orders, keep the catalogue  |

---

## Known limitations

- **Every route renders dynamically.** The root layout reads the cart and
  session from cookies to render the header badge, which opts the whole tree
  out of static generation. The `revalidate` exports on the catalogue pages
  therefore have no effect today. To get static catalogue pages, move the cart
  badge to a client component that fetches after hydration — at the cost of a
  brief empty-bag flash.
- **Order numbers are `count + 1`.** Two orders placed in the same instant
  could collide on `VQ-2026-0001`. Fine at this volume; use a database sequence
  before it matters.
- **`npm audit` reports advisories in `mysql2`.** It is a transitive dependency
  of the Prisma CLI only — a MySQL driver this project never loads, and not
  part of the application bundle.
- **No transactional email.** Nothing is sent to the customer or to you; an
  order exists only in `/admin/orders`. The confirmation page no longer claims
  otherwise.
- **A database is required to build.** `/collections` and `/products/[slug]`
  read from it while building, so `DATABASE_URL` must point at a reachable
  Postgres even for `npm run build`.
- **Restart `next dev` after changing the Prisma schema.** The dev server holds
  the generated client in its module graph, and `generated/prisma` sits outside
  `src`, so regenerating it mid-session does not reach the running server. New
  columns come back `undefined` with no error — which silently defeated the
  whole try-on feature once during development. `prisma generate` then restart.
- **No test suite.** The commerce logic in `src/lib/money.ts`,
  `src/lib/cart.ts` and `src/app/actions/checkout.ts` is where tests would pay
  for themselves first.
- **The hero's frame rate has not been measured on real hardware.** It was
  built to a budget — tiered geometry, capped DPR, bloom only above the low
  tier — and verified visually, but the sandbox this was developed in throttles
  `requestAnimationFrame`, so no FPS number here would be honest. Profile it on
  a mid-range phone before launch; if it struggles, lower `heightSeg` on the
  drape first, then drop the backdrop segment count.
