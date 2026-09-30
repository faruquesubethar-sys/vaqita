"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { clothFragmentShader, clothVertexShader } from "./cloth-material";
import { drapeFragmentShader, drapeVertexShader } from "./drape-material";
import { shaftFragmentShader, shaftVertexShader } from "./shaft-material";
import { GoldDust } from "./gold-dust";
import { buildSwanGeometry } from "./swan-geometry";

type Quality = "high" | "medium" | "low";

const PALETTE = {
  deep: new THREE.Color("#07070a"),
  base: new THREE.Color("#3a3d46"),
  backdropDeep: new THREE.Color("#060608"),
  backdropBase: new THREE.Color("#101218"),
  sheen: new THREE.Color("#26251f"),
  accent: new THREE.Color("#b08d57"),
  shaft: new THREE.Color("#c9a86d"),
};

/**
 * Pointer and scroll, smoothed once and shared by everything in the scene.
 *
 * Kept in a ref rather than React state: these update every frame, and routing
 * them through state would re-render the whole tree sixty times a second.
 */
type Rig = {
  pointer: THREE.Vector2;
  pointerTarget: THREE.Vector2;
  scroll: number;
  swell: number;
};

function useRig(): Rig {
  const rig = useRef<Rig>({
    pointer: new THREE.Vector2(),
    pointerTarget: new THREE.Vector2(),
    scroll: 0,
    swell: 0,
  }).current;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      rig.pointerTarget.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
      rig.swell = 0.09;
    };
    const onLeave = () => {
      rig.pointerTarget.set(0, 0);
      rig.swell = 0;
    };
    // Read scroll from a listener, not from useFrame: touching scrollY inside
    // the render loop forces a layout read every frame.
    const onScroll = () => {
      rig.scroll = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [rig]);

  return rig;
}

/* -------------------------------------------------------------- camera rig */

/**
 * Orbits the camera a little with the cursor and dollies it forward on scroll.
 *
 * This is what makes the scene read as genuinely three-dimensional: when the
 * camera moves, near and far objects shift by different amounts, and that
 * parallax is a far stronger depth cue than any amount of shading.
 */
function CameraRig({ rig }: { rig: Rig }) {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const ease = 1 - Math.pow(0.0015, dt);

    rig.pointer.lerp(rig.pointerTarget, ease);

    const s = rig.scroll;
    const aspect = size.width / Math.max(size.height, 1);

    // On a wide screen the camera aims LEFT of the form, throwing it into the
    // right third and leaving the left clear for the headline. A portrait
    // screen has no room for that, so the form centres and the camera pulls
    // back instead — the text then sits over it, on the scrim.
    const portrait = aspect < 1;
    const offsetX = portrait ? -0.1 : -1.15;
    const baseRadius = portrait ? 7.4 : 5.4;

    // Orbit on a fixed radius so the form is never clipped by the near plane.
    const azimuth = rig.pointer.x * (portrait ? 0.2 : 0.42);
    const elevation = rig.pointer.y * 0.22 + s * 0.55;
    const radius = baseRadius - s * 2.3;

    camera.position.x = Math.sin(azimuth) * radius;
    camera.position.z = Math.cos(azimuth) * radius;
    camera.position.y = 0.25 + elevation;

    // Look slightly above centre as we descend, so the form fills the frame.
    target.y = -0.1 + s * 0.45;
    // Drift the framing back toward centre on scroll, once the headline has
    // scrolled away and no longer needs the left side kept clear.
    target.x = offsetX + s * -offsetX;
    target.z = 0;
    camera.lookAt(target);
  });

  return null;
}

/* -------------------------------------------------------------- house mark */

/**
 * The folded swan, extruded and turning slowly.
 *
 * Lit with real lights rather than an analytic shader: this is a metal object,
 * and metal wants specular highlights that move as it rotates — which is
 * exactly what a shader with one baked key direction cannot give you.
 */
