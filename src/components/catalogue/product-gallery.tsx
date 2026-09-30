"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string; alt: string | null };

/**
 * Product gallery with a zoom-on-hover primary image.
 *
 * The zoom tracks the pointer by moving `transform-origin` rather than by
 * absolutely positioning a magnified copy — one composited layer, no layout,
 * and it stays smooth on a large image.
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState("50% 50%");

  if (images.length === 0) {
    return <div className="aspect-[4/5] w-full bg-graphite" />;
  }

  const onMove = (e: React.MouseEvent) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={frameRef}
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMove}
        className="relative aspect-[4/5] overflow-hidden bg-graphite"
      >
        {images.map((img, i) => (
          <Image
            key={img.id}
            src={img.url}
            alt={img.alt ?? productName}
            fill
            priority={i === 0}
            sizes="(max-width: 1024px) 100vw, 55vw"
            style={{ transformOrigin: i === active ? origin : "50% 50%" }}
            className={cn(
              "object-cover transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
              i === active ? "opacity-100" : "opacity-0",
              i === active && zooming ? "scale-[1.6]" : "scale-100",
            )}
          />
        ))}

        <div aria-hidden className="grain-layer" />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-[4/5] overflow-hidden bg-graphite transition-all duration-500",
                i === active
                  ? "opacity-100 ring-1 ring-brass"
                  : "opacity-45 hover:opacity-80",
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="12vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
