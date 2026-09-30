"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  PRINT_STYLE_IDS,
  fabricFragmentShader,
  fabricVertexShader,
} from "./fabric-material";
import {
  buildGarmentFromMask,
  buildGarmentGeometry,
  garmentHeight,
  type GarmentGeometryResult,
  type GarmentType,
} from "./garment-geometry";
import { Mannequin } from "./mannequin";
import { silhouetteFromImage } from "./photo-silhouette";

export type GarmentViewerProps = {
  garmentType: GarmentType;
  colorHex: string;
  printStyle?: string;
  /** A product photograph to project onto the garment's front face. */
  textureUrl?: string | null;
  /** The same for the reverse. Without it the back is flat cloth colour. */
  textureBackUrl?: string | null;
  /** Deterministic per product so the print crackle does not change on rerender. */
  seed?: number;
  /** Slow idle turn. Off while the visitor is dragging. */
  autoRotate?: boolean;
  className?: string;
};

/**
 * Loads one projected photograph.
 *
 * Held in state rather than written straight into the material's uniforms.
 * An earlier version wrote to a ref inside an effect and bailed when the ref
 * was not yet attached — and since the URL never changes afterwards, that
 * effect never ran again, so the photograph was silently never fetched and
 * every garment rendered as flat colour. State has no such ordering problem.
 */