function HouseMark({ rig, quality }: { rig: Rig; quality: Quality }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const startedAt = useRef<number | null>(null);

  const geo = useMemo(
    () => buildSwanGeometry(quality === "low" ? "low" : "high"),
    [quality],
  );

  const edges = useMemo(() => new THREE.EdgesGeometry(geo.shell, 24), [geo]);

  useEffect(() => {
    return () => {
      geo.dispose();
      edges.dispose();
    };
  }, [geo, edges]);

  useFrame((state, delta) => {
    if (!group.current || !inner.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    void dt;

    // --- entrance: condensed out of the gold dust -------------------------
    //
    // The dust starts first and spirals inward; the mark forms at the point it
    // converges on. So this does not swoop in from anywhere — it resolves in
    // place, starting small and dim inside the vortex and settling as the dust
    // is absorbed. A mark that flies in past its own dust breaks the illusion
    // that the dust is what it is made of.
    if (startedAt.current === null) startedAt.current = t;
    const GATHER = 1.05; // dust alone, tightening
    const FORM = 1.25; // mark resolving out of it
    const p = Math.min(1, Math.max(0, (t - startedAt.current - GATHER) / FORM));
    // Cubic ease-out
    const ease = 1 - Math.pow(1 - p, 3);

    // Slight overshoot as it settles, so it lands rather than stops.
    const rebound = Math.sin(ease * Math.PI) * 0.05;
    const enterZ = 0;
    const enterX = 0;
    const enterY = 0;
    // Grows from a dense point at the vortex centre.
    const enterScale = 0.12 + ease * 0.88;

    // A single slow turn as it forms, unwinding the dust's own spin.
    const enterRotY = (1 - ease) * -1.15;
    const enterRotZ = (1 - ease) * 0.12;

    inner.current.scale.setScalar(enterScale);

    // Fade in with the growth, so early frames read as glow inside the dust
    // rather than a tiny solid swan sitting in the middle of it.
    inner.current.visible = p > 0.001;

    // --- idle float & sway ------------------------------------------------
    const idleY = Math.sin(t * 0.35) * 0.52 + rig.pointer.x * 0.28;
    const idleX = Math.sin(t * 0.42) * 0.07 - rig.pointer.y * 0.14;
    const hoverY = Math.sin(t * 0.55) * 0.05;

    group.current.rotation.y = enterRotY + idleY * ease;
    group.current.rotation.x = idleX * ease;
    group.current.rotation.z = enterRotZ + Math.sin(t * 0.22) * 0.03 * ease;

    group.current.position.x = 0.35 + enterX;
    group.current.position.y = 0.08 + hoverY * ease + enterY - rebound;
    group.current.position.z = enterZ;
  });

  return (
    <group ref={group} position={[0.35, 0.08, 0]} scale={0.56}>
      <group ref={inner}>
        {/*
          Colours sampled from the reference brooch rather than chosen.
          Percentiles across the photograph gave gold body #bea489, shadow
          #a47957, highlight #fbeabf; panels #3b4f44; eye #0d764e.

          The previous values were #eab308 gold and #059669 panels — a bright
          yellow and a mint green. The real piece is champagne gold against
          near-black forest, and the whole character of it lives in how muted
          those panels are next to the one vivid stone.
        */}
        <mesh geometry={geo.shell}>
          <meshStandardMaterial
            color="#bea489"
            emissive="#4a3520"
            emissiveIntensity={0.05}
            metalness={0.84}
            roughness={0.44}
            envMapIntensity={0.7}
          />
        </mesh>

        {/*
          The wing panels: matte inlay, not gemstone. In the reference they
          are flat and almost velvet — they read dark and absorb light, which
          is exactly what makes the gold edges around them look like metal.
          Giving them gloss and emissive, as before, turned the wing into
          backlit plastic.
        */}
        {/* The gold lip each inlay sits in. Drawn first, fractionally lower,
            so a band of metal frames every green plane. */}
        <mesh geometry={geo.bezels}>
          <meshStandardMaterial
            color="#d8bb8e"
            metalness={0.88}
            roughness={0.32}
            envMapIntensity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh geometry={geo.facets}>
          <meshStandardMaterial
            color="#3b4f44"
            emissive="#101a14"
            emissiveIntensity={0.08}
            roughness={0.82}
            metalness={0.06}
            envMapIntensity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* The one real stone on the piece. It earns its brightness by being
            the only thing on the swan that has any. */}
        <mesh geometry={geo.eye}>
          <meshStandardMaterial
            color="#0d764e"
            emissive="#0d8f5c"
            emissiveIntensity={1.5}
            roughness={0.06}
            metalness={0.15}
            envMapIntensity={4.0}
          />
        </mesh>

        {/* Facet fold edges catching sparkling gold light */}
        <lineSegments geometry={edges}>
          <lineBasicMaterial
            color="#fef08a"
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </lineSegments>
      </group>
    </group>
  );
}

/**
 * A procedural studio environment for the metal to reflect.
 */
