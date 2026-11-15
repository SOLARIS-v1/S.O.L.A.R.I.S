'use client';

/**
 * Living 3D anatomy built from BodyParts3D 4.0
 * (BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution 4.0 International).
 * Nodes in /models/astra-anatomy.glb are named "<system>--<part>" by scripts/build_anatomy.py.
 *
 * The heart beats at the crew member's measured heart rate and the lungs breathe at their measured
 * breathing rate. Layers fade, a focused system stays solid while the rest turns to glass.
 */
import { Environment, Lightformer, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { STATUS_LABEL, type Status } from '../../../data/solarisFormat';
import type { OrganDef } from '../../../data/solarisCatalog';
import { Minus, Plus, RotateCcw } from 'lucide-react';
const useTheme = () => ['dark', () => {}];
import s from './body3d.module.css';
import { installPrepWorker } from './prepClient';
import {
  cssColor,
  makeOrganMaterial,
  makeRealSkin,
  makeSkinMaterial,
  makeSkinUniforms,
  naturalOf,
  prepareOrganMesh,
} from './materials';
import {
  BODY,
  buildSuitGeometry,
  makeHelmetGeometry,
  makeHelmetMaterial,
  makePatchTexture,
  makeNeckRingMaterial,
  makeSuitMaterial,
  makeSuitUniforms,
  PREP_VERSION,
  prepareSkin,
} from './suit';

// Mesh preparation (suit, skin, organs) runs in a Web Worker from here on (see prepRunner.ts).
installPrepWorker();

export const MODEL_URL = '/models/astra-anatomy.glb';
// Start downloading the model as soon as this module loads, in parallel with React mounting the canvas.
useGLTF.preload(MODEL_URL);

export type BodyView = 'anatomy' | 'status';
/**
 * 'muscles': the full musculature, bones showing where no muscle covers them (with an x-ray lens at the pointer).
 * 'skeletal' / 'xray': glass skin, skeleton and internal systems visible.
 * 'suit': flight suit and helmet (legacy).
 */
export type SkinMode = 'muscles' | 'skeletal' | 'suit' | 'xray';
const SUIT_PARTS = new Set(['suit', 'helmet', 'neckring']);
/** Pointer over the stage, written by the DOM, read every frame. */
export interface LensPointer {
  /** Position over the canvas in CSS pixels. */
  x: number;
  y: number;
  /** A hovering pointer (mouse or pen) is over the canvas itself. */
  inside: boolean;
  /** Any pointer is anywhere over the stage, buttons included. */
  stage: boolean;
  /** performance.now() until which the pointer counts as over the body (Infinity while a system is hovered). */
  overUntil: number;
}
export interface Layers {
  skeleton: boolean;
  organs: boolean;
}

type Controls = React.ComponentRef<typeof OrbitControls>;

/**
 * Parts drawn see-through over what they enclose (their opacity), never picked and left out of focus framing: the
 * skull and rib cage over the brain, heart and lungs, the diaphragm over the liver and stomach. In the Muscles view
 * skull and ribs are solid bone and turn to glass only inside the x-ray lens.
 */
const SEE_THROUGH = new Map([['skeleton_skull', 0.28], ['skeleton_thorax', 0.28], ['diaphragm', 0.45]]);
/**
 * Parts that lie close under the skin (or run all over the body) and could show through it: under the suit they
 * draw only inside the x-ray lens, like the eyes. (Under the muscles every organ does.)
 */
const LENS_ONLY = new Set(['arteries', 'veins', 'lymph_nodes', 'thyroid', 'larynx']);
/** Parts spread over the whole body: focusing their system frames its main organs, not the whole figure. */
const NO_FRAME = new Set(['arteries', 'veins', 'lymph_nodes']);
const PIVOTED = new Set(['heart', 'lung_r', 'lung_l']);
/** Entrance: a scan plane sweeps head to toe revealing bones and organs, then the skin fades in. */
const SCAN = { duration: 1.9, top: 1.78, bottom: -0.02 } as const;
const ENTRANCE_DELAY = { skeleton: 0, organs: 0, muscles: 0, skin: SCAN.duration * 0.85 } as const;
/**
 * Muscles show in the Muscles view. Elsewhere they show only as a thin veil over the bones while their system is
 * focused or previewed. They draw after the organs and bones (render order) so the veil blends over them.
 */
const MUSCLE_VEIL = 0.2;
const MUSCLE_ORDER = 4;
/** Sites of bone loss in space: when the musculo system is flagged they glow at full strength, the rest at half. */
const BONE_LOSS = new Set(['skeleton_spine', 'skeleton_hips']);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
/** How long a system previewed from the readings list stays on show after the pointer leaves its row. */
const PEEK_HOLD = 280;
/** Grace before the hover clears, so the tooltip and highlight don't blink across small gaps between organs. */
const HOVER_GRACE = 110;

/** Soft horizontal ring used for the scan sweep and the floor platform. */
function makeRingMaterial(color: string, ringAt = 0.82) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0 }, uRing: { value: ringAt } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uRing;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float ring = smoothstep(0.035, 0.0, abs(r - uRing));
        float fill = (1.0 - smoothstep(0.0, uRing, r)) * 0.16;
        gl_FragColor = vec4(uColor, (ring + fill) * uAlpha);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

interface Part {
  mesh: THREE.Mesh;
  system: string;
  part: string;
  layer: 'skin' | 'muscles' | keyof Layers;
  baseOpacity: number;
  opacity: number;
  glow: number;
  /** The material this mount made for it, freed on unmount. */
  own?: THREE.Material;
}

/** Heartbeat curve: a strong "lub" and a softer "dub" per cycle. */
const gauss = (x: number, c: number, w: number) => Math.exp(-((x - c) ** 2) / (2 * w * w));
function beat(phase: number) {
  return gauss(phase, 0.06, 0.035) + 0.55 * gauss(phase, 0.24, 0.04);
}

const noRaycast = () => {};
const meshRaycast = THREE.Mesh.prototype.raycast;
/**
 * Three's raycaster ignores `visible`: a faded-out layer must not catch hovers or clicks. The flag lives on the mesh
 * (not in a closure) because the cached scene outlives any one set of parts.
 */
function pickableRaycast(this: THREE.Mesh, raycaster: THREE.Raycaster, hits: THREE.Intersection[]) {
  if (!this.userData.pickable) return;
  // Pick against the lighter original mesh (kept by the organ preparation), not the refined one on screen.
  const pick = this.userData.pickGeometry as THREE.BufferGeometry | undefined;
  if (!pick) return meshRaycast.call(this, raycaster, hits);
  const shown = this.geometry;
  this.geometry = pick;
  try {
    meshRaycast.call(this, raycaster, hits);
  } finally {
    this.geometry = shown;
  }
}

/**
 * Frees GPU resources once React is really done with them: on unmount, or when replaced. Development StrictMode
 * re-runs effects on a live component, which must not free what is still drawn.
 */
function useDisposal<T>(value: T, dispose: (v: T) => void) {
  const current = useRef(value);
  const token = useRef(0);
  useEffect(() => {
    current.current = value;
    const mine = ++token.current;
    return () => {
      window.setTimeout(() => {
        // Reads the refs later on purpose: by then a re-run (StrictMode) or a replacement has updated them.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (token.current === mine || current.current !== value) dispose(value);
      }, 0);
    };
  }, [value, dispose]);
}
const disposeMaterial = (m: THREE.Material) => m.dispose();
const disposeParts = (parts: Part[]) => {
  for (const p of parts) p.own?.dispose();
};
const disposeSuit = (suit: { materials: Record<string, THREE.Material>; uniforms: { uPatch: { value: THREE.Texture } } } |
  null) => {
  if (!suit) return;
  for (const m of Object.values(suit.materials)) m.dispose();
  suit.uniforms.uPatch.value.dispose();
};

