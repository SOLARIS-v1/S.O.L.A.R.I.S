/**
 * Materials of the 3D body: organ and bone surfaces, the artistic skin and the x-ray glass skin.
 *
 * Contract with Body3D.tsx (which animates them every frame):
 * - makeOrganMaterial returns a MeshStandardMaterial (or a subclass such as MeshPhysicalMaterial). Body3D fades it
 *   through `opacity`, switches `transparent`/`depthWrite` when it becomes solid, sets `color` to the NATURAL tint or
 *   the status colour (Natural / Status views) and drives `emissive`/`emissiveIntensity` for hover and status glow.
 *   Keep `clippingPlanes: [clip]` (the entrance scan sweep) and start at opacity 0, transparent, depthWrite false.
 * - The skin shaders keep the x-ray lens behaviour: see makeRealSkin.
 */
import * as THREE from 'three';
import { prepareOrganGeometry } from './organGeometry';
import { LENS_GLSL } from './suit';
import { patchScatter, TISSUE_NOISE } from './tissue';

/** Natural tint of each anatomical part (node names are "<system>--<part>" in the model). */
export const NATURAL: Record<string, string> = {
  brain: '#d6a7a0',
  vestibular: '#e3cc96',
  eye_r: '#e6dfd4',
  eye_l: '#e6dfd4',
  optic_nerve: '#e8dcc6',
  heart: '#a3302b',
  vessels: '#a7333a',
  arteries: '#b13a3a',
  veins: '#55609c',
  lung_r: '#dc9c9b',
  lung_l: '#dc9c9b',
  airway: '#e2cfc3',
  larynx: '#dcd8cc',
  diaphragm: '#9c4136',
  liver: '#7a3125',
  gallbladder: '#4e7f4a',
  esophagus: '#c98073',
  stomach: '#d69584',
  pancreas: '#dcb07c',
  small_intestine: '#dd9b8b',
  large_intestine: '#c38c76',
  thyroid: '#a3463c',
  kidney_r: '#89302a',
  kidney_l: '#89302a',
  adrenals: '#d6a14f',
  ureters: '#dfbea4',
  bladder: '#dca792',
  spleen: '#6d2c42',
  thymus: '#dcb597',
  lymph_nodes: '#c9a08c',
  muscles: '#8a2a24',
  skeleton_bones: '#e2d5bb',
  skeleton_skull: '#e2d5bb',
  skeleton_thorax: '#e2d5bb',
  skeleton_spine: '#e2d5bb',
  skeleton_hips: '#e2d5bb',
};

/**
 * The muscles come as one node per body region ("muscles_trunk", "muscles_arm_r", ...), all one tissue: the key
 * NATURAL and TISSUE know a part by.
 */
export const tissueOf = (part: string) => (part.startsWith('muscles') ? 'muscles' : part);
/** Natural tint of a part. */
export const naturalOf = (part: string) => NATURAL[tissueOf(part)] ?? '#cccccc';