function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);

    scene.environment = target.texture;
    // RoomEnvironment is a white studio box. A metal at 0.84 metalness is
    // mostly a mirror, so at full strength the mark reflects that room and
    // saturates to white no matter how far the lights are turned down —
    // which is exactly what happened while chasing this through the lights.
    scene.environmentIntensity = 0.38;

    return () => {
      scene.environment = null;
      scene.environmentIntensity = 1;
      target.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
    };
  }, [gl, scene]);

  return null;
}

/**
 * Direct studio lighting to ensure the swan is always brilliantly lit and visible.
 */
function MarkLights() {
  return (
    <>
      {/*
        Dialled well back. At the previous levels — ambient 0.85 plus three
        sources totalling 6.8 — polished gold saturated to white and the mark
        read as a paper cut-out lit by a flashbulb. Metal needs a dark
        surround and a few hot highlights, not an evenly bright one: the
        reference brooch is mid-tone #bea489 across most of its surface, and
        only the facet edges go pale.
      */}
      <ambientLight intensity={0.16} color="#fff4e2" />
      {/* Key, high and to the left, matching the reference photograph. */}
      <directionalLight position={[-2, 3, 4]} intensity={1.0} color="#fff2dd" />
      {/* Cool fill, to keep the shadow side from going flat black. */}
      <directionalLight position={[3, 1, 2]} intensity={0.55} color="#cfe0f5" />
      {/* Close warm source: this is what travels across the facets as it
          turns, and does most of the work of making it look like metal. */}
      <pointLight position={[0.5, 0.5, 3]} intensity={0.6} color="#ffe6a8" distance={12} />
    </>
  );
}

/* ---------------------------------------------------------------- backdrop */