function useProjectedTexture(url?: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }

    let cancelled = false;
    new THREE.TextureLoader().load(
      url,
      (loaded) => {
        if (cancelled) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = 4;
        // The photo covers the garment exactly once; repeating would tile a
        // sleeve across the chest at the edges.
        loaded.wrapS = THREE.ClampToEdgeWrapping;
        loaded.wrapT = THREE.ClampToEdgeWrapping;
        setTexture(loaded);
      },
      undefined,
      // A missing or unreadable file falls back to the flat colourway rather
      // than rendering an untextured black garment.
      () => {
        if (!cancelled) setTexture(null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  // An undisposed texture holds its GPU memory for the life of the page.
  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}

function Garment({
  garmentType,
  colorHex,
  printStyle = "NONE",
  textureUrl,
  textureBackUrl,
  seed = 0,
  resolution,
}: Required<Pick<GarmentViewerProps, "garmentType" | "colorHex">> & {
  printStyle?: string;
  textureUrl?: string | null;
  textureBackUrl?: string | null;
  seed?: number;
  resolution: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  // Rebuilding the mesh is the expensive part, so it is keyed only on shape —
  // changing colour must never regenerate geometry.
  const parametric = useMemo(
    () => buildGarmentGeometry(garmentType, resolution),
    [garmentType, resolution],
  );

  useEffect(() => () => parametric.geometry.dispose(), [parametric]);

  /**
   * A mesh traced from the product's own photograph, when there is one.
   *
   * This is what makes an uploaded garment match: the outline of the cloth and
   * the outline in the picture are the same curve, so nothing has to be fitted.
   * Built after the texture loads, because it is read out of the same image.
   */
  const [traced, setTraced] = useState<{
    result: GarmentGeometryResult;
    clothHex: string;
  } | null>(null);

  const active = traced?.result ?? parametric;
  // Trousers and track pants hang from the waist, not the shoulders.
  const wornOnBody = !["TRACK_PANT", "TROUSER", "CAP"].includes(garmentType);
  const { geometry, print, height, bounds } = active;
  const photoFit = traced !== null;

  // Frame the camera from the garment's own height. A trouser is half again as
  // long as a tee, and a fixed camera distance crops it.
  const { camera } = useThree();
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const vFov = (perspective.fov * Math.PI) / 180;
    // Distance at which the garment's height fills ~62% of the frame. The
    // stage is often wider than it is tall and the controls panel overlaps its
    // right edge, so a tighter fit clips the sleeve on that side.
    const distance = height / 2 / Math.tan(vFov / 2) / 0.62;
    perspective.position.set(0, 0, distance);
    perspective.updateProjectionMatrix();
  }, [camera, height]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(colorHex) },
      uSheen: { value: new THREE.Color("#ffffff") },
      uRimColor: { value: new THREE.Color("#b08d57") },
      uKeyDir: { value: new THREE.Vector3(-0.5, 0.75, 0.62).normalize() },
      uTime: { value: 0 },
      uWeaveScale: { value: 190 },
      uRoughness: { value: 0.65 },
      uPrintStyle: { value: PRINT_STYLE_IDS[printStyle] ?? 0 },
      uPrintColor: { value: new THREE.Color("#f7f4ed") },
      uPrintRect: {
        value: new THREE.Vector4(
          // Silhouette space is -1.3..1.3 in x and -1.35..1.3 in y; the shader
          // works in UV, so convert the print rect once here.
          (print.cx + 1.3) / 2.6,
          (print.cy + 1.35) / 2.65,
          print.halfW / 2.6,
          print.halfH / 2.65,
        ),
      },
      uPrintSeed: { value: seed },
      uTexture: { value: null as THREE.Texture | null },
      uHasTexture: { value: 0 },
      uTextureRect: {
        value: new THREE.Vector4(bounds.x, bounds.y, bounds.w, bounds.h),
      },
      uTextureBack: { value: null as THREE.Texture | null },
      uHasBack: { value: 0 },
      uPhotoFit: { value: 0 },
      uBackColor: { value: new THREE.Color(colorHex) },
    }),
    // Colour and print are pushed imperatively below, so they are not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [print, bounds],
  );

  // Colour changes animate rather than snap — a hard swap looks like a bug.
  const targetColor = useMemo(() => new THREE.Color(colorHex), [colorHex]);

  // On a traced garment the front is entirely photograph, so the colourway
  // only ever shows on the back — and there it should be the cloth's real
  // colour, not a swatch that happens to be stored against the product.
  const backColor = useMemo(
    () => new THREE.Color(traced?.clothHex ?? colorHex),
    [traced, colorHex],
  );

  /**
   * Loads the projected photograph, if there is one.
   *
   * The texture is held in state rather than written straight into the
   * material's uniforms. The previous version wrote to `material.current`
   * inside an effect and bailed out when the ref was not yet attached — and
   * because `textureUrl` never changes afterwards, that effect never ran
   * again, so the photograph was silently never fetched and every garment
   * rendered as flat colour. State has no such ordering dependency.
   */
  const texture = useProjectedTexture(textureUrl);
  const textureBack = useProjectedTexture(textureBackUrl);

  // Dispose the previous texture whenever it is replaced or the viewer closes;
  // an undisposed texture holds its GPU memory for the life of the page.
  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  /**
   * Traces the garment's outline out of the loaded photograph.
   *
   * Only a cut-out image can be traced. A flat JPEG has no alpha channel to
   * read an outline from, so it keeps the old behaviour — the photograph laid
   * over the parametric mesh — rather than being meshed into a rectangle.
   */
  useEffect(() => {
    const source = texture?.image as HTMLImageElement | undefined;
    if (!source) {
      setTraced(null);
      return;
    }

    let cancelled = false;
    let built: GarmentGeometryResult | null = null;

    // Tracing is a handful of O(w·h) passes over a ~220px image plus a mesh
    // build. Off the critical path so the viewer paints immediately with the
    // parametric garment and swaps once the real one is ready.
    const handle = window.setTimeout(() => {
      const result = silhouetteFromImage(source);
      if (cancelled || !result.ok) return;

      built = buildGarmentFromMask(
        result.mask,
        garmentHeight(garmentType),
        resolution,
      );
      if (cancelled) {
        built?.geometry.dispose();
        return;
      }
      setTraced(built ? { result: built, clothHex: result.mask.clothHex } : null);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
      built?.geometry.dispose();
      setTraced(null);
    };
  }, [texture, garmentType, resolution]);

  useFrame((state, delta) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uColor.value.lerp(targetColor, Math.min(delta * 6, 1));

    // Uniforms are synced here rather than in an effect so they cannot be
    // missed by a ref that was not ready when the effect ran.
    if (m.uniforms.uTexture.value !== texture) {
      m.uniforms.uTexture.value = texture;
      m.uniforms.uHasTexture.value = texture ? 1 : 0;
    }
    if (m.uniforms.uTextureBack.value !== textureBack) {
      m.uniforms.uTextureBack.value = textureBack;
      m.uniforms.uHasBack.value = textureBack ? 1 : 0;
    }
    if (m.uniforms.uTextureRect) {
      m.uniforms.uTextureRect.value.set(bounds.x, bounds.y, bounds.w, bounds.h);
    }
    m.uniforms.uPhotoFit.value = photoFit ? 1 : 0;
    m.uniforms.uBackColor.value.lerp(backColor, Math.min(delta * 6, 1));

    // A touch of life so it never looks like a frozen render.
    if (mesh.current) {
      mesh.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.35) * 0.012;
      mesh.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.015;
    }
  });

  return (
    <>
      {/* Shown for tops, traced or not. Most stock is photographed without a
          cut-out, so gating this on tracing meant the majority of garments
          never got a body at all. Trousers are excluded upstream: a leg is
          not a chest. */}
      {wornOnBody && <Mannequin height={height} />}

      <mesh ref={mesh} geometry={geometry} castShadow>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={fabricVertexShader}
        fragmentShader={fabricFragmentShader}
        side={THREE.DoubleSide}
      />
      </mesh>
    </>
  );
}

