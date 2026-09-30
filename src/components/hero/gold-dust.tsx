"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Gold dust shed by the mark once its entrance lands.
 *
 * Simulated on the CPU into a single BufferGeometry rather than as individual
 * meshes: a few hundred objects would each cost a draw call, where one Points
 * cloud costs exactly one. Positions are written straight into the attribute
 * array each frame and flagged for upload.
 *
 * Each mote is recycled rather than destroyed, so the buffer is allocated once
 * and never grows — nothing here allocates after mount.
 */

type Props = {
  /** Seconds from scene start before the first mote is released. */
  delay?: number;
  count?: number;
  /** Roughly where the mark sits, in world units. */
  origin?: [number, number, number];
  /** Half-extents of the region motes are born in. */
  spread?: [number, number, number];
};

export function GoldDust({
  delay = 2.2,
  count = 300,
  origin = [0, -0.34, 0],
  spread = [1.1, 0.85, 0.45],
}: Props) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  // Per-mote simulation state, kept outside the geometry so the attribute
  // arrays hold nothing but what the GPU needs.
  const sim = useMemo(() => {
    const velocity = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const maxLife = new Float32Array(count);
    const spin = new Float32Array(count);
    return { velocity, life, maxLife, spin };
  }, [count]);

  const geometry = useMemo(() => {
    const position = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const alpha = new Float32Array(count);

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(position, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    // Motes start invisible; the frame loop releases them over time.
    g.setDrawRange(0, 0);
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  /** Places one mote back at the mark with a fresh drift. */
  const respawn = useMemo(() => {
    return (i: number, pos: Float32Array, size: Float32Array, isInitialBurst = false) => {
      // Born across the mark's faceted wings and body
      pos[i * 3] = origin[0] + (Math.random() - 0.5) * 2 * spread[0];
      pos[i * 3 + 1] = origin[1] + (Math.random() - 0.4) * 2 * spread[1];
      pos[i * 3 + 2] = origin[2] + (Math.random() - 0.5) * 2 * spread[2];

      // Golden dust floats gently off the swan with slight outward momentum and slow downward drift
      const speedMult = isInitialBurst ? 1.4 : 1.0;
      sim.velocity[i * 3] = (Math.random() - 0.48) * 0.14 * speedMult;
      sim.velocity[i * 3 + 1] = (-0.04 - Math.random() * 0.12) * speedMult;
      sim.velocity[i * 3 + 2] = (Math.random() - 0.5) * 0.1 * speedMult;

      sim.maxLife[i] = 3.2 + Math.random() * 4.0;
      sim.life[i] = 0;
      sim.spin[i] = Math.random() * Math.PI * 2;
      size[i] = 0.8 + Math.random() * 2.2;
    };
  }, [origin, spread, sim]);

  const started = useRef<number | null>(null);
  const released = useRef(0);

  useFrame((state, delta) => {
    const g = points.current?.geometry as THREE.BufferGeometry | undefined;
    if (!g) return;

    const t = state.clock.elapsedTime;
    if (started.current === null) started.current = t;
    const since = t - started.current;
    if (since < delay) return;

    const dt = Math.min(delta, 0.05);
    const pos = g.getAttribute("position").array as Float32Array;
    const size = g.getAttribute("aSize").array as Float32Array;
    const alpha = g.getAttribute("aAlpha").array as Float32Array;

    // Dramatic entrance shed: as the swan arrives, immediately release a cascade
    // of shimmering golden dust motes, expanding quickly to full count.
    const elapsedSinceLanding = since - delay;
    const shedProgress = Math.min(1, elapsedSinceLanding / 1.5);
    // Exponential rush then smooth sustain
    const target = Math.min(count, Math.floor(count * Math.pow(shedProgress, 0.6)));

    while (released.current < target) {
      respawn(released.current, pos, size, true);
      released.current += 1;
    }

    for (let i = 0; i < released.current; i++) {
      sim.life[i] += dt;

      if (sim.life[i] >= sim.maxLife[i]) {
        respawn(i, pos, size, false);
        continue;
      }

      // Air resistance and subtle gravity
      sim.velocity[i * 3 + 1] -= 0.015 * dt;

      // Organic lateral sway and air swirl around the 3D swan
      const sway = Math.sin(t * 1.2 + sim.spin[i]) * 0.035;
      const swirlZ = Math.cos(t * 0.9 + sim.spin[i]) * 0.02;

      pos[i * 3] += (sim.velocity[i * 3] + sway) * dt;
      pos[i * 3 + 1] += sim.velocity[i * 3 + 1] * dt;
      pos[i * 3 + 2] += (sim.velocity[i * 3 + 2] + swirlZ) * dt;

      // Soft fade in and gentle fade out as it sheds
      const u = sim.life[i] / sim.maxLife[i];
      alpha[i] = Math.min(u / 0.1, 1) * Math.pow(1 - u, 1.4);
    }

    g.getAttribute("position").needsUpdate = true;
    g.getAttribute("aSize").needsUpdate = true;
    g.getAttribute("aAlpha").needsUpdate = true;
    g.setDrawRange(0, released.current);

    if (material.current) material.current.uniforms.uTime.value = t;
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarm: { value: new THREE.Color("#ffe59e") },
      uDeep: { value: new THREE.Color("#c99a4c") },
    }),
    [],
  );

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          attribute float aSize;
          attribute float aAlpha;
          varying float vAlpha;
          varying float vSeed;

          void main() {
            vAlpha = aAlpha;
            // Cheap per-mote variation, derived from position rather than an
            // extra attribute.
            vSeed = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);

            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            // Attenuate with distance so near motes read as closer.
            gl_PointSize = aSize * (150.0 / max(-mv.z, 0.001));
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uWarm;
          uniform vec3 uDeep;
          uniform float uTime;
          varying float vAlpha;
          varying float vSeed;

          void main() {
            // Round, soft-edged sprite from the point coordinate.
            vec2 p = gl_PointCoord - 0.5;
            float d = length(p);
            if (d > 0.5) discard;

            float core = smoothstep(0.5, 0.0, d);

            // Each flake twinkles on its own clock — real gold dust catches
            // the light intermittently as it tumbles.
            float twinkle = 0.55 + 0.45 * sin(uTime * 3.2 + vSeed * 31.4);

            vec3 colour = mix(uDeep, uWarm, vSeed);
            float a = core * vAlpha * twinkle;

            gl_FragColor = vec4(colour * (0.6 + twinkle * 0.7), a);
          }
        `}
      />
    </points>
  );
}
