"use client";

import { useMemo } from "react";
import * as THREE from "three";

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