/** Soft elliptical shadow so the garment sits in the space. */
function GroundShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.52, 0]}>
      <planeGeometry args={[5, 5]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `}
        fragmentShader={/* glsl */ `
          varying vec2 vUv;
          void main(){
            // Squashed along x so it reads as a shadow cast by a hanging shape.
            vec2 p = (vUv - 0.5) * vec2(1.0, 2.1);
            float d = length(p);
            float a = smoothstep(0.42, 0.02, d) * 0.5;
            gl_FragColor = vec4(0.0, 0.0, 0.0, a);
          }
        `}
      />
    </mesh>
  );
}

export function GarmentViewer({
  garmentType,
  colorHex,
  printStyle,
  textureUrl,
  textureBackUrl,
  seed = 0,
  autoRotate = true,
  className,
}: GarmentViewerProps) {
  const [resolution, setResolution] = useState(150);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 768px)").matches;
    const cores = navigator.hardwareConcurrency ?? 4;
    if (narrow || cores <= 4) setResolution(96);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5.4], fov: 34 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <Garment
          garmentType={garmentType}
          colorHex={colorHex}
          printStyle={printStyle}
          textureUrl={textureUrl}
          textureBackUrl={textureBackUrl}
          seed={seed}
          resolution={resolution}
        />
        {/*
          The stage had no lights at all. It never needed them: the cloth is
          drawn by a custom shader that does its own lighting. The moment a
          standard material joined the scene — the form inside the garment —
          it rendered as a black silhouette, correctly lit by nothing.

          These do not touch the garment, which ignores scene lights entirely.
        */}
        <ambientLight intensity={0.55} color="#fff6ea" />
        <directionalLight position={[-2, 3, 4]} intensity={1.1} color="#fff3e2" />
        <directionalLight position={[3, 1, -2]} intensity={0.4} color="#cfe0f5" />

        <GroundShadow />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={3.2}
          maxDistance={8}
          // Stop short of the poles, where an orbit camera flips over.
          minPolarAngle={Math.PI * 0.18}
          maxPolarAngle={Math.PI * 0.82}
          autoRotate={autoRotate && !reduced}
          autoRotateSpeed={0.8}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  );
}

export default GarmentViewer;
