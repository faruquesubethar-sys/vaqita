"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import {
  applyColourway,
  clearTexture,
  uploadProductImage,
  type AdminResult,
} from "@/app/actions/admin";
import { extractFromFile, type ExtractedImage } from "@/lib/image-extract";
import { cn } from "@/lib/utils";

const field =
  "w-full border border-bone/15 bg-transparent px-3 py-2 text-sm text-alabaster outline-none transition-colors placeholder:text-smoke focus:border-brass";
const label = "eyebrow mb-2 block";

type Face = "front" | "back";

/**
 * Both sides of a garment, in one step.
 *
 * It used to take one photograph at a time with a radio button for which side
 * it was, which meant uploading, waiting, choosing again and uploading again —
 * and in practice the back never got done, so every garment's reverse stayed
 * flat colour and turning it round showed nothing.
 *
 * The analysis runs here, in the browser, before anything is sent: each image
 * is trimmed to the garment and the front's dominant colour is read out, so
 * the colourway can be seen and corrected rather than uploaded blind.
 */
export function ImageUpload({
  productId,
  productName,
  textureUrl,
  textureBackUrl,
}: {
  productId: string;
  productName: string;
  textureUrl: string | null;
  textureBackUrl: string | null;
}) {
  const inputs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  const [picked, setPicked] = useState<Record<Face, ExtractedImage | null>>({
    front: null,
    back: null,
  });
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [repaint, setRepaint] = useState(true);
  const [busy, setBusy] = useState<Face | null>(null);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const onPick = async (face: Face, file: File | undefined) => {
    if (!file) return;
    setResult(null);
    setBusy(face);
    try {
      const data = await extractFromFile(file);
      setPicked((p) => ({ ...p, [face]: data }));
      // The colourway comes off the front only. The back of a tee is often
      // mostly print, and reading the cloth colour from it gives the garment
      // the ink's colour instead of its own.
      if (face === "front") {
        setColorName(data.colorName);
        setColorHex(data.colorHex);
      }
    } catch (err) {
      setResult({
        ok: false,
        error: err instanceof Error ? err.message : "Could not read that image.",
      });
    } finally {
      setBusy(null);
    }
  };

  const onSave = () => {
    if (!picked.front && !picked.back) return;

    startTransition(async () => {
      const saved: string[] = [];

      for (const face of ["front", "back"] as const) {
        const image = picked[face];
        if (!image) continue;

        const fd = new FormData();
        fd.set("productId", productId);
        // The trimmed PNG is uploaded, not the original — already cropped to
        // the garment and capped in size.
        fd.set("file", new File([image.blob], `${face}.png`, { type: "image/png" }));
        fd.set("alt", `${productName} — ${face}`);
        fd.set(face === "front" ? "setAsTexture" : "setAsBackTexture", "on");

        const uploaded = await uploadProductImage(fd);
        // Stop on the first failure rather than pressing on: a product with a
        // new front and a stale back is harder to notice than one that
        // plainly did not save.
        if (!uploaded.ok) return setResult(uploaded);
        saved.push(face);
      }

      let message = `Saved the ${saved.join(" and ")} of the 3D model.`;

      if (repaint && picked.front) {
        const cw = new FormData();
        cw.set("productId", productId);
        cw.set("colorName", colorName);
        cw.set("colorHex", colorHex);
        const painted = await applyColourway(cw);
        if (!painted.ok) return setResult(painted);
        message = `${message} ${painted.message}`;
      }

      setResult({ ok: true, message });
      setPicked({ front: null, back: null });
      if (inputs.front.current) inputs.front.current.value = "";
      if (inputs.back.current) inputs.back.current.value = "";
    });
  };

  const onClear = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      setResult(await clearTexture(fd));
    });
  };

  const live: [Face, string | null][] = [
    ["front", textureUrl],
    ["back", textureBackUrl],
  ];

  return (
    <section className="mt-8 border-t border-bone/10 pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h4 className="eyebrow">Photo → 3D</h4>
        {(textureUrl || textureBackUrl) && (
          <button
            type="button"
            onClick={onClear}
            disabled={isPending}
            className="text-[0.625rem] uppercase tracking-[0.15em] text-smoke transition-colors hover:text-danger disabled:opacity-50"
          >
            Remove from 3D
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* What the model is wearing right now. */}
        <div className="flex gap-3">
          {live.map(([face, url]) => (
            <figure key={face} className="w-20">
              <div
                className={cn(
                  "relative aspect-[4/5] overflow-hidden border bg-graphite",
                  url ? "border-brass/40" : "border-dashed border-bone/15",
                )}
              >
                {url ? (
                  <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <span className="grid h-full place-items-center px-1 text-center text-[0.5rem] uppercase leading-tight tracking-[0.12em] text-smoke">
                    Not set
                  </span>
                )}
              </div>
              <figcaption
                className={cn(
                  "mt-1.5 text-[0.5625rem] uppercase tracking-[0.15em]",
                  url ? "text-brass-lit" : "text-smoke",
                )}
              >
                {face} in 3D
              </figcaption>
            </figure>
          ))}
        </div>

        <div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(["front", "back"] as const).map((face) => {
              const image = picked[face];
              return (
                <div key={face}>
                  <label className={label} htmlFor={`${face}-${productId}`}>
                    {face === "front" ? "Front photograph" : "Back photograph"}
                  </label>
                  <input
                    id={`${face}-${productId}`}
                    ref={inputs[face]}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => onPick(face, e.target.files?.[0])}
                    className="w-full text-xs text-stone file:mr-3 file:border file:border-bone/20 file:bg-transparent file:px-3 file:py-2 file:text-[0.625rem] file:uppercase file:tracking-[0.15em] file:text-alabaster hover:file:border-brass"
                  />

                  {busy === face && (
                    <p className="mt-2 text-xs text-brass-lit">Reading…</p>
                  )}

                  {image && (
                    <div className="mt-3 flex items-start gap-3">
                      <div className="relative h-20 w-16 shrink-0 overflow-hidden border border-bone/20 bg-graphite">
                        {/* Intentionally a plain img: a client-side data URL
                            that next/image cannot optimise. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.previewUrl}
                          alt={`${face} preview`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      {/* The one thing that decides whether the 3D matches,
                          said per image, before anything is uploaded. */}
                      <p
                        className={cn(
                          "border-l-2 pl-2 text-[0.625rem] leading-relaxed",
                          image.hasCutout
                            ? "border-brass/60 text-brass-lit"
                            : "border-bone/25 text-stone",
                        )}
                      >
                        {image.hasCutout
                          ? "Cut-out detected — traced from this garment's own outline."
                          : "No transparent background. Laid over a generic shape instead."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[0.6875rem] leading-relaxed text-smoke">
            Shoot both sides flat, the same way — same distance, same light,
            same background — and upload PNGs with the background removed. The
            two are mapped onto opposite faces of the same model, so a back
            shot at a different angle will not line up when the garment turns.
          </p>

          {(picked.front || picked.back) && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
                <div>
                  <label className={label} htmlFor={`cname-${productId}`}>
                    Detected colourway
                  </label>
                  <input
                    id={`cname-${productId}`}
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label} htmlFor={`chex-${productId}`}>
                    Hex
                  </label>
                  <input
                    id={`chex-${productId}`}
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    pattern="#[0-9a-fA-F]{6}"
                    className={`${field} w-28 font-mono`}
                  />
                </div>
                <span
                  aria-hidden
                  className="mb-1 h-9 w-9 shrink-0 rounded-full ring-1 ring-bone/25"
                  style={{ backgroundColor: colorHex }}
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-stone">
                <input
                  type="checkbox"
                  checked={repaint}
                  onChange={(e) => setRepaint(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#b08d57]"
                />
                Repaint the colourway
              </label>

              <button
                type="button"
                onClick={onSave}
                disabled={isPending}
                className="border border-brass/60 px-5 py-2 text-[0.625rem] uppercase tracking-[0.18em] text-brass-lit transition-colors hover:bg-brass hover:text-ink disabled:opacity-50"
              >
                {isPending
                  ? "Saving…"
                  : picked.front && picked.back
                    ? "Save both sides"
                    : `Save the ${picked.front ? "front" : "back"}`}
              </button>
            </div>
          )}

          {result && (
            <p
              role="status"
              className={cn(
                "mt-4 border-l-2 px-3 py-2 text-xs leading-relaxed",
                result.ok
                  ? "border-success bg-success/10 text-bone"
                  : "border-danger bg-danger/10 text-bone",
              )}
            >
              {result.ok ? result.message : result.error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
