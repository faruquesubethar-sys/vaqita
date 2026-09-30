"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * The form the garment is worn on.
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
    const profile: THREE.Vector2[] = [
      // radius, y — from the base of the throat up to the collarbone line.
      new THREE.Vector2(0.0, h * 0.58),
      new THREE.Vector2(h * 0.052, h * 0.575),
      new THREE.Vector2(h * 0.062, h * 0.53),
      new THREE.Vector2(h * 0.066, h * 0.47),
      new THREE.Vector2(h * 0.078, h * 0.42),
      new THREE.Vector2(h * 0.115, h * 0.37),
      new THREE.Vector2(h * 0.17, h * 0.33),
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
    g.scale(1.0, 0.8, 0.6);
    return g;
  }, [height]);

  return (
    <group>
      <mesh geometry={neck} position={[0, 0, -height * 0.01]}>
        <meshStandardMaterial color="#2a2724" roughness={0.94} metalness={0.02} />
      </mesh>
      <mesh geometry={chest} position={[0, height * 0.24, -height * 0.03]}>
        <meshStandardMaterial color="#232120" roughness={0.96} metalness={0.02} />
      </mesh>
    </group>
  );
}

export default Mannequin;