/**
 * The system under the pointer. While a system is focused it wins over the glass ones in front of it. In the Muscles
 * view (`throughMuscles`) the x-ray lens at the pointer cuts the muscles in front away: what shows there, an organ or
 * a bone, is what gets picked, as under the suit; a muscle only when nothing else is behind it.
 */
function pickSystem(e: ThreeEvent<PointerEvent | MouseEvent>, focus: string | null, throughMuscles: boolean) {
  let first: string | null = null;
  let muscle: string | null = null;
  for (const hit of e.intersections) {
    const system = hit.object.userData?.system as string | undefined;
    if (!system || system === 'skin') continue;
    if (throughMuscles && hit.object.userData.muscle) {
      muscle ??= system;
      continue;
    }
    if (system === focus) return system;
    first ??= system;
  }
  return first ?? muscle;
}

/** Status word for a system: grey "No recent reading" only when it is stale and nothing is flagged. */
export function statusWord(st: Status, stale: boolean) {
  return stale && st === 'ok' ? 'No recent reading' : STATUS_LABEL[st];
}

/* ------------------------------------------------------------------ model */
interface ModelProps {
  view: BodyView;
  layers: Layers;
  organStatus: Record<string, Status>;
  grey: Record<string, boolean>;
  focus: string | null;
  hover: string | null;
  /** A system hovered outside the canvas (readings list, keyboard): shown like a light focus, camera unmoved. */
  peekAt: string | null;
  heartRate: number;
  breathRate: number;
  reduced: boolean;
  onPick: (id: string | null, e?: PointerEvent) => void;
  onClickSystem: (id: string, e: MouseEvent) => void;
  onReady: (boxes: Record<string, THREE.Box3>) => void;
  skinMode: SkinMode;
  pointer: React.MutableRefObject<LensPointer>;
  crewName: string;
  /** Set while anything in the figure is still fading, so the floor shadow keeps up. */
  changing: React.MutableRefObject<boolean>;
  /** Every shader is compiled: the figure can show. */
  onCompiled: () => void;
}

/** Lens radius: metres on the body, clamped to CSS pixels. */
const LENS = { metres: 0.14, min: 52, max: 95 } as const;