export function cssColor(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Fresnel "x-ray" skin: clear in the middle, visible at the silhouette. */
export function makeSkinMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#f2c7aa') },
      uBase: { value: 0.012 },
      uStrength: { value: 0.62 },
      uFade: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uBase;
      uniform float uStrength;
      uniform float uFade;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.8);
        gl_FragColor = vec4(uColor, clamp(uBase + f * uStrength, 0.0, 0.9) * uFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

/** Uniforms shared between React and the real-skin shader (same objects, so updates need no re-render). */
export function makeSkinUniforms() {
  return {
    uLensPos: { value: new THREE.Vector2(-9999, -9999) },
    uLensR: { value: 0 },
    uLens: { value: 0 },
    uFade: { value: 0 },
    /** Suit opacity: when the suit fully covers the body, the skin's outer surface is skipped. */
    uCover: { value: 0 },
    uRim: { value: new THREE.Color(cssColor('--accent', '#86a9f5')).convertLinearToSRGB() },
    uInner: { value: new THREE.Color('#8c3a2c').convertLinearToSRGB() },
  };
}
export type SkinUniforms = ReturnType<typeof makeSkinUniforms>;

/**
 * Skin of a neutral, unisex figure, shaded like living skin rather than plastic: a natural tone that warms where
 * skin is thin and well perfused (face, ears, hands, feet, knees, elbows), faint blotchy colour variation, a
 * soft dual-lobe sheen, pores and fine texture that appear only close up, red-tinted occlusion in the creases and
 * subsurface scattering (red light wrapping past the terminator, back light glowing through fingers and ears).
 *
 * X-ray lens: inside the lens circle, the near half of the body (decided by the shrunk "core" point of each vertex,
 * aCore) is cut away, and the inner surface of the far half shows as the cavity wall (uInner) behind the organs.
 * The skin is a hollow shell (outer surface plus an inner one facing the organs), so face direction alone can't
 * tell the halves apart. In suit mode the outer surface is skipped once the suit covers it (uCover).
 */
export function makeRealSkin(uniforms: SkinUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#d9a88e',
    roughness: 0.5,
    ior: 1.4,
    // Velvet of fine vellus hair and the oily film: a soft sheen at grazing angles.
    sheen: 0.35,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color('#ffdccb'),
    envMapIntensity: 0.55,
    transparent: true,
    side: THREE.DoubleSide,
  });
  // One pass for both sides: three's two-pass path flips the winding for the back pass, which makes
  // gl_FrontFacing true there and lets the lens cut away the inner wall too.
  m.forceSinglePass = true;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    patchScatter(shader);
    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        'attribute float aAO;\nattribute vec3 aCore;\nvarying float vAO;\nvarying vec3 vWP;\nvarying vec3 vCore;\nvoid main() {',
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vCore = (modelMatrix * vec4(aCore, 1.0)).xyz;
        vAO = aAO;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `${LENS_GLSL}
        ${TISSUE_NOISE}
        uniform vec3 uInner;
        uniform float uCover;
        varying vec3 vWP;
        varying vec3 vCore;
        varying float vAO;
        void main() {`,
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${SKIN_TONE}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${SKIN_ROUGHNESS}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${SKIN_MICRO}`)
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float ndv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        float ring;
        float hole = lensHole(ring);
        // Near or far half of the body as seen from the camera ((vWP - vCore) points out of the body).
        bool nearSide = dot(vWP - vCore, cameraPosition - vWP) > 0.0;
        if (hole > 0.02 && !nearSide) {
          // Inside the lens the far half is the cavity wall behind the organs (its inner surface faces us).
          if (!gl_FrontFacing) discard;
          gl_FragColor = vec4(uInner * (0.3 + 0.7 * ndv) * mix(0.6, 1.0, vAO), uFade);
        } else if (gl_FrontFacing) {
          // The outer surface.
          if (uCover > 0.97) discard;
          // Occlusion in creases, tinted red like light bounced through skin.
          gl_FragColor.rgb *= mix(vec3(0.6, 0.46, 0.43), vec3(1.0), vAO);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, ring * 0.6);
          gl_FragColor.a = (1.0 - hole) * uFade;
        } else if (hole < 0.02) {
          // Outside the lens no inner face is meant to be seen: where the thin inner layer pokes through the outer
          // one (fingertips, shins, thighs), drop it and let the outer surface behind it show.
          discard;
        } else {
          // The inner surface of the near half, at the lens rim: the cut edge of the body wall.
          gl_FragColor = vec4(uInner * (0.45 + 0.55 * ndv), (1.0 - hole) * uFade);
        }
        if (gl_FragColor.a < 0.01) discard;`,
      );
  };
  m.customProgramCacheKey = () => 'astra-real-skin-2';
  // Closed shell: only back faces write the shadow map, which removes self-shadow striping on the front.
  m.shadowSide = THREE.BackSide;
  return m;
}

/**
 * Skin albedo from world-space landmarks of the figure (metres, Y-up, facing +Z): flushed cheeks, nose, lips and
 * ears, warmer hands, feet, knees and elbows, and soft blotches. Also sets the subsurface parameters.
 */
const SKIN_TONE = /* glsl */ `
  vec3 sp = vWP;
  float ax = abs(sp.x);
  float fwS = max(length(fwidth(sp)), 1e-6);
  float face = smoothstep(1.48, 1.51, sp.y) * (1.0 - smoothstep(1.63, 1.66, sp.y)) * smoothstep(0.035, 0.07, sp.z);
  float cheek = 1.0 - smoothstep(0.006, 0.024, length(vec2(ax - 0.037, sp.y - 1.566)));
  float noseTip = 1.0 - smoothstep(0.004, 0.018, length(vec2(sp.x, sp.y - 1.566)));
  float lips = (1.0 - smoothstep(0.6, 1.0, length(vec2(sp.x / 0.021, (sp.y - 1.535) / 0.0065))))
    * smoothstep(0.078, 0.086, sp.z);
  float ear = smoothstep(0.058, 0.07, ax) * tBand(sp.y, 1.56, 1.625, 0.008) * (1.0 - smoothstep(0.02, 0.04, abs(sp.z + 0.005)))
    * step(1.45, sp.y);
  float hands = smoothstep(0.19, 0.215, ax) * (1.0 - smoothstep(0.88, 0.95, sp.y));
  float feet = 1.0 - smoothstep(0.03, 0.1, sp.y);
  float knees = tBand(sp.y, 0.45, 0.53, 0.02) * smoothstep(0.0, 0.04, sp.z) * (1.0 - smoothstep(0.13, 0.17, ax));
  float elbows = tBand(sp.y, 1.02, 1.1, 0.02) * smoothstep(0.0, -0.03, sp.z) * smoothstep(0.16, 0.19, ax);
  float flush = clamp(face * (cheek * 0.75 + noseTip * 0.55) + ear * 0.6 + hands * 0.4 + feet * 0.45 + knees * 0.35
    + elbows * 0.3, 0.0, 1.0);
  float mo = tNoise(sp * 9.0) * 0.6 + tNoise(sp * 37.0 + 5.0) * 0.4;
  float blotch = clamp(tNoise(sp * 15.0 + 9.0) * 1.6, 0.0, 1.0);
  diffuseColor.rgb *= 1.0 + mo * 0.07;
  diffuseColor.rgb *= mix(vec3(1.0), vec3(1.02, 0.86, 0.84), clamp(flush + blotch * 0.35, 0.0, 1.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.96, 0.78, 0.77), lips * face);
  // Subsurface: thin parts (fingers, toes, ears, the nose) let back light through.
  float thin = 1.0 - smoothstep(0.008, 0.035, distance(vWP, vCore));
  thin = max(thin, max(ear * 0.8, noseTip * face * 0.5));
  sssWrap = vec3(0.6, 0.28, 0.2);
  sssColor = vec3(1.0, 0.36, 0.24) * 0.85;
  sssBack = 0.06 + 0.9 * thin;`;

