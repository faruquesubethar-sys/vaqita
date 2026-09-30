"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * The gold dust the mark is formed out of.
 *
 * It used to run the other way: the swan arrived, then shed dust, and every
 * mote respawned when it died — so gold poured off the mark permanently. A
 * continuous leak reads as a stuck particle effect rather than an event, and
 * at 360 additive motes it drowned the mark it was supposed to introduce.
 *
 * Now it is a single gesture with an end. Motes spiral *inward* on a shell
 * around the mark, tightening and fading as they reach it, so the mark looks
 * like it condensed out of them. Emission runs for a fixed window and then
 * stops; the remaining motes finish their travel and the cloud empties itself.
 *
 * Simulated on the CPU into one BufferGeometry rather than as individual
 * meshes: a few hundred objects would each cost a draw call, where one Points
 * cloud costs exactly one. Each mote is recycled, so the buffer is allocated
 * once and nothing here allocates after mount.
 */

type Props = {
  /** Seconds from scene start before the first mote appears. */
  delay?: number;
  /** How long motes keep being emitted. After this the cloud empties. */
  emitFor?: number;
  count?: number;
  /** Where the mark sits, in world units — the point everything spirals into. */
  origin?: [number, number, number];
  /** How far out motes are born, as x/y/z half-extents. */
  radius?: [number, number, number];
};

export function GoldDust({
  delay = 0.35,
  emitFor = 1.6,
  count = 220,
  origin = [0, -0.34, 0],
  radius = [1.5, 1.0, 1.2],
}: Props) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  /**
   * Per-mote state in cylindrical coordinates.
   *
   * A spiral is almost free this way — the radius shrinks while the angle
   * advances — where the same path in cartesian velocities would need a
   * tangential force recomputed every frame.
   */
  const sim = useMemo(
    () => ({
      angle: new Float32Array(count),
      angSpeed: new Float32Array(count),
      startRadius: new Float32Array(count),
      startY: new Float32Array(count),
      endY: new Float32Array(count),
      squashZ: new Float32Array(count),
      life: new Float32Array(count),
      maxLife: new Float32Array(count),
      baseSize: new Float32Array(count),
      active: new Uint8Array(count),
    }),
    [count],
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(count), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(count), 1));
    // Motes start invisible; the frame loop releases them over time.
    g.setDrawRange(0, 0);
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  /** Puts one mote back on the outer shell, ready to spiral in. */
  const spawn = useMemo(
    () => (i: number) => {
      sim.angle[i] = Math.random() * Math.PI * 2;
      // Mixed spin directions, so it reads as a swirl rather than a turntable.
      sim.angSpeed[i] = (0.9 + Math.random() * 1.4) * (Math.random() < 0.5 ? -1 : 1);
      // sqrt keeps motes from bunching at the centre of the disc.
      sim.startRadius[i] = radius[0] * (0.55 + Math.sqrt(Math.random()) * 0.45);
      sim.startY[i] = origin[1] + (Math.random() - 0.5) * 2 * radius[1];
      sim.endY[i] = origin[1] + (Math.random() - 0.5) * 0.5;
      sim.squashZ[i] = radius[2] / Math.max(radius[0], 1e-3);
      sim.maxLife[i] = 1.1 + Math.random() * 0.9;
      sim.life[i] = 0;
      sim.baseSize[i] = 1.0 + Math.random() * 1.8;
      sim.active[i] = 1;
    },
    [origin, radius, sim],
  );

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

    const emitting = since - delay < emitFor;

    // Release across the emission window rather than all at once, so the
    // cloud builds instead of popping into existence fully formed.
    if (emitting) {
      const progress = (since - delay) / emitFor;
      const target = Math.min(count, Math.ceil(count * Math.min(1, progress * 1.25)));
      while (released.current < target) {
        spawn(released.current);
        released.current += 1;
      }
    }

    let visible = 0;

    for (let i = 0; i < released.current; i++) {
      if (!sim.active[i]) {
        alpha[i] = 0;
        continue;
      }

      sim.life[i] += dt;
      const u = sim.life[i] / sim.maxLife[i];

      if (u >= 1) {
        // Once emission has stopped, a finished mote stays finished. That is
        // what gives the effect an ending.
        if (emitting) spawn(i);
        else {
          sim.active[i] = 0;
          alpha[i] = 0;
        }
        continue;
      }

      // Radius eases to zero: fast at first, slowing as it arrives, so motes
      // appear to be drawn in and absorbed rather than falling into a point.
      const shrink = Math.pow(1 - u, 1.6);
      const r = sim.startRadius[i] * shrink;
      const a = sim.angle[i] + sim.angSpeed[i] * sim.life[i];

      pos[i * 3] = origin[0] + Math.cos(a) * r;
      pos[i * 3 + 1] = sim.startY[i] + (sim.endY[i] - sim.startY[i]) * u;
      pos[i * 3 + 2] = origin[2] + Math.sin(a) * r * sim.squashZ[i];

      // In quickly, out as it merges with the mark.
      alpha[i] = Math.min(u / 0.18, 1) * Math.pow(1 - u, 1.1);
      size[i] = sim.baseSize[i] * (0.65 + shrink * 0.35);
      visible++;
    }

    g.getAttribute("position").needsUpdate = true;
    g.getAttribute("aSize").needsUpdate = true;
    g.getAttribute("aAlpha").needsUpdate = true;
    g.setDrawRange(0, released.current);

    // Nothing left to draw and nothing more coming: stop touching the GPU.
    if (!emitting && visible === 0) g.setDrawRange(0, 0);

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
            gl_PointSize = aSize * (300.0 / max(-mv.z, 0.001));
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform vec3 uWarm;
          uniform vec3 uDeep;
          varying float vAlpha;
          varying float vSeed;

          void main() {
            // Round mote with a soft edge.
            vec2 d = gl_PointCoord - vec2(0.5);
            float r = length(d) * 2.0;
            float disc = smoothstep(1.0, 0.1, r);
            if (disc <= 0.001) discard;

            // Each mote twinkles on its own clock.
            float twinkle = 0.72 + 0.28 * sin(uTime * 3.1 + vSeed * 30.0);
            vec3 tint = mix(uDeep, uWarm, vSeed);

            // Lower ceiling than before: these are additive, and a crowd of
            // them at full strength turns the mark into a glare.
            gl_FragColor = vec4(tint * twinkle, vAlpha * disc * 0.62);
          }
        `}
      />
    </points>
  );
}

export default GoldDust;