function Model({ view, layers, organStatus, grey, focus, hover, peekAt, heartRate, breathRate, reduced, onPick,
  onClickSystem, onReady, skinMode, pointer, crewName, changing, onCompiled }: ModelProps) {
  const { scene } = useGLTF(MODEL_URL);
  const [theme] = useTheme();
  const skinMat = useMemo(makeSkinMaterial, []);
  const skinUniforms = useMemo(() => makeSkinUniforms(), []);
  const realSkin = useMemo(() => makeRealSkin(skinUniforms), [skinUniforms]);
  // Flight suit: built only when requested; skipped when running in muscle or skeletal mode.
  const suit = useMemo(() => {
    const skin = scene.getObjectByName('skin--skin') as THREE.Mesh | undefined;
    if (!skin) return null;
    if (skinMode !== 'suit') {
      prepareSkin(skin);
      return null;
    }
    let shell = scene.getObjectByName('skin--suit') as THREE.Mesh | undefined;
    if (shell && shell.userData.prepVersion !== PREP_VERSION) {
      // Built by older code and kept in memory: rebuild from the original skin mesh.
      const { geometry, shoulder } = buildSuitGeometry(skin);
      shell.geometry.dispose();
      shell.geometry = geometry;
      shell.userData.shoulder = shoulder;
      shell.userData.prepVersion = PREP_VERSION;
    }
    if (!shell) {
      const { geometry, shoulder } = buildSuitGeometry(skin);
      shell = new THREE.Mesh(geometry);
      shell.name = 'skin--suit';
      shell.userData.shoulder = shoulder;
      shell.userData.prepVersion = PREP_VERSION;
      shell.renderOrder = 11;
      const { center, radii } = BODY.helmet;
      const helmet = new THREE.Mesh(makeHelmetGeometry());
      helmet.name = 'skin--helmet';
      helmet.position.copy(center);
      helmet.scale.copy(radii);
      helmet.renderOrder = 12;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.012, 20, 96));
      ring.name = 'skin--neckring';
      ring.position.set(center.x, BODY.helmet.bottom - 0.002, center.z);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(1, 1.06, 1);
      ring.renderOrder = 12;
      for (const o of [shell, helmet, ring]) o.raycast = noRaycast;
      scene.add(shell, helmet, ring);
    }
    // After the suit: the suit reads the original mesh, this replaces it with the smoothed, subdivided one.
    prepareSkin(skin);
    // Set on every mount, not only at creation: the scene is cached across mounts and hot reloads.
    for (const name of ['skin--skin', 'skin--suit', 'skin--helmet', 'skin--neckring']) {
      const o = scene.getObjectByName(name);
      if (o) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    }
    const uniforms = makeSuitUniforms(skinUniforms, shell.userData.shoulder as THREE.Vector2, makePatchTexture());
    return {
      uniforms,
      materials: {
        suit: makeSuitMaterial(uniforms),
        helmet: makeHelmetMaterial(uniforms),
        neckring: makeNeckRingMaterial(uniforms),
      } as Record<string, THREE.Material>,
    };
  }, [scene, skinUniforms, skinMode]);
  // Name tape follows the selected crew member.
  useEffect(() => {
    if (!suit) return;
    const prev = suit.uniforms.uPatch.value;
    suit.uniforms.uPatch.value = makePatchTexture(crewName);
    prev.dispose();
  }, [suit, crewName]);
  const lens = useRef({ x: 0, y: 0 });
  const scanMat = useMemo(() => makeRingMaterial('#86a9f5'), []);
  const scanRing = useRef<THREE.Mesh>(null);
  // World-space clipping plane: keeps everything at or above its height (y >= h).
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -SCAN.top), []);
  const scanned = useRef(false);
  const life = useRef(0);
  /** How solid the muscles are (the Muscles view): once they cover everything, the organs need only the lens. */
  const muscleCover = useRef(0);
  /** A system previewed from the readings list (or keyboard), held briefly so moving between rows doesn't flash. */
  const peek = useRef<{ id: string | null; until: number }>({ id: null, until: 0 });
  const { camera } = useThree();
  const events = useThree((st) => st.events);

  // Shaders compile in the background (KHR_parallel_shader_compile) before anything is drawn: drawing a program that
  // isn't ready blocks the whole page, for seconds per shader on Windows/Direct3D. See the top of the frame loop.
  const compiled = useRef<'idle' | 'pending' | 'done'>('idle');

  // The scan ring lives on layer 1: the main camera sees it, the contact-shadow camera (layer 0) does not.
  useEffect(() => {
    camera.layers.enable(1);
    scanRing.current?.layers.set(1);
  }, [camera]);

  const parts = useMemo<Part[]>(() => {
    const out: Part[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const [system, part] = (mesh.name || mesh.parent?.name || '').split('--');
      if (!system || !part) return;
      // Animated organs scale around their own centre (done once; the cached scene is reused).
      if (PIVOTED.has(part) && !mesh.userData.pivoted) {
        mesh.geometry.computeBoundingBox();
        const c = mesh.geometry.boundingBox!.getCenter(new THREE.Vector3());
        mesh.geometry.translate(-c.x, -c.y, -c.z);
        // Move the node by the same offset expressed in its parent's space (respects the node's scale and rotation).
        mesh.position.add(c.multiply(mesh.scale).applyQuaternion(mesh.quaternion));
        mesh.userData.baseScale = mesh.scale.clone();
      }
      const layer: Part['layer'] = system === 'skin' ? 'skin'
        : system !== 'musculo' ? 'organs' : part.startsWith('muscle') ? 'muscles' : 'skeleton';
      mesh.userData = { ...mesh.userData, system, part, pivoted: true, muscle: layer === 'muscles' };
      const p: Part = { mesh, system, part, layer, baseOpacity: SEE_THROUGH.get(part) ?? 1, opacity: 0, glow: 0 };
      if (system === 'skin' && SUIT_PARTS.has(part)) {
        if (!suit) return;
        mesh.material = suit.materials[part];
      } else if (system === 'skin') {
        mesh.material = part === 'skin_glass' ? skinMat : realSkin;
        mesh.renderOrder = 10;
        mesh.raycast = noRaycast;
      } else {
        prepareOrganMesh(mesh, part);
        // Every organ gets the skin's lens uniforms, so all organs share one shader program (each extra program cost
        // seconds of compile time). Under the suit the eyes and LENS_ONLY parts draw only inside the x-ray lens, under
        // the muscles every organ does, and the lens cuts the muscles (see makeOrganMaterial).
        p.own = makeOrganMaterial(part, clip, skinUniforms);
        mesh.material = p.own;
        mesh.userData.pickable = false;
        if (SEE_THROUGH.has(part)) {
          mesh.renderOrder = 5;
          mesh.raycast = noRaycast;
        } else mesh.raycast = pickableRaycast;
        if (layer === 'muscles') mesh.renderOrder = MUSCLE_ORDER;
      }
      out.push(p);
    });
    // Two skins share one geometry: the real one and a glass twin for x-ray and focus views (made once).
    const real = out.find((x) => x.part === 'skin');
    if (real && !out.some((x) => x.part === 'skin_glass')) {
      const glass = real.mesh.clone();
      glass.name = 'skin--skin_glass';
      glass.userData = { ...real.mesh.userData, part: 'skin_glass' };
      glass.material = skinMat;
      glass.raycast = noRaycast;
      glass.castShadow = false;
      glass.receiveShadow = false;
      real.mesh.parent?.add(glass);
      out.push({ mesh: glass, system: 'skin', part: 'skin_glass', layer: 'skin', baseOpacity: 1, opacity: 0, glow: 0 });
    }
    // Keep the glass twin on the real skin's current mesh: the skin is rebuilt when its preparation changes.
    const glassPart = out.find((x) => x.part === 'skin_glass');
    if (real && glassPart) glassPart.mesh.geometry = real.mesh.geometry;
    return out;
  }, [scene, skinMat, realSkin, skinUniforms, clip, suit]);

  // Free the GPU side of everything made for this mount (the cached scene gets fresh materials on the next one).
  useDisposal(parts, disposeParts);
  useDisposal(skinMat, disposeMaterial);
  useDisposal(realSkin, disposeMaterial);
  useDisposal(scanMat, disposeMaterial);
  useDisposal(suit, disposeSuit);

  useEffect(() => {
    const measure = () => {
      const boxes: Record<string, THREE.Box3> = {};
      scene.updateMatrixWorld(true);
      for (const p of parts) {
        if (p.system === 'skin' || SEE_THROUGH.has(p.part) || NO_FRAME.has(p.part)) continue;
        const b = new THREE.Box3().setFromObject(p.mesh);
        boxes[p.system] = boxes[p.system] ? boxes[p.system].union(b) : b;
      }
      onReady(boxes);
    };
    measure();
    // Measure again once the worker has swapped in the refined organs (the lungs change shape the most).
    const later = window.setTimeout(measure, 2500);
    return () => window.clearTimeout(later);
  }, [parts, scene, onReady]);

  const palette = useMemo(
    () => ({
      ok: new THREE.Color(cssColor('--ok', '#4cc38a')),
      watch: new THREE.Color(cssColor('--watch', '#e3ab3f')),
      act: new THREE.Color(cssColor('--act', '#ec6a5e')),
      none: new THREE.Color(cssColor('--text-3', '#7b8592')),
      accent: new THREE.Color(cssColor('--accent', '#86a9f5')),
    }),
    // Re-read the CSS tokens when the theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );
  useEffect(() => {
    scanMat.uniforms.uColor.value.copy(palette.accent);
  }, [scanMat, palette]);

  useEffect(() => {
    const white = new THREE.Color('#ffffff');
    skinMat.uniforms.uColor.value.set(view === 'status' ? palette.accent : new THREE.Color('#f0c4a6'));
    for (const p of parts) {
      if (p.system === 'skin') continue;
      const m = p.mesh.material as THREE.MeshStandardMaterial;
      const st = organStatus[p.system] ?? 'ok';
      if (view === 'status') m.color.copy(grey[p.system] ? palette.none : palette[st]).lerp(white, 0.06);
      else m.color.set(naturalOf(p.part));
    }
  }, [parts, view, organStatus, grey, palette, skinMat]);

  // What can be picked changes with layers and modes: re-pick under a resting pointer once the frame has caught up.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (pointer.current?.inside) events.update?.();
    }, 60);
    return () => window.clearTimeout(id);
  }, [layers, skinMode, view, focus, events, pointer]);

  useFrame((state, delta) => {
    if (compiled.current !== 'done') {
      // Wait for the environment map (it is part of every lit shader), then compile everything, hidden or not.
      if (compiled.current === 'idle' && state.scene.environment) {
        compiled.current = 'pending';
        void state.gl.compileAsync(state.scene, state.camera).then(() => {
          compiled.current = 'done';
          if (scanRing.current) scanRing.current.visible = !scanned.current;
          onCompiled();
        });
      }
      for (const p of parts) p.mesh.visible = false;
      if (scanRing.current) scanRing.current.visible = false;
      return;
    }
    const t = state.clock.elapsedTime;
    const now = performance.now();
    // Entrance clock advances by at most 0.1 s per frame: a shader-compile stall pauses it instead of skipping it.
    life.current += Math.min(delta, 0.1);
    if (reduced && !scanned.current) life.current = Math.max(life.current, ENTRANCE_DELAY.skin + 0.01);
    const age = life.current;
    let moving = false;

    if (!scanned.current) {
      moving = true;
      // Advance by capped steps so a slow first frame (shader compile) can't skip the sweep.
      const p = reduced ? 1 : Math.min(1, age / SCAN.duration);
      const h = THREE.MathUtils.lerp(SCAN.top, SCAN.bottom, easeInOut(p));
      clip.constant = -h;
      scanMat.uniforms.uAlpha.value =
        0.9 * THREE.MathUtils.smoothstep(p, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(p, 0.82, 1));
      if (scanRing.current) scanRing.current.position.y = h;
      if (p >= 1) {
        // Park the plane far below the floor rather than removing it: removing it would force a shader recompile.
        scanned.current = true;
        clip.constant = 100;
        if (scanRing.current) scanRing.current.visible = false;
      }
    }
    const ptr = pointer.current;
    // A system hovered from outside the canvas (the readings list, the keyboard) is shown like a light focus.
    const pk = peek.current;
    if (peekAt) {
      pk.id = peekAt;
      pk.until = Infinity;
    } else if (pk.until === Infinity) pk.until = now + PEEK_HOLD;
    const peekId = !focus && now < pk.until ? pk.id : null;
    const shown = focus ?? peekId;

    // X-ray lens follows the pointer with a little lag, and opens or closes smoothly.
    const dpr = state.gl.getPixelRatio();
    const covered = view === 'anatomy' && !shown;
    const suitWanted = skinMode === 'suit' && covered;
    const muscleWanted = skinMode === 'muscles' && covered;
    // The skin runs under the suit: its inner wall lines the lens cutaway. In the Muscles view it is not drawn.
    const realWanted = suitWanted;
    const lensWanted = suitWanted || muscleWanted;
    // The lens opens only while the pointer is over the body, never over empty stage.
    const lensOn = ptr && lensWanted && ptr.inside && now < ptr.overUntil && scanned.current ? 1 : 0;
    const u = skinUniforms;
    if (ptr) {
      if (u.uLens.value < 0.02) lens.current = { x: ptr.x, y: ptr.y };
      lens.current.x = THREE.MathUtils.damp(lens.current.x, ptr.x, 16, delta);
      lens.current.y = THREE.MathUtils.damp(lens.current.y, ptr.y, 16, delta);
    }
    u.uLens.value = THREE.MathUtils.damp(u.uLens.value, lensOn, 7, delta);
    u.uLensPos.value.set(lens.current.x * dpr, (state.size.height - lens.current.y) * dpr);
    // A fixed size on the body (about a hand's width), measured at the orbit centre, so zooming in doesn't
    // swallow the whole figure.
    const cam = state.camera as THREE.PerspectiveCamera;
    const centre = (state.controls as unknown as { target?: THREE.Vector3 } | null)?.target ?? HOME_TARGET;
    const ppm = state.size.height / (2 * cam.position.distanceTo(centre) * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    const radius = THREE.MathUtils.clamp(LENS.metres * ppm, LENS.min, LENS.max);
    u.uLensR.value = radius * dpr * (1 + (reduced ? 0 : 0.012 * Math.sin(t * 1.8)));

    // Under the suit with the lens shut nothing inside the body can be seen: it is not drawn at all (about 300k
    // triangles). Under the muscles the same goes for the organs. Picking still works (the raycaster ignores
    // `visible`), so pointing opens the lens.
    const lensShut = lensOn === 0 && u.uLens.value < 0.002;
    const sealed = realWanted && lensShut && u.uFade.value > 0.995;
    const organsSealed = muscleWanted && lensShut && muscleCover.current > 0.995;
    let cover = 0;
    // Heartbeat and breathing are motion: still under reduced motion.
    const heartScale = reduced ? 1 : 1 + 0.05 * beat(((t * Math.max(30, heartRate)) / 60) % 1);
    const breath = reduced ? 0 : 0.5 - 0.5 * Math.cos((2 * Math.PI * t * Math.max(6, breathRate)) / 60);

    for (const p of parts) {
      if (p.system === 'skin' && SUIT_PARTS.has(p.part)) {
        const target = suitWanted && age > ENTRANCE_DELAY.skin ? 1 : 0;
        if (Math.abs(target - p.opacity) > 0.004) moving = true;
        p.opacity = THREE.MathUtils.damp(p.opacity, target, 4, delta);
        p.mesh.visible = p.opacity > 0.01;
        if (suit) {
          suit.uniforms.uFade.value = p.opacity;
          suit.uniforms.uBreath.value = breath;
        }
        u.uCover.value = p.opacity;
        continue;
      }
      if (p.system === 'skin') {
        // Real skin and glass skin cross-fade: real skin under the suit, glass for X-ray, Status and focus, neither
        // in the Muscles view.
        const isReal = p.part === 'skin';
        let target = 0;
        if (age > ENTRANCE_DELAY.skin) target = isReal ? (realWanted ? 1 : 0) : lensWanted ? 0 : shown ? 0.18 : 1;
        if (Math.abs(target - p.opacity) > 0.004) moving = true;
        p.opacity = THREE.MathUtils.damp(p.opacity, target, isReal ? 4 : 6, delta);
        p.mesh.visible = p.opacity > 0.01;
        if (isReal) u.uFade.value = p.opacity;
        else skinMat.uniforms.uFade.value = p.opacity;
        continue;
      }
      // The system on show stays visible even when its layer is switched off. Muscles belong to the Muscles view.
      const entered = age > ENTRANCE_DELAY[p.layer];
      const muscle = p.layer === 'muscles';
      const on = (muscle ? muscleWanted : layers[p.layer as keyof Layers]) || p.system === shown;
      const live = on && entered;
      // In the Muscles view skull and ribs are solid bone (glass only inside the lens).
      const bare = muscleWanted && p.layer === 'skeleton';
      let target = live ? (bare ? 1 : p.baseOpacity) : 0;
      if (live && muscle && !muscleWanted) target = Math.min(target, MUSCLE_VEIL);
      // Under the suit the eyeballs and the parts close under the skin draw only inside the x-ray lens (their
      // material clips to it); under the muscles every organ does.
      const lensHidden = suitWanted ? p.system === 'eyes' || LENS_ONLY.has(p.part)
        : muscleWanted && p.layer === 'organs' && p.system !== 'eyes';
      if (live && shown && p.system !== shown) target = Math.min(target, focus ? 0.1 : 0.16);
      p.mesh.userData.pickable = scanned.current && (target > 0.05 || (lensHidden && live));
      if (Math.abs(target - p.opacity) > 0.004) moving = true;
      p.opacity = THREE.MathUtils.damp(p.opacity, target, 6, delta);
      if (muscle) cover = Math.max(cover, p.opacity);
      p.mesh.visible = p.opacity > 0.01 && !sealed && !(organsSealed && lensHidden);

      const m = p.mesh.material as THREE.MeshStandardMaterial;
      const lensOnly = m.userData.uLensOnly as { value: number } | undefined;
      if (lensOnly) lensOnly.value = lensHidden ? 1 : 0;
      // The lens cuts the near half of the muscles away, and turns skull and ribs to glass, over the organs.
      const lensCut = m.userData.uLensCut as { value: number } | undefined;
      if (lensCut) lensCut.value = !muscleWanted ? 0 : muscle ? 1 : bare ? 1 - (SEE_THROUGH.get(p.part) ?? 1) : 0;
      m.opacity = p.opacity;
      // Parts stay in the transparent pass for good: flipping `transparent` selects a different shader program,
      // which meant a multi-second recompile on Windows every time a fade finished. Solid parts write depth.
      const solid = p.opacity > 0.985;
      if (m.depthWrite !== solid) m.depthWrite = solid;

      const st = organStatus[p.system] ?? 'ok';
      let g = 0;
      if (view === 'anatomy' && st !== 'ok') {
        // Bones and muscles are large and bright: half strength, except at the sites of bone loss (and less still
        // on the muscles of the Muscles view, which cover the whole figure).
        const k = p.system === 'musculo' && !BONE_LOSS.has(p.part) ? (muscle && muscleWanted ? 0.3 : 0.5) : 1;
        g = (st === 'act' ? 0.3 : 0.16) * k * (reduced ? 0.8 : 0.6 + 0.4 * Math.sin(t * 2.6));
      }
      // In the Muscles view bones and muscles are the whole figure: pointing at them only lifts it a little.
      if (hover === p.system) g = Math.max(g, muscleWanted && p.system === 'musculo' ? 0.12 : 0.45);
      if (focus === p.system) g = Math.max(g, 0.18);
      p.glow = THREE.MathUtils.damp(p.glow, g, 10, delta);
      // Healthy parts brighten in their own colour; flagged parts glow in their status colour.
      m.emissive.copy(st === 'ok' ? m.color : palette[st]);
      m.emissiveIntensity = p.glow;

      const base = p.mesh.userData.baseScale as THREE.Vector3 | undefined;
      if (base && p.part === 'heart') p.mesh.scale.copy(base).multiplyScalar(heartScale);
      else if (base) p.mesh.scale.set(base.x * (1 + 0.035 * breath), base.y * (1 + 0.02 * breath), base.z * (1 + 0.045 * breath));
    }
    muscleCover.current = cover;
    changing.current = moving;
  });

  // In the Muscles view the lens at the pointer shows what lies under the muscles: pick that.
  const through = skinMode === 'muscles' && view === 'anatomy' && focus === null;

  return (
    <>
      <mesh ref={scanRing} material={scanMat} rotation-x={-Math.PI / 2} scale={[1.25, 0.62, 1]} raycast={noRaycast}
        renderOrder={20}>
        <planeGeometry args={[1.3, 1.3]} />
      </mesh>
      <primitive
        object={scene}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPick(pickSystem(e, focus, through), e.nativeEvent);
        }}
        // Fires on every new face as well as on leaving the body: the caller clears after a short grace.
        onPointerOut={() => onPick(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const touch = (e.nativeEvent as PointerEvent).pointerType === 'touch';
          if (e.delta > (touch ? 10 : 6)) return; // a drag, not a click
          const id = pickSystem(e, focus, through);
          if (id) onClickSystem(id, e.nativeEvent);
        }}
      />
    </>
  );
}