function Backdrop({ rig, quality }: { rig: Rig; quality: Quality }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const segments = quality === "high" ? 140 : quality === "medium" ? 90 : 48;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmplitude: { value: 0.40 },
      uFrequency: { value: 0.24 },
      uPointer: { value: new THREE.Vector2() },
      uPointerStrength: { value: 0 },
      uColorDeep: { value: PALETTE.backdropDeep },
      uColorBase: { value: PALETTE.backdropBase },
      uColorSheen: { value: PALETTE.sheen },
      uAccent: { value: PALETTE.accent },
      uOpacity: { value: 0.55 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const m = material.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    m.uniforms.uTime.value += dt;
    // Counter-drift against the cursor — the backdrop moves opposite the
    // foreground, which exaggerates the sense of separation between them.
    m.uniforms.uPointer.value.set(-rig.pointer.x * 0.5, -rig.pointer.y * 0.5);
  });

  return (
    <mesh position={[0, 0.2, -4.6]} rotation={[0, 0, 0.12]}>
      <planeGeometry args={[22, 13, segments, segments]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={clothVertexShader}
        fragmentShader={clothFragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------- floor */

/** A dark plane with a soft pool of light where the form meets it. */
function Floor() {
  const uniforms = useMemo(
    () => ({
      uAccent: { value: PALETTE.accent },
    }),
    [],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.82, 0]}>
      <planeGeometry args={[26, 26]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uAccent;
          varying vec2 vUv;
          void main() {
            float d = distance(vUv, vec2(0.5));
            // Contact pool directly beneath the form, fading to nothing.
            float pool = smoothstep(0.30, 0.0, d);
            float haze = smoothstep(0.50, 0.06, d);
            vec3 c = uAccent * pool * 0.16 + vec3(0.05, 0.05, 0.06) * haze;
            gl_FragColor = vec4(c, (pool * 0.55 + haze * 0.30));
          }
        `}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------ light shafts */

function Shafts({ count = 3 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);
  const materials = useRef<THREE.ShaderMaterial[]>([]);

  const shafts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        position: [-2.6 + i * 2.3, 0.9, -1.1 + i * 0.75] as [number, number, number],
        rotation: [0, 0.3 - i * 0.28, 0.24 + i * 0.1] as [number, number, number],
        scale: [2.4 + i * 0.5, 8.5, 1] as [number, number, number],
        intensity: 0.3 - i * 0.06,
        seed: i * 13.7,
      })),
    [count],
  );

  useFrame((state) => {
    for (const m of materials.current) {
      if (m) m.uniforms.uTime.value = state.clock.elapsedTime;
    }
    // The whole set sways, so the light feels like it is coming through
    // something moving rather than from a fixed slot.
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.06;
    }
  });

  return (
    <group ref={group}>
      {shafts.map((shaft, i) => (
        <mesh
          key={i}
          position={shaft.position}
          rotation={shaft.rotation}
          scale={shaft.scale}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            ref={(el) => {
              if (el) materials.current[i] = el;
            }}
            uniforms={{
              uColor: { value: PALETTE.shaft },
              uTime: { value: 0 },
              uIntensity: { value: shaft.intensity },
              uSeed: { value: shaft.seed },
            }}
            vertexShader={shaftVertexShader}
            fragmentShader={shaftFragmentShader}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------- motes */

/**
 * Dust, deliberately spread across a wide Z range.
 *
 * Motes close to the camera sweep past quickly while distant ones barely move,
 * and that difference is most of what makes the space feel deep.
 */
function Motes({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 13;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = -4 + Math.random() * 8;
      sizes[i] = 0.35 + Math.random() * 0.9;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    if (!points.current) return;
    points.current.rotation.y = state.clock.elapsedTime * 0.012;
    points.current.position.y = Math.sin(state.clock.elapsedTime * 0.14) * 0.16;
  });

  return (
    <points ref={points} geometry={geometry}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ uColor: { value: PALETTE.shaft } }}
        vertexShader={/* glsl */ `
          attribute float aSize;
          varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            // Size attenuates with distance, so near motes read as closer.
            gl_PointSize = aSize * (46.0 / -mv.z);
            // And distant ones dim, rather than forming a flat starfield.
            vAlpha = clamp(1.0 - (-mv.z - 1.0) / 9.0, 0.06, 1.0);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            // Round, soft-edged sprite from point coordinates.
            float d = length(gl_PointCoord - vec2(0.5));
            float a = smoothstep(0.5, 0.06, d) * vAlpha * 0.4;
            gl_FragColor = vec4(uColor, a);
          }
        `}
      />
    </points>
  );
}

/* ------------------------------------------------------------------- scene */

function Scene({ quality }: { quality: Quality }) {
  const rig = useRig();

  return (
    <>
      <color attach="background" args={["#08080a"]} />
      {/* Fog is doing real work here — it separates the backdrop from the form
          and hides where the geometry ends. */}
      <fog attach="fog" args={["#08080a", 4.2, 13]} />

      <CameraRig rig={rig} />
      <StudioEnvironment />
      <MarkLights />
      <Backdrop rig={rig} quality={quality} />
      <Shafts count={quality === "low" ? 2 : 3} />
      <HouseMark rig={rig} quality={quality} />
      {/* Arrives first and spirals inward; the mark forms where it converges. */}
      <GoldDust
        origin={[0.35, 0.08, 0]}
        delay={0.3}
        emitFor={1.5}
        count={quality === "high" ? 220 : quality === "medium" ? 140 : 70}
      />
      <Floor />
      <Motes count={quality === "high" ? 220 : quality === "medium" ? 130 : 60} />
    </>
  );
}

/**
 * Picks a quality tier from the device.
 *
 * Read during the lazy state initialiser rather than in an effect: this
 * component is imported with `ssr: false`, so the initialiser only ever runs in
 * the browser, and deciding here avoids mounting the expensive scene for one
 * frame on a phone before downgrading it.
 */
function detectQuality(): Quality {
  if (typeof window === "undefined") return "medium";
  const cores = navigator.hardwareConcurrency ?? 4;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  if (cores <= 4 || narrow) return "low";
  if (cores <= 8) return "medium";
  return "high";
}

export default function HeroScene() {
  const [quality] = useState<Quality>(detectQuality);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // No reason to run a GPU on a scene nobody is looking at.
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0.25, 5.4], fov: 40 }}
      dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
      frameloop={paused ? "never" : "always"}
      gl={{
        antialias: quality !== "low",
        alpha: false,
        powerPreference: "high-performance",
      }}
      style={{ pointerEvents: "none" }}
    >
      <Scene quality={quality} />

      {/* Bloom is what turns the brass rim and the shafts from "lit" into
          "cinematic". Skipped on low-end devices, where it is the single most
          expensive thing in the frame. */}
      {quality !== "low" && (
        <EffectComposer>
          {/* Restrained on purpose: enough to make the brass rim glow, not
              enough to turn every mote into an orb. */}
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.78}
            luminanceSmoothing={0.22}
            mipmapBlur
          />
          <Vignette offset={0.22} darkness={0.82} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
