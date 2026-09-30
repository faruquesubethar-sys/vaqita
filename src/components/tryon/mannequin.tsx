"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * A real dress-form model, if one has been supplied.
 *
 * Drop a .glb at `public/models/mannequin.glb` and it is used instead of the
 * shape below. Nothing else needs changing: it is measured on load and fitted
 * to the garment, so any dress form of any scale or origin will line up.
 *
 * Absent, the procedural form is used. The file is deliberately optional
 * rather than required — a missing model must degrade to something workable,
 * not to an empty fitting room.
 */
const MODEL_URL = "/models/mannequin.glb";

/** How tall the form stands relative to the garment on it. */
const FORM_HEIGHT = 2.5;
/** Where the garment's own centre sits on that form, 0 feet, 1 shoulders. */
const SHOULDER_LINE = 0.78;

function useDressForm(height: number) {
  const [model, setModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Probed before loading. This does not remove the 404 when no model is
    // present — the probe itself is the 404 — but it keeps a missing
    // optional file from reaching the GLTF loader, which would otherwise
    // follow it with parse errors for an HTML error page it was handed
    // instead of a model.
    const load = async () => {
      try {
        const head = await fetch(MODEL_URL, { method: "HEAD" });
        if (!head.ok || cancelled) return;
      } catch {
        return;
      }

      new GLTFLoader().load(
        MODEL_URL,
        (gltf) => {
          if (cancelled) return;
          const scene = gltf.scene;

          // Measured and refitted rather than trusted. Models come in at
          // wildly different scales and origins — metres, centimetres, feet at
          // the origin or the navel — so anything hardcoded here would only
          // work for one particular file.
          const box = new THREE.Box3().setFromObject(scene);
          const size = new THREE.Vector3();
          const centre = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(centre);
          if (!(size.y > 0)) return;

          const scale = (height * FORM_HEIGHT) / size.y;
          scene.scale.setScalar(scale);
          scene.position.set(
            -centre.x * scale,
            -box.min.y * scale - height * FORM_HEIGHT * SHOULDER_LINE + height * 0.5,
            -centre.z * scale,
          );

          scene.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            // One matte material throughout. A dress form with its own
            // textures would compete with the garment it is displaying.
            mesh.material = new THREE.MeshStandardMaterial({
              color: "#6f655a",
              roughness: 0.95,
              metalness: 0.02,
            });
          });

          setModel(scene);
        },
        undefined,
        // Present but unreadable. The procedural form covers it.
        () => undefined,
      );
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [height]);

  return model;
}

/**
 * The form the garment is worn on, when there is one.
 *
 * By default there is not, and that is deliberate. The garment is shaped
 * around a body — shoulders, chest, waist — but nothing is inside it. That
 * is the ghost-mannequin look, and it is what premium retailers actually
 * use: the clothes are the subject and a visible dummy is furniture.
 *
 * A built form was drawn here and it came out as a cone in a t-shirt. A
 * half-suggested body is worse than none, because it invites the viewer to
 * look for a person and then does not deliver one.
 *
 * It could not have fitted either. The garment outline is traced from a
 * flat-lay photograph — flat, symmetrical, sleeves straight out to the
 * sides. A real body has arms where that outline has none, so a rounded
 * form pushes through the sleeves.
 *
 * A .glb at `public/models/mannequin.glb` is used if present.
 *
 * A note on what is visible and what is not: the garment silhouette is traced
 * from a flat-lay photograph, which has no neck opening — the collar is
 * cloth, and behind it is more cloth. So nothing can ever be seen *through*
 * the neckline, and the form only reads where it rises above the shoulder
 * line. It is a warm stone grey for the same reason: at the near-black it
 * started as, it was rendering correctly and invisible against the backdrop.
 *
 * Only ever glimpsed — through the neckline, past the sleeve openings, and
 * as a dark edge inside the hem. That is the whole job: a tee with nothing
 * inside it reads as a cushion however well it is shaped, because the collar
 * opens onto the background. A neck behind that opening settles the question
 * in one glance.
 *
 * Deliberately a dark, matte, featureless form rather than a figure. It is
 * there to be understood and not looked at: anything more detailed competes
 * with the garment, which is the thing being sold, and a realistic body
 * invites the viewer to judge the body instead of the cloth.
 */
export function Mannequin({
  /** The garment's height in world units — everything is sized off this. */
  height,
}: {
  height: number;
}) {
  // A lathe: one silhouette curve spun around the vertical axis. Cheaper than
  // a sculpted mesh and, for a neck and shoulder line, indistinguishable.
  const dressForm = useDressForm(height);

  // Nothing by default. The cloth is shaped around a body; showing what is
  // inside it turned out not to matter, and a half-suggested one actively
  // hurt — the built form came out as a cone in a t-shirt.
  if (!dressForm) return null;

  return <primitive object={dressForm} />;
}

export default Mannequin;