/**
 * Soft contact shadow: the scene is rendered from just above the floor looking up, keeping the nearest surface
 * (depth-tested, unlike drei's ContactShadows, which lets whichever triangle draws last win and smears a single
 * large mesh like the suit), darker the closer it is to the floor, then blurred twice. Dark under the boots,
 * fading softly toward the shoulders' outline. Floor planes sit below the camera and the scan ring is on layer 1,
 * so neither shows up in it.
 */
const SHADOW = { size: 2.4, far: 1.2, resolution: 512, lift: 0.003 } as const;

interface ShadowKit {
  target: THREE.WebGLRenderTarget;
  temp: THREE.WebGLRenderTarget;
  camera: THREE.OrthographicCamera;
  depth: THREE.MeshDepthMaterial;
  hBlur: FullScreenQuad;
  vBlur: FullScreenQuad;
}

function renderFloorShadow(gl: THREE.WebGLRenderer, scene: THREE.Scene, kit: ShadowKit, plane: THREE.Mesh | null) {
  const prevTarget = gl.getRenderTarget();
  const prevAlpha = gl.getClearAlpha();
  const prevColor = gl.getClearColor(new THREE.Color());
  const { background, overrideMaterial } = scene;
  if (plane) plane.visible = false;
  scene.background = null;
  scene.overrideMaterial = kit.depth;
  gl.setClearColor(0x000000, 0);
  gl.setRenderTarget(kit.target);
  gl.clear();
  gl.render(scene, kit.camera);
  scene.overrideMaterial = overrideMaterial;
  scene.background = background;
  const h = kit.hBlur.material as THREE.ShaderMaterial;
  const v = kit.vBlur.material as THREE.ShaderMaterial;
  for (const k of [2.4, 1.2]) {
    h.uniforms.tDiffuse.value = kit.target.texture;
    h.uniforms.h.value = k / SHADOW.resolution;
    gl.setRenderTarget(kit.temp);
    kit.hBlur.render(gl);
    v.uniforms.tDiffuse.value = kit.temp.texture;
    v.uniforms.v.value = k / SHADOW.resolution;
    gl.setRenderTarget(kit.target);
    kit.vBlur.render(gl);
  }
  gl.setRenderTarget(prevTarget);
  gl.setClearColor(prevColor, prevAlpha);
  if (plane) plane.visible = true;
}