/** Oilier T-zone and lips, drier limbs, slight variation everywhere. */
const SKIN_ROUGHNESS = /* glsl */ `
  float tzone = face * max(1.0 - smoothstep(0.01, 0.03, ax), noseTip);
  roughnessFactor = clamp(roughnessFactor + mo * 0.06 - tzone * 0.1 - lips * face * 0.12 + hands * 0.04, 0.3, 0.8);`;

/** Pores and fine texture as a bump, only where the camera is close enough to resolve them. */
const SKIN_MICRO = /* glsl */ `
  float poreF = 1500.0;
  float nearP = 1.0 - smoothstep(0.2, 0.5, fwS * poreF);
  float nearM = 1.0 - smoothstep(0.2, 0.5, fwS * 160.0);
  // Only evaluated close up; the derivatives in tBump stay outside the branch.
  float skinH = 0.0;
  if (nearM > 0.0) {
    skinH = (tNoise(sp * 160.0 + 3.0) * 0.6 + tNoise(sp * 420.0) * 0.4) * 0.00007 * nearM;
    if (nearP > 0.0) skinH += tNoise(sp * poreF) * 0.000022 * nearP;
  }
  normal = tBump(-vViewPosition, normal, skinH);`;

/* ------------------------------------------------------------------ organs and bones */

const SOFT = 0;
const HEART = 1;
const AIRWAY = 2;
const EYE = 3;
const BONE = 4;

/** Surface recipe of a tissue. Frequencies are in cycles per metre on the organ. */
interface Tissue {
  kind: number;
  rough: number;
  /** Wet film over the surface (clearcoat) and its roughness; 0 for dry tissue. */
  coat: number;
  coatRough: number;
  /** Soft colour blotches: amount, frequency. */
  mottle: [number, number];
  /** Fine vessel network: amount, frequency, line width (noise units), colour. */
  veins?: [number, number, number, string];
  /** Lobulation (bulging lobules with creases between them): amount, frequency. */
  lobes?: [number, number];
  /** How much grooves and folds darken (sulci, gaps between loops). */
  cav: number;
  /** Subsurface: per-channel wrap and back-lit translucency. */
  wrap: [number, number, number];
  back: number;
  /** Second colour: epicardial fat on the heart, tendon and fascia on muscles and nerves. */
  accent?: string;
  /**
   * Fibres along each piece (needs the aFibre attribute baked by organGeometry.ts): striation amount, pale tendon
   * at both ends, fascia sheen at grazing angles.
   */
  fibre?: [number, number, number];
  /**
   * Skeletal muscle: fibre directions, tendons and occlusion were baked per vertex by scripts/build_anatomy.py
   * (aFibre = fibre direction and how much tendon, aCurv.y = occlusion), see organGeometry.ts.
   */
  baked?: boolean;
}

const WET: Pick<Tissue, 'coat' | 'coatRough' | 'wrap' | 'back'> = {
  coat: 0.8,
  coatRough: 0.1,
  wrap: [0.5, 0.22, 0.15],
  back: 0.3,
};
const GUT: Tissue = {
  ...WET,
  kind: SOFT,
  rough: 0.42,
  mottle: [0.07, 45],
  veins: [0.5, 30, 0.045, '#962a2c'],
  cav: 0.6,
};
const BONE_TISSUE: Tissue = {
  kind: BONE,
  rough: 0.6,
  coat: 0,
  coatRough: 0,
  mottle: [0.06, 22],
  cav: 0.45,
  wrap: [0.28, 0.16, 0.1],
  back: 0.1,
};

