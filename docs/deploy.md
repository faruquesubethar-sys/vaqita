# Taking VAQITA live on about ₹700 a year

The running cost of the site is **₹0**. The only thing you pay for is the
domain name, and you can go live without one.

| Piece | Service | Cost |
| --- | --- | --- |
| Hosting | Vercel or Render, free tier | ₹0 |
| Database | Neon, free tier | ₹0 |
| Product photos | Cloudinary, free tier | ₹0 |
| Domain | optional, see step 6 | ₹0–800/year |

Nothing here takes a card to start. Prices for domains change constantly —
check before you buy rather than trusting a number in this file.

---

## Before you start

You need three free accounts: **Neon**, **Cloudinary**, and **Vercel** (or
Render). Create them yourself — sign-ups need your email and your agreement to
their terms, so they are not something to hand off.

---

## 1. Database (Neon)

The site used to keep its data in a file on disk. Free hosting throws its disk
away on every deploy, so the data now lives in a managed Postgres.

1. Sign up at **neon.tech**, create a project.
2. Pick the region carefully. **It cannot be changed afterwards.** Choose the
   one closest to your customers, and then set your host's region to match in
   step 5 — a server and a database on different continents make every page
   slower than either being far away on its own.
3. Copy **both** connection strings. Neon gives you two for the same database
   and they are not interchangeable:

   - **Pooled** — hostname contains `-pooler`. Goes in `.env` as
     `DATABASE_URL`. This is what the site uses; free hosting opens a
     connection per request and the pooler is what stops that exhausting the
     database.
   - **Direct** — no `-pooler`. Goes in `.env` as `DATABASE_URL_UNPOOLED`.
     Used only by the Prisma CLI for schema changes.

   Schema changes over the pooled connection fail with
   `prepared statement "s0" already exists`, which never mentions pooling and
   sends you hunting in the wrong place. Setting both avoids it entirely.

   Only `DATABASE_URL` needs to go on your host.
5. Change `sslmode=require` to `sslmode=verify-full` in both. Neon hands you
   `require`; node-postgres treats that as full verification today, but in
   pg v9 it becomes "encrypted but unverified". Writing `verify-full`
   explicitly means a future dependency upgrade cannot quietly weaken the
   connection.
4. Create the tables and the sections:

   ```bash
   npm run setup
   ```

Your shop is empty at this point, which is intended — you add stock from the
admin panel.

## 2. Product photos (Cloudinary)

1. Sign up at **cloudinary.com**.
2. From the dashboard, copy **Cloud name**, **API Key** and **API Secret**.
3. Add all three to `.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`.

Leave them blank and uploads fall back to the local `public/uploads` folder,
which is fine on your laptop and useless in production.

Uploads are stored as **PNG** so the transparent background survives. That
transparency is what the 3D model's outline is traced from — see
[product-photos.md](product-photos.md).

## 3. Secrets

Generate a session key that is different from your local one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Keep it for step 5. Never commit it — `.env` is already git-ignored.

## 4. Put the code in a git repository

The repository currently has **no commits**. Every host deploys from git, so
this has to happen first.

```bash
git add -A && git commit -m "VAQITA storefront"
```

Then create an empty **private** repository on GitHub and push to it. Private
matters: the repo contains your shop's code, and a public one invites people to
go looking for its admin panel.

## 5. Hosting

Two honest options. Both are free.

### Vercel — faster, but read the terms

Vercel is built by the makers of Next.js, so this app runs there with no
adaptation, and pages stay warm. **Their Hobby plan is for non-commercial use.**
A shop selling clothes is commercial, so strictly you would need Pro
(about $20/month). Plenty of small shops start on Hobby anyway; the risk is
that Vercel asks you to upgrade or suspends the project. That is your call to
make, not mine to make quietly.

1. **vercel.com** → Add New → Project → import your GitHub repo.
2. Framework preset: Next.js (detected automatically).
3. Add environment variables:
   - `DATABASE_URL` — the Neon pooled string
   - `AUTH_SECRET` — from step 3
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `NEXT_PUBLIC_SITE_URL` — leave as the `.vercel.app` URL for now
4. Deploy.

### Render — slower, no terms problem

Render's free plan allows commercial use, but a free service **sleeps after 15
minutes of inactivity** and takes roughly a minute to wake. Someone tapping
your Instagram link may wait that long for the first page.

1. **render.com** → New → Web Service → connect the repo.
2. Build command `npm install && npm run build`, start command `npm start`.
3. Add the same environment variables as above.

## 6. Domain

Do this **last**, once the site works on the host's own URL.

You do not need one to be live. `vaqita.vercel.app` works and costs nothing.
Buy a domain when you want it on a card or a bio link.

- Buy from a registrar (Namecheap, Cloudflare, GoDaddy, Hostinger). A `.in` or
  `.shop` is usually the cheapest first year.
- **Buy the domain only.** Do not buy the hosting they offer alongside it. It
  is shared/cPanel hosting, it cannot run this app, and it is the single most
  common way to waste money on a Next.js site.
- Add the domain in your host's dashboard and follow its DNS instructions.
- Update `NEXT_PUBLIC_SITE_URL` to the real address and redeploy.

## 7. Before you tell anyone the address

- [ ] Seed the live database with your own admin login. Put these in `.env`
      first:

      ADMIN_EMAIL="you@example.com"
      ADMIN_PASSWORD="at least sixteen characters"

      then run `npm run db:seed`. Seeding any database that is not on your own
      machine **refuses to run** without them, so the password published in
      this repository cannot reach your live shop by accident.
- [ ] Sign in to `/admin` and confirm the password works.
- [ ] Add one real piece, with a cut-out photo, and check the 3D fitting room.

      Nothing needs cleaning out first. The live database is a brand new one,
      so the `example` test product and the test orders never existed there —
      they only exist in the old local SQLite file, which is now unused.
- [ ] Place one test order and confirm it appears in `/admin/orders` as
      **PENDING / UNPAID**.
- [ ] Check the WhatsApp and Instagram links go to the right accounts.

## What the site does and does not do

- **No payment gateway.** An order is recorded as PENDING / UNPAID and the
  customer is told, on screen, that nothing has been charged and to confirm on
  WhatsApp. Nothing is ever marked paid without a real payment.
- **No email.** Nothing is sent to the customer or to you. Watch
  `/admin/orders` — an order only exists there.
- **Stock is reserved at order time**, so two people cannot buy the same piece.
  Cancelling an order in the admin puts it back.
