import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { v2 as cloudinary } from "cloudinary";

/**
 * Where product photographs live.
 *
 * They used to be written into `public/uploads`. That works on your laptop and
 * nowhere else: free hosting gives you a container with a throwaway filesystem,
 * so every photo would disappear the next time the site was deployed — and the
 * 3D model is built from the photo, so the whole fitting room would empty out
 * with it.
 *
 * With Cloudinary credentials set, uploads go there and are served from its
 * CDN. Without them, the old local-disk path is used, so `npm run dev` still
 * works on a laptop with no accounts configured.
 */

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const remoteStorageEnabled = Boolean(cloudName && apiKey && apiSecret);

if (remoteStorageEnabled) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type StoredImage = { url: string };

/**
 * Stores one product photograph and returns the URL to render it from.
 *
 * `slug` only shapes the filename, so a photo can be recognised in a listing.
 * It is never trusted as a path: the stored name is always slug + a random
 * suffix, because an upload is untrusted input and a name like "../../x" must
 * not reach a path join.
 */
export async function storeProductImage(
  file: File,
  slug: string,
): Promise<StoredImage> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = EXTENSION[file.type] ?? "png";
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "product";
  const name = `${safeSlug}-${randomUUID().slice(0, 8)}`;

  if (remoteStorageEnabled) {
    const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "vaqita/products",
            public_id: name,
            resource_type: "image",
            // The alpha channel is the whole point: it is what the 3D model's
            // outline is traced from. Anything that flattens it onto a
            // background silently downgrades every garment to a generic mesh.
            format: "png",
          },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error("Cloudinary returned no result."));
              return;
            }
            resolve(result);
          },
        )
        .end(bytes);
    });

    return { url: uploaded.secure_url };
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.${ext}`), bytes);
  return { url: `/uploads/${name}.${ext}` };
}