const TISSUE: Record<string, Tissue> = {
  brain: { ...WET, kind: SOFT, rough: 0.45, coat: 0.6, coatRough: 0.16, mottle: [0.06, 70],
    veins: [0.6, 42, 0.032, '#8c2238'], cav: 1, wrap: [0.5, 0.25, 0.2] },
  // Bony labyrinth of the inner ear: smooth, glossy, ivory-gold.
  vestibular: { ...WET, kind: SOFT, rough: 0.35, coat: 0.7, coatRough: 0.12, mottle: [0.05, 400], cav: 0.3,
    wrap: [0.4, 0.3, 0.2], back: 0.35 },
  // Optic nerve and chiasm: creamy white fibre bundles in a glossy sheath with fine pial vessels.
  optic_nerve: { ...WET, kind: SOFT, rough: 0.45, coat: 0.5, coatRough: 0.18, mottle: [0.04, 120],
    veins: [0.3, 110, 0.04, '#b5524e'], cav: 0.3, back: 0.35, fibre: [0.5, 0, 0.5], accent: '#f4ece0' },
  eye_r: { ...WET, kind: EYE, rough: 0.22, coat: 1, coatRough: 0.03, mottle: [0.03, 120], cav: 0, back: 0.2 },
  eye_l: { ...WET, kind: EYE, rough: 0.22, coat: 1, coatRough: 0.03, mottle: [0.03, 120], cav: 0, back: 0.2 },
  heart: { ...WET, kind: HEART, rough: 0.42, coatRough: 0.09, mottle: [0.06, 50],
    veins: [0.18, 45, 0.03, '#5c1622'], cav: 0.5, accent: '#e3c27c' },
  vessels: { ...WET, kind: SOFT, rough: 0.38, mottle: [0.05, 60], veins: [0.22, 70, 0.04, '#6a1820'], cav: 0.3 },
  // Arteries: thick glossy red walls with fine vasa vasorum. Veins: thin, darker, blue-purple walls.
  arteries: { ...WET, kind: SOFT, rough: 0.36, mottle: [0.05, 90], veins: [0.18, 120, 0.04, '#6a1820'], cav: 0.25 },
  veins: { ...WET, kind: SOFT, rough: 0.34, coat: 0.85, mottle: [0.06, 90], cav: 0.25, wrap: [0.35, 0.25, 0.35],
    back: 0.4 },
  // Laryngeal cartilages: pale, glassy hyaline cartilage.
  larynx: { ...WET, kind: SOFT, rough: 0.35, coat: 0.6, coatRough: 0.15, mottle: [0.04, 150],
    veins: [0.12, 90, 0.04, '#b0625e'], cav: 0.4, wrap: [0.4, 0.35, 0.35], back: 0.45 },
  // Diaphragm: a muscular dome; its fibres run up from the ribs towards the central tendon.
  diaphragm: { ...WET, kind: SOFT, rough: 0.5, coat: 0.35, coatRough: 0.3, mottle: [0.05, 30], cav: 0.4,
    wrap: [0.45, 0.18, 0.12], back: 0.2, fibre: [0.5, 0, 0.4], accent: '#e3d6c6' },
  lung_r: { ...WET, kind: SOFT, rough: 0.5, coat: 0.6, coatRough: 0.16, mottle: [0.08, 55],
    lobes: [0.12, 60], cav: 0.45, wrap: [0.6, 0.3, 0.25], back: 0.45 },
  lung_l: { ...WET, kind: SOFT, rough: 0.5, coat: 0.6, coatRough: 0.16, mottle: [0.08, 55],
    lobes: [0.12, 60], cav: 0.45, wrap: [0.6, 0.3, 0.25], back: 0.45 },
  airway: { ...WET, kind: AIRWAY, rough: 0.45, coat: 0.5, coatRough: 0.15, mottle: [0.05, 80],
    veins: [0.2, 60, 0.04, '#a8545a'], cav: 0.5 },
  liver: { ...WET, kind: SOFT, rough: 0.4, coatRough: 0.08, mottle: [0.07, 60], veins: [0.12, 22, 0.03, '#4a1a16'],
    cav: 0.5, wrap: [0.45, 0.18, 0.12], back: 0.25 },
  gallbladder: { ...WET, kind: SOFT, rough: 0.35, coat: 0.9, coatRough: 0.07, mottle: [0.06, 50],
    veins: [0.35, 35, 0.04, '#7a2a24'], cav: 0.3, wrap: [0.35, 0.5, 0.35], back: 0.6 },
  esophagus: { ...GUT, mottle: [0.06, 70], veins: [0.3, 30, 0.04, '#8e2a2a'], cav: 0.5 },
  stomach: { ...GUT, veins: [0.35, 26, 0.03, '#8a2228'] },
  pancreas: { ...WET, kind: SOFT, rough: 0.5, coat: 0.5, coatRough: 0.14, mottle: [0.08, 80],
    veins: [0.2, 25, 0.04, '#a0342c'], lobes: [0.9, 230], cav: 0.5 },
  small_intestine: { ...GUT, rough: 0.4, coat: 0.85, mottle: [0.06, 60], veins: [0.45, 40, 0.04, '#9c2b2e'], cav: 0.65 },
  large_intestine: { ...GUT, mottle: [0.08, 40], veins: [0.35, 30, 0.04, '#8a2a2a'] },
  // Thyroid: deep red-brown, very vascular, finely lobular.
  thyroid: { ...WET, kind: SOFT, rough: 0.42, coat: 0.6, coatRough: 0.14, mottle: [0.07, 160],
    veins: [0.35, 70, 0.04, '#5c1a1c'], lobes: [0.5, 420], cav: 0.4, back: 0.3 },
  // Adrenal glands: yellow-orange cortex, finely textured.
  adrenals: { ...WET, kind: SOFT, rough: 0.48, coat: 0.5, coatRough: 0.16, mottle: [0.08, 160], lobes: [0.4, 380],
    cav: 0.5, back: 0.3 },
  kidney_r: { ...WET, kind: SOFT, rough: 0.38, coat: 0.85, coatRough: 0.08, mottle: [0.06, 70],
    veins: [0.15, 30, 0.03, '#4c1716'], cav: 0.4, back: 0.25 },
  kidney_l: { ...WET, kind: SOFT, rough: 0.38, coat: 0.85, coatRough: 0.08, mottle: [0.06, 70],
    veins: [0.15, 30, 0.03, '#4c1716'], cav: 0.4, back: 0.25 },
  ureters: { ...WET, kind: SOFT, rough: 0.4, coat: 0.7, mottle: [0.05, 80], veins: [0.3, 60, 0.05, '#a3343a'], cav: 0.3 },
  bladder: { ...WET, kind: SOFT, rough: 0.42, coat: 0.7, mottle: [0.06, 60], veins: [0.45, 45, 0.04, '#a3343a'],
    cav: 0.3 },
  spleen: { ...WET, kind: SOFT, rough: 0.4, mottle: [0.08, 55], veins: [0.1, 25, 0.03, '#3c1424'], cav: 0.4,
    back: 0.25 },
  thymus: { ...WET, kind: SOFT, rough: 0.5, coat: 0.4, coatRough: 0.16, mottle: [0.08, 60], lobes: [0.7, 180],
    cav: 0.5 },
  // Lymph nodes: small pink-grey beans with a glossy capsule.
  lymph_nodes: { ...WET, kind: SOFT, rough: 0.45, coat: 0.6, coatRough: 0.15, mottle: [0.06, 400],
    veins: [0.2, 300, 0.05, '#a3505a'], cav: 0.3, back: 0.4 },
  // Skeletal muscle: deep red fascicles along each muscle's own fibre direction, silvery tendons and aponeuroses,
  // a thin wet fascia with a soft sheen, dark grooves between the bellies.
  muscles: { ...WET, kind: SOFT, rough: 0.54, coat: 0.3, coatRough: 0.34, mottle: [0.05, 26],
    veins: [0.08, 16, 0.025, '#4e1416'], cav: 0.5, wrap: [0.45, 0.16, 0.12], back: 0.12, fibre: [1, 1, 0.5],
    accent: '#d8dcdf', baked: true },
  skeleton_bones: BONE_TISSUE,
  skeleton_skull: BONE_TISSUE,
  skeleton_thorax: BONE_TISSUE,
  skeleton_spine: BONE_TISSUE,
  skeleton_hips: BONE_TISSUE,
};
const DEFAULT_TISSUE: Tissue = { ...WET, kind: SOFT, rough: 0.42, mottle: [0.06, 50], cav: 0.4 };