function FloorShadow({ changing, opacity = 0.8, color = '#0b1222' }: { changing: React.RefObject<boolean>;
  opacity?: number; color?: string }) {
  const plane = useRef<THREE.Mesh>(null);
  const tick = useRef(0);
  const kit = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(SHADOW.resolution, SHADOW.resolution);
    const temp = new THREE.WebGLRenderTarget(SHADOW.resolution, SHADOW.resolution);
    target.texture.generateMipmaps = temp.texture.generateMipmaps = false;
    const half = SHADOW.size / 2;
    const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0, SHADOW.far);
    camera.position.set(0, SHADOW.lift, 0);
    camera.rotation.x = Math.PI / 2; // look straight up; screen up is +Z
    camera.updateMatrixWorld();
    const depth = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.uColor = { value: new THREE.Color(color) };
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform vec3 uColor;\nvoid main() {')
        .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( uColor, pow( 1.0 - fragCoordZ, 1.8 ) );');
    };
    const hBlur = new FullScreenQuad(new THREE.ShaderMaterial(HorizontalBlurShader));
    const vBlur = new FullScreenQuad(new THREE.ShaderMaterial(VerticalBlurShader));
    return { target, temp, camera, depth, hBlur, vBlur };
  }, [color]);
  useEffect(
    () => () => {
      kit.target.dispose();
      kit.temp.dispose();
      kit.depth.dispose();
      kit.hBlur.dispose();
      kit.vBlur.dispose();
    },
    [kit],
  );

  useFrame((state) => {
    // The camera that films it never moves: refresh often while the figure fades, rarely while it only breathes.
    if (tick.current++ % (changing.current ? 2 : 12)) return;
    renderFloorShadow(state.gl, state.scene, kit, plane.current);
  });

  return (
    // Texture u runs along +X and v along +Z (the camera's screen up), hence the Y flip after laying it flat.
    <mesh ref={plane} position-y={SHADOW.lift} rotation-x={-Math.PI / 2} scale={[1, -1, 1]} raycast={noRaycast}>
      <planeGeometry args={[SHADOW.size, SHADOW.size]} />
      <meshBasicMaterial map={kit.target.texture} transparent opacity={opacity} depthWrite={false}
        side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Floor platform: a faint ring and the contact shadow. */
function Platform({ changing }: { changing: React.RefObject<boolean> }) {
  const [theme] = useTheme();
  const ring = useMemo(() => {
    const m = makeRingMaterial('#86a9f5', 0.9);
    m.uniforms.uAlpha.value = 0.22;
    return m;
  }, []);
  // Re-read the accent token when the theme changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const accent = useMemo(() => cssColor('--accent', '#86a9f5'), [theme]);
  useEffect(() => {
    ring.uniforms.uColor.value.set(accent);
  }, [ring, accent]);
  useDisposal(ring, disposeMaterial);
  return (
    <>
      <mesh material={ring} rotation-x={-Math.PI / 2} position-y={0.002} scale={[1, 0.62, 1]} raycast={noRaycast}>
        <planeGeometry args={[1.4, 1.4]} />
      </mesh>
      <FloorShadow changing={changing} />
    </>
  );
}

/* ------------------------------------------------------------------ camera */
/** Orbit centre before the first fit, and the fallback for the lens size. */
const HOME_TARGET = new THREE.Vector3(0, 0.84, 0);
/** Default three-quarter view: from the front, a little to the left and above. */
const HOME_DIR = new THREE.Vector3(-2.9, 0.86, 7.2).normalize();
const HOME_SPHERICAL = new THREE.Spherical().setFromVector3(HOME_DIR);
/** The camera starts far out along the home direction, then glides in. */
const START = HOME_TARGET.clone().addScaledVector(HOME_DIR, 6.8).toArray();
const DIST = { min: 0.55, max: 7, focusMin: 0.55 } as const;
const POLAR = { min: 0.25, max: Math.PI * 0.6 } as const;
/** The whole figure, helmet and boots included. */
const BODY_BOX = new THREE.Box3(new THREE.Vector3(-0.34, -0.03, -0.2), new THREE.Vector3(0.34, 1.86, 0.2));
/** The orbit centre stays on the figure: zoomToCursor moves it, but never off the body. */
const TARGET_BOUNDS = new THREE.Box3(new THREE.Vector3(-0.28, 0.05, -0.16), new THREE.Vector3(0.28, 1.8, 0.16));
/** Room the overlays take over the canvas, in CSS pixels: mode buttons above, the hint below, camera buttons beside. */
const FRAME_PAD = { top: 54, bottom: 30, side: 50 } as const;
const IDLE_AFTER = 6; // seconds without input before the slow turntable resumes
const GLIDE_RATE = 4.5;

export type CameraCommand =
  | { kind: 'frame'; box: THREE.Box3 | null } // a system, or the whole body (null), keeping the viewing angle
  | { kind: 'reset' } // whole body from the default three-quarter view
  | { kind: 'zoom'; factor: number };
interface CameraChannel {
  seq: number;
  cmd: CameraCommand;
}
interface Goal {
  target: THREE.Vector3;
  radius: number;
  theta: number | null;
  phi: number | null;
}

/** Scratch vectors for framing and gliding (one camera rig per page). */
const V = {
  centre: new THREE.Vector3(),
  corner: new THREE.Vector3(),
  right: new THREE.Vector3(),
  up: new THREE.Vector3(),
  fwd: new THREE.Vector3(),
  offset: new THREE.Vector3(),
  dir: new THREE.Vector3(),
  want: new THREE.Vector3(),
  sph: new THREE.Spherical(),
};
/**
 * Orbit centre and distance that frame `box` seen from `dir` (centre to camera), in the canvas area left free by
 * the overlays. Works for the tiny eyes and for the full-height skeleton alike.
 */
function fit(box: THREE.Box3, dir: THREE.Vector3, cam: THREE.PerspectiveCamera, w: number, h: number, minDist: number,
  out: Goal) {
  const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  box.getCenter(V.centre);
  V.fwd.copy(dir).negate();
  V.right.crossVectors(V.fwd, cam.up).normalize();
  V.up.crossVectors(V.right, V.fwd).normalize();
  const usableH = Math.max(80, h - FRAME_PAD.top - FRAME_PAD.bottom);
  const usableW = Math.max(80, w - 2 * FRAME_PAD.side);
  let need = 0;
  for (let i = 0; i < 8; i++) {
    V.corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
      .sub(V.centre);
    // A corner nearer the camera by `toward` fits when its pixel offset stays inside the free area.
    const toward = V.corner.dot(dir);
    const x = Math.abs(V.corner.dot(V.right));
    const y = Math.abs(V.corner.dot(V.up));
    need = Math.max(need, toward + (y * h) / (tanV * usableH), toward + (x * h) / (tanV * usableW));
  }
  out.radius = THREE.MathUtils.clamp(need * 1.04, minDist, DIST.max);
  // Nudge the orbit centre so the box sits in the middle of the free area rather than of the whole canvas.
  const ppm = h / (2 * out.radius * tanV);
  out.target.copy(V.centre).addScaledVector(V.up, (FRAME_PAD.top - FRAME_PAD.bottom) / 2 / ppm);
  return out;
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Camera: glides along the orbit (never through the body) to framing commands, keeps the orbit centre on the figure
 * while the user zooms toward the pointer, and turns slowly when nobody is using it. A drag or scroll always wins.
 */
function Rig({ channel, controls, focused, hovering, reduced, pointer, onLimits, onDrag }: {
  channel: React.RefObject<CameraChannel>;
  controls: React.RefObject<Controls | null>;
  focused: boolean;
  hovering: boolean;
  reduced: boolean;
  pointer: React.RefObject<LensPointer>;
  onLimits: (atMin: boolean, atMax: boolean) => void;
  /** The user starts or stops turning or zooming the body. */
  onDrag: (dragging: boolean) => void;
}) {
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  const size = useThree((st) => st.size);
  const events = useThree((st) => st.events);
  const seq = useRef(-1);
  const gliding = useRef(false);
  const goal = useRef<Goal>({ target: HOME_TARGET.clone(), radius: 5, theta: null, phi: null });
  const home = useRef<Goal>({ target: HOME_TARGET.clone(), radius: 5, theta: null, phi: null });
  const lastFrame = useRef<CameraCommand | null>(null);
  const homeFor = useRef('');
  const moved = useRef(false);
  const lastRadius = useRef(0);
  const limits = useRef<[boolean, boolean] | null>(null);
  const [spin, setSpin] = useState(false);
  const spinning = useRef(false);
  const dragging = useRef(false);
  const lastInput = useRef(0);
  const onDragRef = useRef(onDrag);
  useEffect(() => {
    onDragRef.current = onDrag;
  }, [onDrag]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    // Vertical swipes scroll the page on touch screens; sideways drags turn the body and pinches zoom.
    (c.domElement as HTMLElement | null)?.style.setProperty('touch-action', 'pan-y');
    const start = () => {
      gliding.current = false;
      moved.current = true;
      dragging.current = true;
      lastInput.current = performance.now();
      onDragRef.current(true);
    };
    const end = () => {
      dragging.current = false;
      lastInput.current = performance.now();
      onDragRef.current(false);
      if (pointer.current?.inside) events.update?.();
    };
    c.addEventListener('start', start);
    c.addEventListener('end', end);
    return () => {
      c.removeEventListener('start', start);
      c.removeEventListener('end', end);
    };
  }, [controls, pointer, events]);

  const apply = (cmd: CameraCommand, c: Controls) => {
    const g = goal.current;
    V.dir.copy(camera.position).sub(c.target).normalize();
    if (cmd.kind === 'reset') {
      fit(BODY_BOX, HOME_DIR, camera, size.width, size.height, DIST.min, g);
      g.theta = HOME_SPHERICAL.theta;
      g.phi = HOME_SPHERICAL.phi;
    } else if (cmd.kind === 'frame') {
      fit(cmd.box ?? BODY_BOX, V.dir, camera, size.width, size.height, cmd.box ? DIST.focusMin : DIST.min, g);
      g.theta = g.phi = null;
    } else {
      // Rapid clicks add up: step from where the camera is heading, not from where it is mid-glide.
      const from = gliding.current ? g.radius : camera.position.distanceTo(c.target);
      if (!gliding.current) g.target.copy(c.target);
      g.radius = THREE.MathUtils.clamp(from * cmd.factor, DIST.min, DIST.max);
      // Zooming out also brings the orbit centre back to the body, reaching it at the default distance.
      if (g.radius > from) {
        const h = home.current;
        g.target.lerp(h.target, from >= h.radius ? 1 : THREE.MathUtils.clamp((g.radius - from) / (h.radius - from), 0, 1));
      }
      g.theta = g.phi = null;
    }
    if (cmd.kind !== 'zoom') {
      lastFrame.current = cmd;
      moved.current = false;
    }
    gliding.current = true;
    lastInput.current = performance.now();
  };

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const now = performance.now();
    // Home framing depends on the canvas size; re-frame on resize unless the user has moved the camera since.
    const h = home.current;
    const key = `${size.width}x${size.height}`;
    if (homeFor.current !== key) {
      fit(BODY_BOX, HOME_DIR, camera, size.width, size.height, DIST.min, h);
      homeFor.current = key;
      if (lastFrame.current && !moved.current && seq.current === channel.current?.seq) apply(lastFrame.current, c);
    }
    if (channel.current && channel.current.seq !== seq.current) {
      seq.current = channel.current.seq;
      apply(channel.current.cmd, c);
    }

    const g = goal.current;
    if (gliding.current) {
      const k = reduced ? 1 : 1 - Math.exp(-GLIDE_RATE * Math.min(delta, 0.1));
      V.offset.copy(camera.position).sub(c.target);
      V.sph.setFromVector3(V.offset);
      c.target.lerp(g.target, k);
      V.sph.radius += (g.radius - V.sph.radius) * k;
      const dTheta = g.theta === null ? 0 : wrapAngle(g.theta - V.sph.theta);
      const dPhi = g.phi === null ? 0 : g.phi - V.sph.phi;
      V.sph.theta += dTheta * k;
      V.sph.phi = THREE.MathUtils.clamp(V.sph.phi + dPhi * k, POLAR.min, POLAR.max);
      V.sph.makeSafe();
      camera.position.copy(c.target).add(V.offset.setFromSpherical(V.sph));
      camera.lookAt(c.target);
      if (c.target.distanceTo(g.target) < 5e-4 && Math.abs(g.radius - V.sph.radius) < 2e-3 &&
        Math.abs(dTheta) < 2e-3 && Math.abs(dPhi) < 2e-3) {
        gliding.current = false;
        // Re-pick under a resting pointer: the body has moved beneath it.
        if (pointer.current?.inside) events.update?.();
      }
    } else {
      // zoomToCursor moves the orbit centre toward the pointer. Keep it on the figure, and as the user zooms
      // back out, ease it home so the whole body ends up centred again.
      const r = camera.position.distanceTo(c.target);
      V.want.copy(c.target).clamp(TARGET_BOUNDS.min, TARGET_BOUNDS.max);
      if (lastRadius.current > 0 && r > lastRadius.current + 1e-4) {
        const from = lastRadius.current;
        V.want.lerp(h.target, from >= h.radius ? 1 : THREE.MathUtils.clamp((r - from) / (h.radius - from), 0, 1));
      }
      V.offset.subVectors(V.want, c.target);
      if (V.offset.lengthSq() > 1e-12) {
        c.target.add(V.offset);
        camera.position.add(V.offset);
        camera.lookAt(c.target);
      }
    }
    lastRadius.current = camera.position.distanceTo(c.target);

    // Turntable only on the overview: not while focused, zoomed in, pointed at, or for reduced motion. Pointing at
    // a system (in the list too) or focusing one counts as input, so it resumes only after a quiet spell.
    if (hovering || focused) lastInput.current = now;
    const wantSpin = !reduced && !focused && !hovering && !pointer.current?.stage && !dragging.current &&
      now - lastInput.current > IDLE_AFTER * 1000 && lastRadius.current > h.radius * 0.85;
    if (wantSpin !== spinning.current) {
      spinning.current = wantSpin;
      setSpin(wantSpin);
    }

    const r = gliding.current ? g.radius : lastRadius.current;
    const atMin = r <= DIST.min + 0.01;
    const atMax = r >= DIST.max - 0.01;
    if (!limits.current || limits.current[0] !== atMin || limits.current[1] !== atMax) {
      limits.current = [atMin, atMax];
      onLimits(atMin, atMax);
    }
  });
  return (
    // zoomToCursor: scrolling zooms toward the part of the body under the pointer, not the centre of the stage.
    <OrbitControls ref={controls as any} makeDefault target={HOME_TARGET.toArray()} enablePan={false} zoomToCursor
      enableDamping dampingFactor={0.08} minDistance={DIST.min} maxDistance={DIST.max} rotateSpeed={0.7}
      autoRotate={spin} autoRotateSpeed={0.45} minPolarAngle={POLAR.min} maxPolarAngle={POLAR.max} />
  );
}

