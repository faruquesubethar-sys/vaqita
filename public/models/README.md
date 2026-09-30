# Put a dress form here

Drop a model named **`mannequin.glb`** in this folder and the fitting room
will use it instead of the built-in shape. Nothing else needs changing — the
model is measured when it loads and fitted to whatever garment is being
shown, so any dress form at any scale or origin will line up.

With no file here, a simple procedural form is used instead. That is the
intended fallback, not a failure.

## Choosing one

- It must be a **`.glb`** (a single self-contained file). A `.gltf` with
  separate textures beside it will not load from this path.
- A **dress form or tailor's dummy** works better than a human figure. It is
  what shops actually use, nobody expects it to look real, and it does not
  invite the viewer to judge a body instead of the clothes.
- Keep it **under about 3 MB**. It is downloaded by every visitor who opens
  the fitting room, most of them on a phone.
- Check the **licence** before you use it commercially. CC0 / public domain
  is the safe choice: no attribution, no restrictions. Avoid anything
  marked non-commercial.

Whatever textures the model ships with are discarded and replaced with a
single matte grey. A patterned dress form would compete with the garment on
it, which is the thing being sold.

## Where to look

- **poly.pizza** — has a CC0 tailor's dummy by *reyshapes*, described as
  "a seamstress tool for pinning fabric together". Public domain.
- **sketchfab.com** — search "mannequin CC0" and filter by licence. Needs an
  account.

Download it yourself rather than having it fetched for you: you are the one
accepting the licence.