/** Organ surface: colour, roughness, bump height (hgt) and occlusion (occ) from position and curvature. */
const ORGAN_SURFACE = /* glsl */ `
  vec3 p = vOP;
  float fw = max(length(fwidth(vWP)), 1e-6);
  vec3 base = diffuseColor.rgb;
  vec3 col = base;
  float rough = roughnessFactor;
  float hgt = 0.0;
  float groove = smoothstep(0.6, 3.0, vCurv.x);
  float crest = smoothstep(0.8, 3.0, -vCurv.x);
  // Muscles carry baked occlusion from their neighbours in place of the broad curvature (uF.w).
  float baked = uF.w > 0.5 ? smoothstep(0.06, 0.75, vCurv.y) : 0.0;
  float fold = uF.w > 0.5 ? 0.0 : smoothstep(0.4, 2.5, vCurv.y);
  float occ = clamp(1.0 - uB.w * (0.45 * groove + 0.35 * fold), 0.3, 1.0) * (1.0 - 0.8 * baked);

  // Blood and thickness: soft blotches of brightness, and redder patches in natural colours.
  float m1 = tNoise(p * uA.y) * 0.65 + tNoise(p * uA.y * 2.4 + 11.0) * 0.35;
  float m2 = clamp(tNoise(p * uA.y * 0.45 + 31.0) * 2.2, 0.0, 1.0);
  col *= 1.0 + uA.x * m1 * 1.8;
  col = mix(col, col * vec3(1.1, 0.88, 0.9), m2 * uA.x * 3.0 * uTint);
  hgt += m1 * uA.x * 0.005 * (1.0 - smoothstep(0.1, 0.4, fw * uA.y));

  // Lobulation: bulging lobules with fine creases between them.
  if (uB.y > 0.0) {
    float lv = tNoise(p * uB.z + 3.0);
    float aaL = 1.0 - smoothstep(0.08, 0.3, fw * uB.z);
    float crease = 1.0 - smoothstep(0.0, 0.16, abs(lv));
    hgt -= crease * uB.y * (0.12 / uB.z) * aaL;
    col *= 1.0 - crease * uB.y * 0.25 * aaL;
    occ *= 1.0 - crease * uB.y * 0.3 * aaL;
  }

  // Vessels: a branching network under the surface in two orders, thickening and fading along their course.
  if (uA.z > 0.0) {
    vec3 q = p * uA.w;
    float warp = tNoise(q * 0.4 + 7.0) * 1.8;
    float thick = smoothstep(-0.25, 0.25, m1 + 0.05);
    float v1 = tLine(tNoise(q + warp), uB.x * thick);
    vec3 q2 = q * 2.7 + 5.0;
    float v2 = tLine(tNoise(q2 + warp * 1.3), uB.x * 0.5) * smoothstep(-0.3, 0.6, warp);
    float vv = clamp(v1 + v2 * 0.6, 0.0, 1.0) * uA.z;
    col = mix(col, mix(col * 0.62, uVein, uTint), vv);
    hgt += vv * 0.00012;
  }

  // Fibres (muscles, nerves): fascicles running along each piece, gathered into bundles that still read from afar,
  // a pale tendon and a silvery fascia sheen at grazing angles. Without the baked direction (before the worker is
  // done) the fibres run vertically and there is no tendon.
  if (uF.x > 0.0) {
    float hasF = step(1e-4, dot(vFib.xyz, vFib.xyz));
    vec3 fd = hasF > 0.5 ? normalize(vFib.xyz) : vec3(0.0, 1.0, 0.0);
    float al = dot(p, fd);
    vec3 across = p - fd * al;
    // Skeletal muscle has its tendons and aponeuroses baked per vertex (w); other fibrous parts pale at both ends.
    float tend = uF.w > 0.5 ? smoothstep(0.2, 0.8, vFib.w) * hasF
      : (1.0 - smoothstep(0.02, 0.09, min(vFib.w, 1.0 - vFib.w))) * hasF * uF.y;
    float aaB = 1.0 - smoothstep(0.25, 0.7, fw * 160.0);
    float aaF = 1.0 - smoothstep(0.25, 0.7, fw * 620.0);
    float bundle = tNoise(across * 160.0 + fd * (al * 9.0));
    float fasc = tNoise(across * 620.0 + fd * (al * 30.0) + 13.0);
    float stria = bundle * aaB * 0.65 + fasc * aaF * 0.35;
    // Clefts between bundles along the bundles' own zero line (one noise fewer to compile).
    float gap = tLine(bundle - 0.12, 0.05) * aaB;
    float belly = 1.0 - tend;
    // Bundles lighten (and turn a little pinker) along their crests; thin dark clefts run between them.
    float lite = smoothstep(0.04, 0.42, stria) * uF.x * belly;
    col = mix(col, col * mix(vec3(1.32), vec3(1.42, 1.2, 1.16), uTint), lite * 0.6);
    col *= 1.0 - uF.x * belly * (gap * 0.4 + smoothstep(0.0, 0.4, -stria) * 0.16);
    hgt += uF.x * (stria * 0.00012 - gap * 0.0001) * (1.0 - 0.5 * tend);
    rough = clamp(rough + stria * 0.08 * uF.x, 0.2, 0.95);
    // Tendon and fascia: cool silvery white, with fine silky lines and ridges along the fibres that catch the light,
    // a pearl tone where it turns away. A thin sheet lying on muscle (baked as about 0.8) lets some red through.
    float silk = 0.86 + 0.2 * fasc * aaF + 0.1 * bundle * aaB - gap * 0.1;
    float thin = (1.0 - smoothstep(0.84, 0.95, vFib.w)) * step(0.5, uF.w);
    vec3 fascia = uAccent * silk * mix(vec3(1.0), vec3(0.88, 0.72, 0.72), thin * 0.75);
    col = mix(col, mix(col * 1.6, fascia, uTint), tend);
    hgt += tend * (fasc * aaF * 0.00007 + bundle * aaB * 0.00005);
    rough = mix(rough, 0.27 + 0.1 * thin, tend);
    float sheath = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0) * uF.z;
    col = mix(col, mix(col * 1.4, mix(uAccent, vec3(0.78, 0.8, 0.86), tend), uTint), sheath * 0.4);
  }

  if (uKind == ${HEART}.0) {
    // Coronary vessels are modelled as thin tubes on the heart: its most convex parts. Epicardial fat fills the
    // grooves they run in and rings the base in the atrioventricular groove.
    vec3 axis = normalize(vec3(-0.5, 0.62, -0.6));
    float hb = dot(p, axis);
    float tube = smoothstep(1.3, 2.4, -vCurv.x);
    float fn = tNoise(p * 70.0);
    float fat = smoothstep(0.5, 2.0, vCurv.y + fn * 1.2) * 0.85;
    fat = max(fat, tBand(hb + fn * 0.012, 0.008, 0.032, 0.006));
    fat *= 1.0 - tube;
    col = mix(col, mix(col * 1.2, uAccent * (0.92 + 0.16 * m1), uTint), fat * 0.9);
    rough = mix(rough, rough * 0.85, fat);
    hgt += fat * tNoise(p * 400.0) * 0.00025;
    float vein = smoothstep(-0.08, 0.08, tNoise(p * 22.0 + 3.0));
    vec3 vc = mix(vec3(0.5, 0.07, 0.06), vec3(0.2, 0.09, 0.17), vein);
    col = mix(col, mix(col * 0.65, vc, uTint), tube);
  } else if (uKind == ${AIRWAY}.0) {
    // Cartilage rings round the trachea.
    float ph = vWP.y / 0.0044;
    float ringC = smoothstep(0.2, 0.8, abs(fract(ph) - 0.5) * 2.0);
    float on = smoothstep(1.375, 1.39, vWP.y) * (1.0 - smoothstep(0.35, 0.7, fwidth(ph)));
    hgt += (ringC - 0.5) * 0.0005 * on;
    col *= 1.0 + (ringC - 0.5) * 0.14 * on;
  } else if (uKind == ${EYE}.0) {
    // Iris and pupil looking straight ahead (+Z), a darker limbal ring, a glossy cornea.
    vec3 d = normalize(vWP - vec3(sign(vWP.x) * 0.030, 1.596, 0.0515));
    float cz = d.z;
    float iris = smoothstep(0.858, 0.87, cz);
    float pupil = smoothstep(0.979, 0.984, cz);
    float fib = tNoise(vec3(atan(d.y, d.x) * 9.0, cz * 80.0, 1.0));
    vec3 irisCol = mix(vec3(0.16, 0.11, 0.06), vec3(0.42, 0.31, 0.16), clamp(smoothstep(0.88, 0.96, cz) + fib * 0.6, 0.0, 1.0));
    vec3 eye = mix(col, irisCol, iris);
    eye = mix(eye, vec3(0.015), pupil);
    eye *= 1.0 - 0.55 * tBand(cz, 0.856, 0.874, 0.004);
    col = mix(col * (1.0 - 0.45 * iris - 0.4 * pupil), eye, uTint);
    rough = mix(rough, 0.1, iris);
  } else if (uKind == ${BONE}.0) {
    // Ivory with older, yellower patches; fine pores close up; ridges catch the light.
    float aged = smoothstep(-0.2, 0.45, tNoise(p * 7.0 + 2.0));
    col = mix(col, col * vec3(1.03, 0.96, 0.84), aged * 0.55 * uTint);
    float poreF = 1300.0;
    float pore = smoothstep(0.28, 0.55, tNoise(p * poreF));
    float aaP = 1.0 - smoothstep(0.2, 0.6, fw * poreF);
    col *= 1.0 - pore * 0.2 * aaP;
    hgt -= pore * 0.0001 * aaP;
    hgt += tNoise(p * 260.0) * 0.00008 * (1.0 - smoothstep(0.1, 0.5, fw * 260.0));
    col *= 1.0 + 0.07 * crest;
    rough = clamp(rough + m1 * 0.1 + pore * 0.1 * aaP, 0.3, 0.95);
  }

  col *= mix(1.0, occ, 0.55);
  diffuseColor.rgb = col;
  roughnessFactor = rough;
  float ndv0 = abs(dot(normalize(vNormal), normalize(vViewPosition)));
  sssWrap = uWrap;
  sssColor = mix(vec3(0.6), vec3(1.0, 0.42, 0.32), uTint);
  sssBack = uBack * (0.3 + 0.7 * pow(1.0 - ndv0, 2.0));`;