/** Download progress, then "Preparing" while the shaders compile in the background. */
function Loader({ preparing }: { preparing: boolean }) {
  const { progress, active } = useProgress();
  const loading = active || progress < 100;
  if (!loading && !preparing) return null;
  return (
    <div className={s.loader} aria-live="polite">
      <span className={s.loaderBar}>
        <i style={{ width: `${loading ? Math.round(progress) * 0.7 : 85}%` }} />
      </span>
      {loading ? 'Loading anatomy' : 'Preparing 3D view'}
    </div>
  );
}

/* ------------------------------------------------------------------ public component */
export function Body3D({
  organs,
  organStatus,
  grey,
  focus,
  hover,
  view,
  layers,
  skinMode,
  heartRate,
  breathRate,
  reduced = false,
  crewName = '',
  onSelect,
  onHover,
}: {
  organs: OrganDef[];
  organStatus: Record<string, Status>;
  /** Systems shown in neutral grey: no recent reading, nothing flagged. */
  grey: Record<string, boolean>;
  focus: string | null;
  hover: string | null;
  view: BodyView;
  layers: Layers;
  skinMode: SkinMode;
  heartRate: number;
  breathRate: number;
  reduced?: boolean;
  crewName?: string;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const zoomIn = useRef<HTMLButtonElement>(null);
  const zoomOut = useRef<HTMLButtonElement>(null);
  const controls = useRef<Controls | null>(null);
  const [boxes, setBoxes] = useState<Record<string, THREE.Box3>>({});
  const [visible, setVisible] = useState(true);
  const [shadersReady, setShadersReady] = useState(false);
  const pointer = useRef<LensPointer>({ x: 0, y: 0, inside: false, stage: false, overUntil: 0 });
  const dragging = useRef(false);
  const changing = useRef(true);
  const channel = useRef<CameraChannel>({ seq: 0, cmd: { kind: 'frame', box: null } });
  const send = (cmd: CameraCommand) => {
    channel.current = { seq: channel.current.seq + 1, cmd };
  };
  const onReady = useMemo(() => (b: Record<string, THREE.Box3>) => setBoxes(b), []);
  // The hover as this component last knew it, the one it reported itself (from the 3D view), and the press that
  // started the current click.
  const hovered = useRef<string | null>(hover);
  const own = useRef<string | null>(null);
  const clearTimer = useRef(0);
  const down = useRef({ x: 0, y: 0 });
  const hitClick = useRef<Event | null>(null);
  const resetting = useRef(false);

  // Stop rendering while the body is scrolled out of view.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // A click or tap on empty stage returns to the whole body; a drag doesn't. Listened to natively, after the 3D
  // view has handled the same click (a hit on a system marks it).
  const latest = useRef({ focus, onSelect });
  useEffect(() => {
    latest.current = { focus, onSelect };
  });
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e === hitClick.current || (e.target as Element).tagName !== 'CANVAS' || !latest.current.focus) return;
      if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) <= 8) latest.current.onSelect(null);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  // Glide to the focused system, or back to the whole body. A system without a mesh frames the whole body.
  const box = focus ? boxes[focus] : undefined;
  useEffect(() => {
    if (!focus && resetting.current) {
      resetting.current = false;
      return;
    }
    send({ kind: 'frame', box: box ?? null });
  }, [focus, box]);

  const zoomBy = (factor: number) => send({ kind: 'zoom', factor });
  const resetView = () => {
    if (focus) {
      resetting.current = true;
      onSelect(null);
    }
    send({ kind: 'reset' });
  };
  const select = (id: string) => {
    // Clicking the focused system again re-frames it after a manual turn or zoom.
    if (id === focus) send({ kind: 'frame', box: boxes[id] ?? null });
    else onSelect(id);
  };

  const name = (id: string) => organs.find((o) => o.id === id)?.name ?? id;
  const writeTip = (id: string) => {
    const el = tip.current;
    if (!el) return;
    const st = organStatus[id] ?? 'ok';
    const g = Boolean(grey[id]) && st === 'ok';
    el.dataset.status = g ? 'none' : st;
    (el.firstElementChild as HTMLElement).textContent = name(id);
    (el.lastElementChild as HTMLElement).textContent = statusWord(st, g);
  };
  // Keep the pointer's tooltip inside the stage: flip to the other side of the pointer near an edge.
  const placeTip = (x: number, y: number) => {
    const el = tip.current;
    const stage = wrap.current;
    if (!el || !stage) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    let left = x + 14;
    let top = y + 16;
    if (left + w > W - 6) left = x - 12 - w;
    if (top + h > H - 6) top = y - 12 - h;
    left = Math.max(6, Math.min(left, W - w - 6));
    top = Math.max(6, Math.min(top, H - h - 6));
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  const hideTip = () => {
    if (tip.current) tip.current.hidden = true;
  };
  const report = (id: string | null) => {
    pointer.current.overUntil = id ? Infinity : performance.now() + 250;
    if (wrap.current) {
      if (id) wrap.current.dataset.hot = '';
      else delete wrap.current.dataset.hot;
    }
    own.current = id;
    if (hovered.current !== id) {
      hovered.current = id;
      onHover(id);
    }
  };
  // Let go of a hover this view set. One set meanwhile by the readings list (the pointer went straight there) stays.
  const release = () => {
    pointer.current.overUntil = performance.now() + 250;
    if (wrap.current) delete wrap.current.dataset.hot;
    const mine = own.current;
    own.current = null;
    if (mine !== null && hovered.current === mine) {
      hovered.current = null;
      onHover(null);
    }
  };
  // Hover from the 3D view: the tooltip moves with the pointer without re-rendering React; the hovered system is
  // reported only when it changes.
  const pick = (id: string | null, e?: PointerEvent) => {
    if (id && e) {
      window.clearTimeout(clearTimer.current);
      clearTimer.current = 0;
      // Touch has no hover: a tap focuses instead. While the body is dragged round, nothing is pointed at.
      if (e.pointerType === 'touch' || dragging.current) {
        hideTip();
        return;
      }
      writeTip(id);
      if (tip.current) tip.current.hidden = false;
      placeTip(e.offsetX, e.offsetY);
      report(id);
    } else if (!clearTimer.current) {
      clearTimer.current = window.setTimeout(() => {
        clearTimer.current = 0;
        hideTip();
        release();
      }, HOVER_GRACE);
    }
  };
  useEffect(() => () => window.clearTimeout(clearTimer.current), []);
  // The parent may change the hover (from the readings list): follow it, and keep the tooltip's words current.
  useEffect(() => {
    hovered.current = hover;
  }, [hover]);
  useEffect(() => {
    const el = tip.current;
    if (el && !el.hidden && hovered.current) writeTip(hovered.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organStatus, grey, organs]);

  const onDrag = (d: boolean) => {
    dragging.current = d;
    if (d) hideTip();
  };
  const onLimits = (atMin: boolean, atMax: boolean) => {
    zoomIn.current?.setAttribute('aria-disabled', String(atMin));
    zoomOut.current?.setAttribute('aria-disabled', String(atMax));
  };

  // Keyboard: arrows step through the systems in the order of the readings list, + and − zoom, 0 resets.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const ids = organs.map((o) => o.id);
    const step = (d: number) => {
      const i = focus ? ids.indexOf(focus) : -1;
      const next = i < 0 ? (d > 0 ? 0 : ids.length - 1) : (i + d + ids.length) % ids.length;
      if (ids[next]) onSelect(ids[next]);
    };
    const keys: Record<string, () => void> = {
      ArrowRight: () => step(1),
      ArrowDown: () => step(1),
      ArrowLeft: () => step(-1),
      ArrowUp: () => step(-1),
      '+': () => zoomBy(1 / 1.4),
      '=': () => zoomBy(1 / 1.4),
      '-': () => zoomBy(1.4),
      _: () => zoomBy(1.4),
      '0': resetView,
      Home: resetView,
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  return (
    <div ref={wrap} className={s.wrap}
      onPointerEnter={() => {
        pointer.current.stage = true;
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const p = pointer.current;
        p.x = e.clientX - r.left;
        p.y = e.clientY - r.top;
        p.stage = true;
        // Over the canvas itself (not the buttons on top of it), with a pointer that can hover.
        p.inside = e.pointerType !== 'touch' && (e.target as Element).tagName === 'CANVAS';
        if (!p.inside) pick(null);
      }}
      onPointerLeave={() => {
        pointer.current.stage = false;
        pointer.current.inside = false;
        pick(null);
      }}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}>
      <Canvas
        className={s.canvas}
        role="img"
        aria-label={`3D body${crewName ? ` of ${crewName}` : ''}. The same body systems, with their readings, follow as a list.`}
        shadows="percentage"
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: START, fov: 26, near: 0.05, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <hemisphereLight args={['#e3ebff', '#1c1511', 0.35]} />
        {/* Cinematic three-point light: a warm key from the front right casting soft shadows, a cool rim from
            behind left and a warm Mars-glow rim from behind right to carve the silhouette off the dark stage. */}
        <directionalLight position={[2.5, 4.1, 3.5]} intensity={2.3} color="#fff4e8" castShadow
          shadow-mapSize={[2048, 2048]} shadow-bias={-0.0008} shadow-normalBias={0.035} shadow-radius={4}
          shadow-camera-left={-1.6} shadow-camera-right={1.6} shadow-camera-top={1.6} shadow-camera-bottom={-1.6}
          shadow-camera-near={1} shadow-camera-far={14} />
        <directionalLight position={[-3, 2.5, -3]} intensity={1.9} color="#9db8ff" />
        <directionalLight position={[3.2, 1.6, -2.6]} intensity={1.3} color="#ffb48a" />
        {/* Reflections: studio panels, an overhead cabin strip, warm and cool bounce cards. */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.6} position={[2.5, 3, 3]} scale={[3, 2, 1]} target={[0, 0.9, 0]} />
          <Lightformer form="rect" intensity={1.2} position={[-3, 1.5, 2]} scale={[2, 3, 1]} target={[0, 0.9, 0]} />
          <Lightformer form="ring" intensity={1.6} color="#b8d0ff" position={[0, 2.5, -4]} scale={2.5}
            target={[0, 0.9, 0]} />
          <Lightformer form="rect" intensity={3} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[0.4, 4, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#ffb07a" position={[3.5, 0.8, -2]} scale={[1, 3, 1]}
            target={[0, 0.9, 0]} />
          <Lightformer form="rect" intensity={0.9} color="#5d8dff" position={[-3.5, 0.5, -1]} scale={[1.5, 2, 1]}
            target={[0, 0.9, 0]} />
        </Environment>
        <Suspense fallback={null}>
          <Model view={view} layers={layers} organStatus={organStatus} grey={grey} focus={focus} hover={hover}
            peekAt={hover !== null && hover !== own.current ? hover : null}
            heartRate={heartRate} breathRate={breathRate} reduced={reduced} onPick={pick}
            onClickSystem={(id, e) => {
              hitClick.current = e;
              select(id);
            }}
            onReady={onReady} skinMode={skinMode} pointer={pointer} crewName={crewName} changing={changing}
            onCompiled={() => setShadersReady(true)} />
          <Platform changing={changing} />
        </Suspense>
        <Rig channel={channel} controls={controls} focused={focus !== null} hovering={hover !== null}
          reduced={reduced} pointer={pointer} onLimits={onLimits} onDrag={onDrag} />
      </Canvas>
      <Loader preparing={!shadersReady} />
      {/* Keyboard access to the 3D body: Tab lands here (a ring shows round the stage), arrows step through systems. */}
      <button type="button" className={s.keys} onKeyDown={onKeyDown}
        aria-label="3D body. Arrow keys step through the body systems, plus and minus zoom, 0 resets the view, Escape returns to the whole body." />
      <div className={s.zoom} role="group" aria-label="Camera">
        <button ref={zoomIn} type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom in" title="Zoom in (+)">
          <Plus size={14} />
        </button>
        <button ref={zoomOut} type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom out" title="Zoom out (−)">
          <Minus size={14} />
        </button>
        <button type="button" onClick={resetView} aria-label="Reset view" title="Reset view (0)">
          <RotateCcw size={13} />
        </button>
      </div>
      <div ref={tip} className={s.tip} hidden aria-hidden>
        <b />
        <span />
      </div>
    </div>
  );
}
