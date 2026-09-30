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

/**
 * Drop a product photo in, and it becomes the 3D preview.
 *
 * The analysis runs here, in the browser, before anything is sent: the image
 * is trimmed to the garment and its dominant colour is read out, so the admin
 * can see and correct the detected colourway rather than uploading blind.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [extracted, setExtracted] = useState<ExtractedImage | null>(null);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [face, setFace] = useState<"front" | "back" | "gallery">("front");
  const [repaint, setRepaint] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    setBusy(true);
    try {
      const data = await extractFromFile(file);
      setExtracted(data);
      setColorName(data.colorName);
      setColorHex(data.colorHex);
    } catch (err) {
      setResult({
        ok: false,
        error: err instanceof Error ? err.message : "Could not read that image.",
      });
    } finally {
      setBusy(false);
    }
  };

  const onSave = () => {
    if (!extracted) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      // The trimmed PNG is uploaded, not the original — it is already cropped
      // to the garment and capped in size.
      fd.set("file", new File([extracted.blob], "upload.png", { type: "image/png" }));
      fd.set("alt", productName);
      if (face === "front") fd.set("setAsTexture", "on");
      if (face === "back") fd.set("setAsBackTexture", "on");

      const uploaded = await uploadProductImage(fd);
      if (!uploaded.ok) return setResult(uploaded);

      if (repaint) {
        const cw = new FormData();
        cw.set("productId", productId);
        cw.set("colorName", colorName);
        cw.set("colorHex", colorHex);
        const painted = await applyColourway(cw);
        setResult(
          painted.ok
            ? { ok: true, message: `${uploaded.message} ${painted.message}` }
            : painted,
        );
      } else {
        setResult(uploaded);
      }

      setExtracted(null);
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const onClear = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      setResult(await clearTexture(fd));
    });
  };

  return (
    <section className="mt-8 border-t border-bone/10 pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h4 className="eyebrow">Photo → 3D</h4>
        {textureUrl && (
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

      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        {/* Current state */}
        <div className="flex gap-3">
          {textureUrl ? (
            <figure className="w-24">
              <div className="relative aspect-[4/5] overflow-hidden border border-brass/40 bg-graphite">
                <Image src={textureUrl} alt="" fill sizes="96px" className="object-cover" />
              </div>
              <figcaption className="mt-1.5 text-[0.5625rem] uppercase tracking-[0.15em] text-brass-lit">
                Front in 3D
              </figcaption>
            </figure>
          ) : (
            <div className="grid w-24 place-items-center border border-dashed border-bone/15 px-2 py-6 text-center text-[0.5625rem] uppercase leading-relaxed tracking-[0.15em] text-smoke">
              Flat colour
            </div>
          )}

          {textureBackUrl && (
            <figure className="w-24">
              <div className="relative aspect-[4/5] overflow-hidden border border-brass/40 bg-graphite">
                <Image src={textureBackUrl} alt="" fill sizes="96px" className="object-cover" />
              </div>
              <figcaption className="mt-1.5 text-[0.5625rem] uppercase tracking-[0.15em] text-brass-lit">
                Back in 3D
              </figcaption>
            </figure>
          )}

          {extracted && (
            <figure className="w-24">
              <div className="relative aspect-[4/5] overflow-hidden border border-bone/20 bg-graphite">
                {/* Intentionally a plain img: this is a client-side data URL
                    that next/image cannot optimise. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={extracted.previewUrl}
                  alt="Trimmed preview"
                  className="h-full w-full object-contain"
                />
              </div>
              <figcaption className="mt-1.5 text-[0.5625rem] uppercase tracking-[0.15em] text-stone">
                Trimmed
              </figcaption>
            </figure>
          )}
        </div>

        <div>
          <label className={label} htmlFor={`file-${productId}`}>
            Product photograph
          </label>
          <input
            id={`file-${productId}`}
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onPick(e.target.files?.[0])}
            className="w-full text-xs text-stone file:mr-3 file:border file:border-bone/20 file:bg-transparent file:px-4 file:py-2 file:text-[0.625rem] file:uppercase file:tracking-[0.15em] file:text-alabaster hover:file:border-brass"
          />
          <p className="mt-2 text-[0.6875rem] leading-relaxed text-smoke">
            Shoot it flat and upload a PNG with the background already removed.
            The 3D model is then cut from that outline, so it is this garment
            rather than a generic one.
          </p>

          {busy && (
            <p className="mt-3 text-xs text-brass-lit">Reading the image…</p>
          )}

          {/* The single thing that decides whether the 3D matches, said plainly
              before anything is uploaded. */}
          {extracted &&
            (extracted.hasCutout ? (
              <p className="mt-3 border-l-2 border-brass/60 pl-3 text-[0.6875rem] leading-relaxed text-brass-lit">
                Cut-out detected — the 3D model will be traced from this
                garment&rsquo;s own outline.
              </p>
            ) : (
              <p className="mt-3 border-l-2 border-bone/25 pl-3 text-[0.6875rem] leading-relaxed text-stone">
                No transparent background, so there is no outline to trace. The
                photo will be laid over a generic shape instead. For an exact
                model, remove the background first and re-upload as a PNG.
              </p>
            ))}

          {extracted && (
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

              <div className="flex flex-wrap gap-5">
                {/* Front and back are separate surfaces on the model. Without
                    a back photo the reverse is flat cloth colour, which makes
                    turning the garment round pointless. */}
                <fieldset className="flex flex-wrap items-center gap-4">
                  <legend className="sr-only">Where this photo goes</legend>
                  {(
                    [
                      ["front", "Front of the 3D model"],
                      ["back", "Back of the 3D model"],
                      ["gallery", "Gallery only"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-xs text-stone"
                    >
                      <input
                        type="radio"
                        name={`face-${productId}`}
                        checked={face === value}
                        onChange={() => setFace(value)}
                        className="h-3.5 w-3.5 accent-[#b08d57]"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <label className="flex items-center gap-2.5 text-xs text-stone">
                  <input
                    type="checkbox"
                    checked={repaint}
                    onChange={(e) => setRepaint(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#b08d57]"
                  />
                  Repaint the colourway
                </label>
              </div>

              <button
                type="button"
                onClick={onSave}
                disabled={isPending}
                className="border border-brass/60 px-5 py-2 text-[0.625rem] uppercase tracking-[0.18em] text-brass-lit transition-colors hover:bg-brass hover:text-ink disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save image"}
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
