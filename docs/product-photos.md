# Photographing stock for the 3D fitting room

The 3D model is built from your photograph. How you shoot and prepare the photo
decides whether the model is *that* garment or a generic one.

## The one thing that matters

**Upload a PNG with a transparent background.**

With a transparent background, the site traces the garment's outline out of the
alpha channel and builds the mesh from that curve — shoulder slope, sleeve
angle, hem width and neckline are your garment's, not an average tee's. The
photograph then lands on the cloth exactly, because the cloth and the picture
of the cloth are the same shape.

Without one, there is no outline to trace. The photo is laid over a generic
shape of the right type instead, and the fit is approximate — this is the
"close, but not quite it" look.

The admin panel tells you which of the two you are about to get, before you
save. Look for **"Cut-out detected"**.

## Shooting

- Lay the garment flat, creases smoothed, sleeves out to the sides as they
  naturally fall — not folded under.
- Shoot straight down, centred. An angled shot bends the outline and the model
  inherits the bend.
- Even light, no hard shadow crossing the cloth. A shadow on the backdrop is
  fine; one on the garment is baked into the model.
- Plain backdrop that contrasts with the garment. White for dark stock, dark
  grey for light stock.
- Fill the frame, with a small margin all round.

## Removing the background

Any of these is fine, as long as the result is a **PNG** and the background is
genuinely transparent (not white):

- Phone gallery apps, or `remove.bg`-style tools.
- Photoshop / Affinity: select subject, mask, export PNG.
- An AI image editor, with the prompt below.

### Prompt for an AI editor

> Remove the background from this photograph of a t-shirt completely, leaving a
> fully transparent background. Export as a PNG with an alpha channel.
>
> Do not change the garment itself in any way: keep its exact shape, outline,
> proportions, colour, print, seams, tags and fabric texture unchanged. Do not
> straighten, reshape, restyle, re-light, retouch or idealise it. Do not add a
> shadow, a reflection, a mannequin or a model. Do not crop into the garment.
>
> Cut precisely along the true edge of the cloth — including under the sleeves,
> inside the neckline, and anywhere the background shows through. Leave no white
> or grey halo along the edge.

Check the result before uploading: the outline is what becomes the model, so a
sloppy cut around a sleeve becomes a sloppy sleeve.

## What the 3D can and cannot do

- **Exact:** the front outline, the print, the colour, the placement of
  everything you can see in the photograph.
- **Approximate:** depth. A single photograph cannot say how thick or how deep
  a garment is, so the volume is inflated from the outline. It is a faithful 3D
  of the garment's shape, not a scan.
- **Not shown:** the back. The reverse of the mesh is rendered in the garment's
  own cloth colour, read from the photograph, rather than mirroring the front
  print onto a side that does not have it.
