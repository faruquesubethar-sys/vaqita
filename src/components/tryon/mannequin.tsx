"use client";

import { useEffect, useMemo, useState } from "react";
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
 * The form the garment is worn on.
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
  const neck = useMemo(() => {
    const h = height;
    // Reaches well above the collar. Sitting level with the neckline, the
    // form was hidden behind the shirt's own front sheet and the garment
    // still read as empty — the whole point is that something is visibly
    // inside it.
    const profile: THREE.Vector2[] = [
      // radius, y — from above the collar down to the collarbone line.
      new THREE.Vector2(0.0, h * 0.72),
      new THREE.Vector2(h * 0.058, h * 0.71),
      new THREE.Vector2(h * 0.07, h * 0.64),
      new THREE.Vector2(h * 0.074, h * 0.56),
      new THREE.Vector2(h * 0.086, h * 0.48),
      new THREE.Vector2(h * 0.125, h * 0.42),
      new THREE.Vector2(h * 0.18, h * 0.36),
    ];
    return new THREE.LatheGeometry(profile, 28);
  }, [height]);

  // The upper chest, sitting just inside the shirt so it fills the neckline
  // and the shoulders rather than showing through them.
  const chest = useMemo(() => {
    const g = new THREE.SphereGeometry(height * 0.2, 24, 18);
    // Must stay inside the torso the cloth is draped over, which is 56% of
    // the garment's half-width — the rest is sleeve. Wider than that and the
    // form shows past the shoulders as a dark band, which is what it did.
    // Shallow in z as well as narrow. The garment's back sheet sits only
    // about a third of a unit behind centre, so a deeper form pushes
    // straight through it and appears as a dark blob when the piece is
    // turned round.
    g.scale(1.0, 0.8, 0.34);
    return g;
  }, [height]);

  const dressForm = useDressForm(height);

  // A supplied model replaces the built shape entirely rather than sitting
  // alongside it; two forms inside one garment would intersect.
  if (dressForm) return <primitive object={dressForm} />;

  return (
    <group>
      <mesh geometry={neck} position={[0, 0, -height * 0.01]}>
        <meshStandardMaterial color="#6f655a" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh geometry={chest} position={[0, height * 0.24, height * 0.01]}>
        <meshStandardMaterial color="#5c534a" roughness={0.96} metalness={0.02} />
      </mesh>
    </group>
  );
}

export default Mannequin;