/**
 * Organ or bone surface (MeshPhysicalMaterial): wet tissue gets a sharp clearcoat over a softer base, bone stays
 * dry. Procedural detail per tissue (see TISSUE), curvature-based occlusion and the subsurface term. `color` is
 * the base tint: in the Status view it carries the status colour, and the tissue-specific tints (fat, vessels,
 * iris) give way to plain shading so the status reads cleanly. `emissive` is left to Body3D's glow.
 *
 * Optional `lens` (the skin uniforms): the part can then be limited to the x-ray lens. Setting
 * `material.userData.uLensOnly.value = 1` draws it only inside the lens circle (organs under the suit or the
 * muscles); 0 draws it everywhere as usual. `material.userData.uLensCut.value` cuts the part inside the lens instead:
 * 1 removes the near half of the body there (the muscles in the Muscles view: core points baked per vertex, aCore,
 * tell near from far, so the far body wall stays behind the organs), a value between 0 and 1 fades the part by that
 * much there (skull and ribs turn to glass over the brain, heart and lungs). All parts share one shader program:
 * these are uniforms, never defines.
 */
export function makeOrganMaterial(part: string, clip: THREE.Plane, lens?: SkinUniforms) {
  const t = TISSUE[tissueOf(part)] ?? DEFAULT_TISSUE;
  const m = new THREE.MeshPhysicalMaterial({
    color: naturalOf(part),
    roughness: t.rough,
    metalness: 0,
    // Never exactly 0: clearcoat 0 compiles a separate shader program (seconds on Windows/Direct3D) for the bones.
    clearcoat: Math.max(t.coat, 0.001),
    clearcoatRoughness: t.coatRough,
    envMapIntensity: t.kind === BONE ? 0.8 : 1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    clippingPlanes: [clip],
  });
  const u = {
    uUnit: { value: 1 },
    uTint: { value: 1 },
    uKind: { value: t.kind },
    uA: { value: new THREE.Vector4(t.mottle[0], t.mottle[1], t.veins?.[0] ?? 0, t.veins?.[1] ?? 1) },
    uB: { value: new THREE.Vector4(t.veins?.[2] ?? 0, t.lobes?.[0] ?? 0, t.lobes?.[1] ?? 1, t.cav) },
    uVein: { value: new THREE.Color(t.veins?.[3] ?? '#000000') },
    uAccent: { value: new THREE.Color(t.accent ?? '#ffffff') },
    uF: { value: new THREE.Vector4(t.fibre?.[0] ?? 0, t.fibre?.[1] ?? 0, t.fibre?.[2] ?? 0, t.baked ? 1 : 0) },
    uWrap: { value: new THREE.Vector3(...t.wrap) },
    uBack: { value: t.back },
  };
  const lensOnly = { value: 0 };
  const lensCut = { value: 0 };
  m.userData.uLensOnly = lensOnly;
  m.userData.uLensCut = lensCut;
  const natural = new THREE.Color(naturalOf(part));
  // Per draw: the mesh's scale (noise in metres) and whether the colour is the natural one or a status colour.
  m.onBeforeRender = (_renderer, _scene, _camera, _geometry, object) => {
    u.uUnit.value = (object.userData.unit as number | undefined) ?? 1;
    u.uTint.value = m.color.equals(natural) ? 1 : 0;
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    if (lens) Object.assign(shader.uniforms, lens, { uLensOnly: lensOnly, uLensCut: lensCut });
    patchScatter(shader);
    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        'attribute vec2 aCurv;\nattribute vec4 aFibre;\nattribute vec3 aCore;\nuniform float uUnit;\n' +
          'varying vec3 vOP;\nvarying vec3 vWP;\nvarying vec3 vCore;\nvarying vec2 vCurv;\nvarying vec4 vFib;\n' +
          'void main() {',
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vOP = position * uUnit;
        vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vCore = (modelMatrix * vec4(aCore, 1.0)).xyz;
        vCurv = aCurv;
        vFib = aFibre;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `${TISSUE_NOISE}
        ${lens ? `${LENS_GLSL}\nuniform float uLensOnly;\nuniform float uLensCut;` : ''}
        uniform float uTint;
        uniform float uKind;
        uniform float uBack;
        uniform vec4 uA;
        uniform vec4 uB;
        uniform vec3 uVein;
        uniform vec3 uAccent;
        uniform vec3 uWrap;
        uniform vec4 uF;
        varying vec3 vOP;
        varying vec3 vWP;
        varying vec3 vCore;
        varying vec2 vCurv;
        varying vec4 vFib;
        void main() {`,
      )
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${ORGAN_SURFACE}`)
      .replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\nnormal = tBump(-vViewPosition, normal, hgt);',
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        reflectedLight.indirectDiffuse *= occ;
        reflectedLight.indirectSpecular *= mix(1.0, occ, 0.8);
        reflectedLight.directDiffuse *= mix(1.0, occ, 0.35);
        #ifdef USE_CLEARCOAT
          clearcoatSpecularIndirect *= occ;
        #endif`,
      )
      .replace(
        '#include <dithering_fragment>',
        lens
          ? `#include <dithering_fragment>
            // Branch-free, one discard: every organ, bone and muscle shares this program, and each nested branch or
            // discard made it take longer to compile on Windows/Direct3D.
            float lensRing;
            float lensIn = lensHole(lensRing);
            float only = step(0.5, uLensOnly);
            gl_FragColor.a *= mix(1.0, lensIn, only);
            // Cut by the lens: uLensCut 1 removes the near half of the body ((vWP - vCore) points out of it, taken
            // just past the silhouette) where the lens is open, the hole growing from
            // the centre as it opens, its edge lit like the skin's lens rim. Between 0 and 1 it fades the part there.
            float cutNear = step(0.99, uLensCut);
            vec3 outward = vWP - vCore;
            vec3 toEye = cameraPosition - vWP;
            float near = cutNear * step(-0.06 * length(outward) * length(toEye), dot(outward, toEye));
            gl_FragColor.a *= 1.0 - lensIn * uLensCut * (1.0 - cutNear);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, near * smoothstep(0.15, 0.5, lensIn) * 0.55);
            if (only * step(lensIn, 0.02) + near * step(0.5, lensIn) > 0.5) discard;`
          : '#include <dithering_fragment>',
      );
  };
  // Bumped with the shader code (fibres, lens cut): a live page must not reuse the program compiled from older code.
  m.customProgramCacheKey = () => (lens ? 'astra-organ-lens-5' : 'astra-organ-5');
  return m;
}

/**
 * Per-part mesh refinement, called by Body3D for every organ and bone mesh before its material is assigned:
 * welding, smooth shading normals, subdivision of coarse parts, baked curvature, and the lungs' surfaces (see
 * organGeometry.ts). It runs once per loaded model, in a worker, batched after Body3D's traversal (heart and lungs
 * keep the pivot Body3D gave them); remounts cost nothing. Until the worker is done the original mesh shows.
 */
export function prepareOrganMesh(mesh: THREE.Mesh, _part: string) {
  prepareOrganGeometry(mesh);
}
