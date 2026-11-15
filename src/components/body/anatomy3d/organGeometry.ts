/**
 * Geometry refinement for organs and bones, run once per mesh of the loaded model (see prepareOrganMesh), in a Web
 * Worker (prepWorker.ts) so the page stays responsive. The model stays cached in memory, so remounts reuse the
 * result: a mesh is only rebuilt when ORGAN_PREP_VERSION changes.
 *
 * The model was simplified and quantized (normalized int16 positions, int8 normals, vertices split along normal
 * seams), so organs read faceted. Each mesh is welded into one surface, coarse meshes are subdivided and creased
 * areas refined, then rounded; shading normals come from a gently smoothed copy, so the facets disappear while the
 * outline stays anatomically exact. Two curvature measures are baked per vertex for the shaders (aCurv): fine
 * curvature (grooves, sulci, thin tubes such as the coronary vessels) and a broad one (folds between loops,
 * fossae).
 *
 * BodyParts3D's "right/left lung" are only the bronchial and vascular trees (it has no lung surfaces), so each lung's
 * surface is reconstructed from the anatomy around it: the space inside the rib cage, above the diaphragm and outside
 * the mediastinum (heart, great vessels, aorta, airway, oesophagus, thymus, spine), flood-filled from the lung's own
 * bronchial tree and extracted as a smooth surface. The tree's vertices carry their lobe (vertex colour), so the
 * fissures between the lobes are cut where the lobes' territories meet.
 *
 * The skeletal muscles (one large mesh per body region, "muscles_trunk", "muscles_arm_r", ...) skip subdivision and
 * crease refinement. scripts/build_anatomy.py baked three things into their vertex colour: how much tendon or
 * aponeurosis (red), occlusion by the neighbouring muscles and bones (green) and the fibre direction (blue and alpha,
 * octahedral). They become aFibre (direction, tendon) and aCurv.y (occlusion, in place of the broad curvature). Each
 * muscle vertex also gets a core point (aCore): the centre line of the body or limb under it, from the skin, which the
 * x-ray lens uses to cut away the near half of the muscles only. And a much lighter copy is made for picking. The
 * optic nerves get a fibre direction per vertex too (the long axis of each piece, plus the position along it). The
 * femur is cut between skeleton_hips and skeleton_bones and each piece is closed by a flat cap; the caps are left out
 * of smoothing and shading so the two pieces meet without a groove.
 */
import * as THREE from 'three';
import { runPrep } from './prepRunner';
import {
  type Adjacency,
  neighbourMean,
  neighbours,
  readPositions,
  relax,
  sourceGeometry,
  subdivide,
  taubin,
  vertexNormals,
} from './suit';

/**
 * Bumped whenever the organ preparation changes: meshes prepared by older code (the model stays cached across hot
 * reloads and page visits) are rebuilt from userData.organSource.
 */
export const ORGAN_PREP_VERSION = 16;

/** Meshes coarser than this many triangles are subdivided once and rounded. */
const SUBDIVIDE_BELOW = 3000;
/**
 * Skeletal muscle regions: large meshes, never subdivided or crease-refined (the worker stays quick), with fibres,
 * tendons and occlusion baked by the build script.
 */
const isMuscle = (part: string) => part.startsWith('muscles');
/** Other parts drawn with fibres along their length: each piece's long axis is baked per vertex (aFibre). */
const FIBRES = new Set(['optic_nerve']);
/** Cell of the picking copy of the muscles (metres): plenty for a pointer, a fraction of the triangles. */
const PICK_CELL = 0.006;
/** Parts that share a cut bone (the femur, between hips and the rest of the skeleton), closed by flat caps. */
const CUT = new Set(['skeleton_bones', 'skeleton_hips']);

interface Surface {
  p: Float32Array;
  tri: Uint32Array;
}

/* ------------------------------------------------------------------ surface helpers */

/**
 * Welds vertices that share a position; degenerate triangles are dropped. `map` gives each input vertex's welded
 * vertex.
 */
function readWelded(raw: Float32Array, ia: Uint32Array | null): Surface & { map: Uint32Array } {
  const n = raw.length / 3;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < raw.length; i++) {
    const k = i % 3;
    if (raw[i] < lo[k]) lo[k] = raw[i];
    if (raw[i] > hi[k]) hi[k] = raw[i];
  }
  // 17 bits per axis over the bounding box (finer than the int16 source): an exact integer key per position.
  const q = [0, 1, 2].map((k) => 131071 / Math.max(hi[k] - lo[k], 1e-9));
  const keys = new Map<number, number>();
  const map = new Uint32Array(n);
  const pos = new Float32Array(raw.length);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const kx = Math.round((raw[i * 3] - lo[0]) * q[0]);
    const ky = Math.round((raw[i * 3 + 1] - lo[1]) * q[1]);
    const kz = Math.round((raw[i * 3 + 2] - lo[2]) * q[2]);
    const key = (kx * 131072 + ky) * 131072 + kz;
    let id = keys.get(key);
    if (id === undefined) {
      id = count++;
      keys.set(key, id);
      pos[id * 3] = raw[i * 3];
      pos[id * 3 + 1] = raw[i * 3 + 1];
      pos[id * 3 + 2] = raw[i * 3 + 2];
    }
    map[i] = id;
  }
  const total = ia ? ia.length : n;
  const tri = new Uint32Array(total);
  let m = 0;
  for (let t = 0; t + 2 < total; t += 3) {
    const a = map[ia ? ia[t] : t];
    const b = map[ia ? ia[t + 1] : t + 1];
    const c = map[ia ? ia[t + 2] : t + 2];
    if (a === b || b === c || a === c) continue;
    tri[m++] = a;
    tri[m++] = b;
    tri[m++] = c;
  }
  return { p: pos.slice(0, count * 3), tri: tri.slice(0, m), map };
}

/** Maps a field to (value - median) / interquartile range, from a sample of it. */
function standardise(f: Float32Array) {
  const step = Math.max(1, Math.floor(f.length / 4096));
  const s = new Float32Array(Math.ceil(f.length / step));
  for (let i = 0, j = 0; i < f.length; i += step) s[j++] = f[i];
  s.sort();
  const med = s[Math.floor(s.length * 0.5)];
  const iqr = Math.max(s[Math.floor(s.length * 0.75)] - s[Math.floor(s.length * 0.25)], 1e-6);
  return (v: number) => (v - med) / iqr;
}

/**
 * Signed curvature per vertex, standardised per mesh so the shaders can use fixed thresholds: positive in
 * grooves and folds, negative on ridges and thin tubes. Returns (fine, broad) pairs.
 */
function curvature(p: Float32Array, nrm: Float32Array, nb: Adjacency) {
  const n = p.length / 3;
  const { off, adj } = nb;
  const fine = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = off[i];
    const e = off[i + 1];
    if (s === e) continue;
    let mx = 0;
    let my = 0;
    let mz = 0;
    let len = 0;
    const px = p[i * 3];
    const py = p[i * 3 + 1];
    const pz = p[i * 3 + 2];
    for (let k = s; k < e; k++) {
      const j = adj[k] * 3;
      mx += p[j];
      my += p[j + 1];
      mz += p[j + 2];
      len += Math.hypot(p[j] - px, p[j + 1] - py, p[j + 2] - pz);
    }
    const d = e - s;
    const l = len / d || 1;
    fine[i] = ((mx / d - px) * nrm[i * 3] + (my / d - py) * nrm[i * 3 + 1] + (mz / d - pz) * nrm[i * 3 + 2]) / l;
  }
  let broad = fine.slice();
  let tmp = new Float32Array(n);
  for (let it = 0; it < 8; it++) {
    neighbourMean(broad, nb, tmp);
    [broad, tmp] = [tmp, broad];
  }
  const sf = standardise(fine);
  const sb = standardise(broad);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    out[i * 2] = sf(fine[i]);
    out[i * 2 + 1] = sb(broad[i]);
  }
  return out;
}

/** One mesh as the preparation sees it: its own positions and indices, its world matrix at rest, its scale. */
export interface OrganMeshInput {
  part: string;
  pos: Float32Array;
  index: Uint32Array | null;
  matrix: number[];
  unit: number;
  /** False for meshes that only lend their shape (to the lungs' surroundings). */
  prep: boolean;
  /** Lungs: the lobe of each vertex of the bronchial tree (1 upper, 2 middle, 3 lower, 0 unknown), from COLOR_0. */
  lobe: Uint8Array | null;
  /** Muscles: the vertex colour baked by the build script (RGBA per vertex, 0 to 1). */
  tint: Float32Array | null;
}
export interface OrganInput {
  meshes: OrganMeshInput[];
  /** The skin as loaded (its own positions, indices and world matrix): the muscles' core points come from it. */
  skin: { pos: Float32Array; index: Uint32Array | null; matrix: number[] } | null;
}
/** Prepared organ arrays, in the mesh's own space. */
export interface OrganArrays {
  pos: Float32Array;
  nrm: Float32Array;
  curv: Float32Array;
  index: Uint32Array;
  lung: boolean;
  /**
   * Fibre direction (xyz, mesh space) and, for muscles, how much tendon (w, 0 to 1), for the optic nerves the
   * position along the piece.
   */
  fibre: Float32Array | null;
  /** Muscles: the core point under each vertex (mesh space), for the x-ray lens. */
  core: Float32Array | null;
  /** Muscles: a light copy for picking. */
  pick: { pos: Float32Array; index: Uint32Array } | null;
}

/** World-space positions of a mesh input. */
function toWorld(m: OrganMeshInput) {
  const out = m.pos.slice();
  const e = m.matrix;
  for (let i = 0; i < out.length; i += 3) {
    const x = out[i];
    const y = out[i + 1];
    const z = out[i + 2];
    out[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    out[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    out[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
  return out;
}

/** The mesh's world matrix at rest (Body3D animates the scale of heart and lungs around userData.baseScale). */
function restMatrix(mesh: THREE.Mesh) {
  mesh.parent?.updateWorldMatrix(true, false);
  const base = (mesh.userData.baseScale as THREE.Vector3 | undefined) ?? mesh.scale;
  const local = new THREE.Matrix4().compose(mesh.position, mesh.quaternion, base);
  return mesh.parent ? new THREE.Matrix4().multiplyMatrices(mesh.parent.matrixWorld, local) : local;
}

/* ------------------------------------------------------------------ lungs */

const CELL = 0.0045; // metres
const PAD = 4; // empty cells around the domain, so the extracted surface is closed

interface LungField {
  nx: number;
  ny: number;
  nz: number;
  origin: THREE.Vector3;
  /** 1 where a lung may be: inside the rib cage, above the diaphragm, outside the mediastinum. */
  free: Uint8Array;
}

/** World positions and indices of a part, by name (e.g. "heart"). */
type PartLookup = (part: string) => { w: Float32Array; index: Uint32Array | null } | undefined;

/** Calls `fn` for every vertex and for points spread over every triangle, at most `step` apart. */
function surfaceSamples(w: Float32Array, index: Uint32Array | null, step: number,
  fn: (x: number, y: number, z: number) => void) {
  for (let i = 0; i < w.length; i += 3) fn(w[i], w[i + 1], w[i + 2]);
  if (!index) return;
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = index[t] * 3;
    const b = index[t + 1] * 3;
    const c = index[t + 2] * 3;
    const len = Math.max(
      Math.hypot(w[a] - w[b], w[a + 1] - w[b + 1], w[a + 2] - w[b + 2]),
      Math.hypot(w[b] - w[c], w[b + 1] - w[c + 1], w[b + 2] - w[c + 2]),
      Math.hypot(w[c] - w[a], w[c + 1] - w[a + 1], w[c + 2] - w[a + 2]),
    );
    const n = Math.ceil(len / step);
    if (n < 2) continue;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; i + j <= n; j++) {
        const u = i / n;
        const v = j / n;
        const s = 1 - u - v;
        fn(w[a] * s + w[b] * u + w[c] * v, w[a + 1] * s + w[b + 1] * u + w[c + 1] * v,
          w[a + 2] * s + w[b + 2] * u + w[c + 2] * v);
      }
    }
  }
}

function buildLungField(get: PartLookup): LungField | null {
  const thorax = get('skeleton_thorax');
  if (!thorax) return null;
  const ribs = thorax.w;
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity);
  const hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const v = new THREE.Vector3();
  for (let i = 0; i < ribs.length; i += 3) {
    v.fromArray(ribs, i);
    lo.min(v);
    hi.max(v);
  }
  const origin = lo.clone().subScalar(PAD * CELL);
  const nx = Math.ceil((hi.x - lo.x) / CELL) + 2 * PAD + 1;
  const ny = Math.ceil((hi.y - lo.y) / CELL) + 2 * PAD + 1;
  const nz = Math.ceil((hi.z - lo.z) / CELL) + 2 * PAD + 1;
  const sxy = nx * ny;
  const free = new Uint8Array(sxy * nz);

  // Rib cage: per horizontal slice, the inner radius of the ribs in each direction around the slice's centre
  // (ribs from a band of heights, so the intercostal gaps close).
  const rows: number[][] = Array.from({ length: ny }, () => []);
  for (let i = 0; i < ribs.length; i += 3) {
    const j = Math.round((ribs[i + 1] - origin.y) / CELL);
    if (j >= 0 && j < ny) rows[j].push(i);
  }
  const BAND = Math.round(0.018 / CELL);
  const BINS = 72;
  const radius = new Float32Array(BINS);
  const soft = new Float32Array(BINS);
  const angle = (x: number, z: number) => Math.floor((Math.atan2(z, x) / (2 * Math.PI) + 1) * BINS) % BINS;
  for (let j = PAD; j < ny - PAD; j++) {
    const y = origin.y + j * CELL;
    let zMin = Infinity;
    let zMax = -Infinity;
    const sel: number[] = [];
    for (let r = Math.max(0, j - BAND); r <= Math.min(ny - 1, j + BAND); r++) {
      for (const i of rows[r]) {
        if (Math.abs(ribs[i + 1] - y) > 0.018) continue;
        sel.push(i);
        zMin = Math.min(zMin, ribs[i + 2]);
        zMax = Math.max(zMax, ribs[i + 2]);
      }
    }
    if (sel.length < 40) continue;
    const cz = (zMin + zMax) / 2;
    const bins: number[][] = Array.from({ length: BINS }, () => []);
    for (const i of sel) bins[angle(ribs[i], ribs[i + 2] - cz)].push(Math.hypot(ribs[i], ribs[i + 2] - cz));
    radius.fill(Number.NaN);
    let filled = 0;
    for (let b = 0; b < BINS; b++) {
      const list = bins[b];
      if (list.length < 2) continue;
      list.sort((a, c) => a - c);
      radius[b] = list[Math.floor(list.length * 0.1)];
      filled++;
    }
    if (filled < BINS * 0.45) continue;
    // Close gaps by interpolating round the circle, then soften.
    for (let b = 0; b < BINS; b++) {
      if (!Number.isNaN(radius[b])) continue;
      let l = 1;
      while (Number.isNaN(radius[(b - l + BINS) % BINS])) l++;
      let r = 1;
      while (Number.isNaN(radius[(b + r) % BINS])) r++;
      const a = radius[(b - l + BINS) % BINS];
      const c = radius[(b + r) % BINS];
      radius[b] = a + ((c - a) * l) / (l + r);
    }
    for (let b = 0; b < BINS; b++) {
      let s = 0;
      for (let d = -2; d <= 2; d++) s += radius[(b + d + BINS) % BINS];
      soft[b] = Math.min(s / 5, radius[b]) - 0.004; // pleura and intercostal muscle inside the ribs
    }
    for (let k = PAD; k < nz - PAD; k++) {
      const z = origin.z + k * CELL - cz;
      for (let i = PAD; i < nx - PAD; i++) {
        const x = origin.x + i * CELL;
        if (Math.hypot(x, z) < soft[angle(x, z)]) free[i + nx * j + sxy * k] = 1;
      }
    }
  }

  // Diaphragm: lungs rest on its domes (or, in a model without one, on the liver, stomach and spleen below it).
  // Columns without it take the height of their neighbours, which lets the lungs dip into the costophrenic recesses.
  const floor = new Float32Array(nx * nz).fill(Number.NaN);
  const dome = get('diaphragm') ? ['diaphragm'] : ['liver', 'stomach', 'spleen'];
  const thickness = dome.length === 1 ? 0.0015 : 0.006; // clearance above the diaphragm's upper surface
  for (const part of dome) {
    const o = get(part);
    if (!o) continue;
    // Points over the whole surface (its triangles too), so every column under a large triangle gets a height.
    surfaceSamples(o.w, o.index, CELL * 0.7, (x, y, z) => {
      const ci = Math.round((x - origin.x) / CELL);
      const ck = Math.round((z - origin.z) / CELL);
      if (ci < 0 || ck < 0 || ci >= nx || ck >= nz) return;
      const c = ci + nx * ck;
      if (!(floor[c] >= y)) floor[c] = y;
    });
  }
  let missing = floor.reduce((s, f) => s + (Number.isNaN(f) ? 1 : 0), 0);
  if (missing === floor.length) return null;
  const prevFloor = new Float32Array(floor.length);
  while (missing > 0) {
    prevFloor.set(floor);
    for (let k = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++) {
        if (!Number.isNaN(prevFloor[i + nx * k])) continue;
        let s = 0;
        let c = 0;
        for (const [a, b] of [[i - 1, k], [i + 1, k], [i, k - 1], [i, k + 1]]) {
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const f = prevFloor[a + nx * b];
          if (Number.isNaN(f)) continue;
          s += f;
          c++;
        }
        if (c) {
          floor[i + nx * k] = s / c - CELL * 0.4;
          missing--;
        }
      }
    }
  }
  for (let pass = 0; pass < 8; pass++) {
    prevFloor.set(floor);
    for (let k = 1; k < nz - 1; k++) {
      for (let i = 1; i < nx - 1; i++) {
        const c = i + nx * k;
        floor[c] = (prevFloor[c] * 2 + prevFloor[c + 1] + prevFloor[c - 1] + prevFloor[c + nx] + prevFloor[c - nx]) / 6;
      }
    }
  }
  for (let k = 0; k < nz; k++) {
    for (let i = 0; i < nx; i++) {
      const top = floor[i + nx * k] + thickness;
      for (let j = 0; j < ny && origin.y + j * CELL < top; j++) free[i + nx * j + sxy * k] = 0;
    }
  }

  // Mediastinum and spine. The front of the heart (left of the sternum) and of the great vessels stays bare,
  // like the cardiac notch, so the lungs flank the heart instead of covering it.
  const block = new Uint8Array(sxy * nz);
  const OBSTACLES: [string, boolean][] = [
    ['heart', true],
    ['vessels', true],
    ['airway', false],
    ['esophagus', false],
    ['thymus', true],
    ['skeleton_thorax', false],
    ['skeleton_spine', false],
    ['arteries', false], // the descending aorta grooves the left lung
    ['veins', false],
    ['skeleton_bones', false],
  ];
  for (const [part, front] of OBSTACLES) {
    const o = get(part);
    if (!o) continue;
    const { w, index: idx } = o;
    const heart = part === 'heart';
    const splat = (x: number, y: number, z: number) => {
      const i = Math.round((x - origin.x) / CELL);
      const j = Math.round((y - origin.y) / CELL);
      let k = Math.round((z - origin.z) / CELL);
      if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return;
      block[i + nx * j + sxy * k] = 1;
      // Bare area in front: the heart between the sternum and the cardiac notch, the vessels and thymus.
      if (!front || (heart && (x < -0.012 || x > 0.058))) return;
      for (k++; k < nz; k++) block[i + nx * j + sxy * k] = 1;
    };
    for (let i = 0; i < w.length; i += 3) splat(w[i], w[i + 1], w[i + 2]);
    if (idx) {
      // Triangle centres too, so large triangles leave no gaps in the barrier.
      for (let t = 0; t + 2 < idx.length; t += 3) {
        const a = idx[t] * 3;
        const b = idx[t + 1] * 3;
        const c = idx[t + 2] * 3;
        splat((w[a] + w[b] + w[c]) / 3, (w[a + 1] + w[b + 1] + w[c + 1]) / 3, (w[a + 2] + w[b + 2] + w[c + 2]) / 3);
      }
    }
  }
  // One cell of clearance round every obstacle (pericardium, pleura).
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const c = i + nx * j + sxy * k;
        if (!free[c]) continue;
        if (block[c] || block[c + 1] || block[c - 1] || block[c + nx] || block[c - nx] || block[c + sxy] ||
          block[c - sxy]) free[c] = 0;
      }
    }
  }
  return { nx, ny, nz, origin, free };
}

/** In-place separable [1 2 1] blur of a box-shaped field. */
function blur3(f: Float32Array, nx: number, ny: number, nz: number, tmp: Float32Array) {
  const strides = [1, nx, nx * ny];
  const dims = [nx, ny, nz];
  for (let axis = 0; axis < 3; axis++) {
    const s = strides[axis];
    const dim = dims[axis];
    tmp.set(f);
    for (let c = 0; c < f.length; c++) {
      const pos = axis === 0 ? c % nx : axis === 1 ? Math.floor(c / nx) % ny : Math.floor(c / (nx * ny));
      const a = pos > 0 ? tmp[c - s] : 0;
      const b = pos < dim - 1 ? tmp[c + s] : 0;
      f[c] = (a + 2 * tmp[c] + b) * 0.25;
    }
  }
}

/** Surface nets: one vertex per boundary cell, one quad per grid edge crossing the surface (outward winding). */
function surfaceNets(f: Float32Array, nx: number, ny: number, nz: number, iso: number, origin: THREE.Vector3,
  cell = CELL) {
  const sxy = nx * ny;
  const vid = new Int32Array(f.length).fill(-1);
  const pos: number[] = [];
  const cx = [0, 1, 0, 1, 0, 1, 0, 1];
  const cy = [0, 0, 1, 1, 0, 0, 1, 1];
  const cz = [0, 0, 0, 0, 1, 1, 1, 1];
  const co = cx.map((x, c) => x + nx * cy[c] + sxy * cz[c]);
  const EA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3];
  const EB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];
  const val = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const base = i + nx * j + sxy * k;
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          val[c] = f[base + co[c]];
          if (val[c] > iso) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (let e = 0; e < 12; e++) {
          const a = EA[e];
          const b = EB[e];
          if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
          const t = (iso - val[a]) / (val[b] - val[a]);
          sx += cx[a] + (cx[b] - cx[a]) * t;
          sy += cy[a] + (cy[b] - cy[a]) * t;
          sz += cz[a] + (cz[b] - cz[a]) * t;
          n++;
        }
        vid[base] = pos.length / 3;
        pos.push(origin.x + (i + sx / n) * cell, origin.y + (j + sy / n) * cell, origin.z + (k + sz / n) * cell);
      }
    }
  }
  const tri: number[] = [];
  const quad = (inside: boolean, a: number, b: number, c: number, d: number) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (inside) tri.push(a, b, c, a, c, d);
    else tri.push(a, d, c, a, c, b);
  };
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const c = i + nx * j + sxy * k;
        const here = f[c] > iso;
        if (here !== f[c + 1] > iso) quad(here, vid[c - nx - sxy], vid[c - sxy], vid[c], vid[c - nx]);
        if (here !== f[c + nx] > iso) quad(here, vid[c - 1 - sxy], vid[c - 1], vid[c], vid[c - sxy]);
        if (here !== f[c + sxy] > iso) quad(here, vid[c - 1 - nx], vid[c - nx], vid[c], vid[c - 1]);
      }
    }
  }
  return { p: new Float32Array(pos), tri: Uint32Array.from(tri) };
}

/**
 * Fissures between the lobes of one lung: each cell inside the lung takes the lobe of the nearest part of the
 * bronchial tree (a breadth-first sweep from the tree's own cells), and a sheet one cell thick is marked wherever two
 * lobes meet; carveFissures presses a groove into the lung's surface along it.
 */
function lobeFissures(tree: Float32Array, lobe: Uint8Array, rest: THREE.Matrix4, field: LungField,
  inside: Uint8Array): Uint8Array | null {
  const { nx, ny, nz, origin } = field;
  const sxy = nx * ny;
  const label = new Uint8Array(inside.length);
  const queue = new Int32Array(inside.length);
  let head = 0;
  let tail = 0;
  const v = new THREE.Vector3();
  for (let i = 0; i < lobe.length; i++) {
    if (!lobe[i]) continue;
    v.fromArray(tree, i * 3).applyMatrix4(rest);
    const ci = Math.round((v.x - origin.x) / CELL);
    const cj = Math.round((v.y - origin.y) / CELL);
    const ck = Math.round((v.z - origin.z) / CELL);
    if (ci < 0 || cj < 0 || ck < 0 || ci >= nx || cj >= ny || ck >= nz) continue;
    const c = ci + nx * cj + sxy * ck;
    if (!inside[c] || label[c]) continue;
    label[c] = lobe[i];
    queue[tail++] = c;
  }
  if (!tail) return null;
  const steps = [1, -1, nx, -nx, sxy, -sxy];
  const spread = () => {
    while (head < tail) {
      const c = queue[head++];
      for (const d of steps) {
        const nb = c + d;
        if (nb < 0 || nb >= inside.length || !inside[nb] || label[nb]) continue;
        label[nb] = label[c];
        queue[tail++] = nb;
      }
    }
  };
  spread();
  // Each lobe keeps only its largest connected territory: near the hilum the trees of neighbouring lobes interleave,
  // and their stray islands would otherwise show as round bumps ringed by a fissure.
  const comp = new Int32Array(inside.length).fill(-1);
  const sizes: number[] = [];
  const best = [-1, -1, -1, -1];
  for (let c0 = 0; c0 < label.length; c0++) {
    if (!label[c0] || comp[c0] >= 0) continue;
    const id = sizes.length;
    let size = 0;
    head = tail = 0;
    queue[tail++] = c0;
    comp[c0] = id;
    while (head < tail) {
      const c = queue[head++];
      size++;
      for (const d of steps) {
        const nb = c + d;
        if (nb < 0 || nb >= label.length || label[nb] !== label[c0] || comp[nb] >= 0) continue;
        comp[nb] = id;
        queue[tail++] = nb;
      }
    }
    sizes.push(size);
    const l = label[c0];
    if (best[l] < 0 || size > sizes[best[l]]) best[l] = id;
  }
  head = tail = 0;
  for (let c = 0; c < label.length; c++) {
    if (!label[c]) continue;
    if (comp[c] !== best[label[c]]) label[c] = 0;
    else queue[tail++] = c;
  }
  spread();
  const cut = new Uint8Array(inside.length);
  let any = false;
  for (let c = 0; c < label.length; c++) {
    if (!label[c]) continue;
    for (const d of [1, nx, sxy]) {
      const nb = c + d;
      if (nb < label.length && label[nb] && label[nb] !== label[c]) {
        cut[c] = 1;
        any = true;
      }
    }
  }
  return any ? cut : null;
}

/** Fissure groove: depth in metres, and half its width. */
const GROOVE = { depth: 0.008, width: CELL * 1.6 } as const;

/**
 * Presses a narrow groove into the finished (smooth) lung surface wherever it crosses a fissure sheet, so the lobes
 * read as separate while the lung stays one smooth organ. Each vertex moves inward along its normal, most at the sheet
 * and not at all beyond GROOVE.width from it.
 */
function carveFissures(s: Surface, cut: Uint8Array, field: LungField) {
  const { nx, ny, nz, origin } = field;
  const sxy = nx * ny;
  const nrm = vertexNormals(s.p, s.tri);
  const R = Math.ceil(GROOVE.width / CELL);
  let push = new Float32Array(s.p.length / 3);
  for (let v = 0; v < s.p.length; v += 3) {
    const x = s.p[v];
    const y = s.p[v + 1];
    const z = s.p[v + 2];
    const ci = Math.round((x - origin.x) / CELL);
    const cj = Math.round((y - origin.y) / CELL);
    const ck = Math.round((z - origin.z) / CELL);
    let best = Infinity;
    for (let dk = -R; dk <= R; dk++) {
      const k = ck + dk;
      if (k < 0 || k >= nz) continue;
      for (let dj = -R; dj <= R; dj++) {
        const j = cj + dj;
        if (j < 0 || j >= ny) continue;
        for (let di = -R; di <= R; di++) {
          const i = ci + di;
          if (i < 0 || i >= nx || !cut[i + nx * j + sxy * k]) continue;
          const d = Math.hypot(origin.x + i * CELL - x, origin.y + j * CELL - y, origin.z + k * CELL - z);
          if (d < best) best = d;
        }
      }
    }
    if (best >= GROOVE.width) continue;
    const t = 1 - best / GROOVE.width;
    push[v / 3] = GROOVE.depth * t * t * (3 - 2 * t);
  }
  // The sheet is made of cells: soften the groove along the surface so it runs as a clean line, not in steps.
  const nb = neighbours(push.length, s.tri);
  let tmp = new Float32Array(push.length);
  for (let pass = 0; pass < 2; pass++) {
    neighbourMean(push, nb, tmp);
    [push, tmp] = [tmp, push];
  }
  for (let i = 0; i < push.length; i++) {
    const v = i * 3;
    s.p[v] -= nrm[v] * push[i];
    s.p[v + 1] -= nrm[v + 1] * push[i];
    s.p[v + 2] -= nrm[v + 2] * push[i];
  }
}

/**
 * The lung's surface in the mesh's own space, or null when the surrounding anatomy is missing (then the
 * bronchial tree is kept as it is). Lobe fissures are cut when the tree carries its lobes.
 */
function lungSurface(m: OrganMeshInput, field: LungField | null): Surface | null {
  if (!field) return null;
  const { nx, ny, nz, origin, free } = field;
  const sxy = nx * ny;
  const right = m.part === 'lung_r';
  const rest = new THREE.Matrix4().fromArray(m.matrix);
  // Cells on the lung's side of the midline (the mediastinal pleura keeps the two lungs apart).
  const sideOk = (i: number) => {
    const x = origin.x + i * CELL;
    return right ? x < -0.005 : x > 0.005;
  };

  // Seed: the free cell nearest the centre of the lung's bronchial tree.
  const tree = m.pos;
  const centre = new THREE.Vector3();
  for (let i = 0; i < tree.length; i += 3) centre.add(new THREE.Vector3().fromArray(tree, i));
  centre.divideScalar(Math.max(1, tree.length / 3)).applyMatrix4(rest);
  let seed = -1;
  let best = Infinity;
  for (let c = 0; c < free.length; c++) {
    if (!free[c]) continue;
    const i = c % nx;
    if (!sideOk(i)) continue;
    const d = (origin.x + i * CELL - centre.x) ** 2 + (origin.y + (Math.floor(c / nx) % ny) * CELL - centre.y) ** 2 +
      (origin.z + Math.floor(c / sxy) * CELL - centre.z) ** 2;
    if (d < best) {
      best = d;
      seed = c;
    }
  }
  if (seed < 0) return null;

  // Flood fill: the connected free space on the lung's side. The padding is never free, so a step off a row or
  // slice can't wrap into another part of the grid.
  const inside = new Uint8Array(free.length);
  const stack = new Int32Array(free.length);
  let top = 0;
  stack[top++] = seed;
  inside[seed] = 1;
  let cells = 0;
  const box = [nx, ny, nz, 0, 0, 0];
  while (top) {
    const c = stack[--top];
    cells++;
    const i = c % nx;
    const j = Math.floor(c / nx) % ny;
    const k = Math.floor(c / sxy);
    box[0] = Math.min(box[0], i);
    box[1] = Math.min(box[1], j);
    box[2] = Math.min(box[2], k);
    box[3] = Math.max(box[3], i);
    box[4] = Math.max(box[4], j);
    box[5] = Math.max(box[5], k);
    for (let d = 0; d < 6; d++) {
      const nb = d === 0 ? c + 1 : d === 1 ? c - 1 : d === 2 ? c + nx : d === 3 ? c - nx : d === 4 ? c + sxy : c - sxy;
      if (nb < 0 || nb >= free.length || inside[nb] || !free[nb] || !sideOk(nb % nx)) continue;
      inside[nb] = 1;
      stack[top++] = nb;
    }
  }
  if (cells < 300) return null;
  const fissure = m.lobe ? lobeFissures(m.pos, m.lobe, rest, field, inside) : null;

  // Blur and extract inside the region's bounding box (plus a margin for the blur).
  const M = 4;
  const i0 = Math.max(0, box[0] - M);
  const j0 = Math.max(0, box[1] - M);
  const k0 = Math.max(0, box[2] - M);
  const bx = Math.min(nx, box[3] + M + 1) - i0;
  const by = Math.min(ny, box[4] + M + 1) - j0;
  const bz = Math.min(nz, box[5] + M + 1) - k0;
  const sub = new Float32Array(bx * by * bz);
  for (let k = 0; k < bz; k++) {
    for (let j = 0; j < by; j++) {
      for (let i = 0; i < bx; i++) {
        const c = i0 + i + nx * (j0 + j) + sxy * (k0 + k);
        sub[i + bx * (j + by * k)] = inside[c];
      }
    }
  }
  const tmp = new Float32Array(sub.length);
  for (let pass = 0; pass < 3; pass++) blur3(sub, bx, by, bz, tmp);
  const subOrigin = new THREE.Vector3(origin.x + i0 * CELL, origin.y + j0 * CELL, origin.z + k0 * CELL);
  const s = surfaceNets(sub, bx, by, bz, 0.5, subOrigin);
  if (s.tri.length < 300) return null;
  taubin(s.p, neighbours(s.p.length / 3, s.tri), 16);
  if (fissure) carveFissures(s, fissure, field);
  // World to the mesh's own space.
  const inv = rest.clone().invert();
  const v = new THREE.Vector3();
  for (let i = 0; i < s.p.length; i += 3) v.fromArray(s.p, i).applyMatrix4(inv).toArray(s.p, i);
  return s;
}

/* ------------------------------------------------------------------ seams and creases */

/** Integer key of a spatial-hash cell (each index within ±2048). */
const cellKey = (x: number, y: number, z: number) => (x + 2048) * 16777216 + (y + 2048) * 4096 + (z + 2048);

/** Union-find root with path halving. */
function find(parent: Int32Array, i: number) {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
}

/**
 * Organs modelled as several touching pieces (the liver's segments, the colon's parts) show cracks where the
 * pieces meet. Vertices closer than `tol` to a vertex of another piece are merged, and the merged band is
 * relaxed, so the surface runs on smoothly across the seam (the walls between pieces stay inside the organ).
 */
function closeSeams(s: Surface, tol: number): Surface & { seam: Float32Array } {
  const { p, tri } = s;
  const n = p.length / 3;
  // Pieces: connected components over the triangles.
  const piece = Int32Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < tri.length; t += 3) {
    for (const v of [tri[t + 1], tri[t + 2]]) {
      const a = find(piece, tri[t]);
      const b = find(piece, v);
      if (a !== b) piece[b] = a;
    }
  }
  for (let i = 0; i < n; i++) piece[i] = find(piece, i);
  // Spatial hash (cells of size tol, integer keys): close vertices of different pieces join one cluster.
  const inv = 1 / tol;
  const cells = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const k = cellKey(Math.floor(p[i * 3] * inv), Math.floor(p[i * 3 + 1] * inv), Math.floor(p[i * 3 + 2] * inv));
    const list = cells.get(k);
    if (list) list.push(i);
    else cells.set(k, [i]);
  }
  const cluster = Int32Array.from({ length: n }, (_, i) => i);
  const tol2 = tol * tol;
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(p[i * 3] * inv);
    const gy = Math.floor(p[i * 3 + 1] * inv);
    const gz = Math.floor(p[i * 3 + 2] * inv);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = cells.get(cellKey(gx + dx, gy + dy, gz + dz));
          if (!list) continue;
          for (const j of list) {
            if (j <= i || piece[j] === piece[i]) continue;
            const d = (p[i * 3] - p[j * 3]) ** 2 + (p[i * 3 + 1] - p[j * 3 + 1]) ** 2 + (p[i * 3 + 2] - p[j * 3 + 2]) ** 2;
            if (d > tol2) continue;
            const a = find(cluster, i);
            const b = find(cluster, j);
            if (a !== b) cluster[b] = a;
          }
        }
      }
    }
  }
  // Merge clusters at their centre.
  const sum = new Float64Array(n * 3);
  const cnt = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = find(cluster, i);
    cnt[r]++;
    for (let d = 0; d < 3; d++) sum[r * 3 + d] += p[i * 3 + d];
  }
  const remap = new Int32Array(n).fill(-1);
  const out = new Float32Array(n * 3);
  const seam = new Float32Array(n);
  let m = 0;
  for (let i = 0; i < n; i++) {
    const r = find(cluster, i);
    if (remap[r] < 0) {
      remap[r] = m;
      for (let d = 0; d < 3; d++) out[m * 3 + d] = sum[r * 3 + d] / cnt[r];
      seam[m] = cnt[r] > 1 ? 1 : 0;
      m++;
    }
    remap[i] = remap[r];
  }
  const nt = new Uint32Array(tri.length);
  let q = 0;
  for (let t = 0; t < tri.length; t += 3) {
    const a = remap[tri[t]];
    const b = remap[tri[t + 1]];
    const c = remap[tri[t + 2]];
    if (a === b || b === c || a === c) continue;
    nt[q++] = a;
    nt[q++] = b;
    nt[q++] = c;
  }
  return { p: out.slice(0, m * 3), tri: nt.slice(0, q), seam: seam.slice(0, m) };
}

/** Parts made of touching pieces whose seams are closed, with the merge distance in metres. */
const SEAMS: Record<string, number> = { large_intestine: 0.0012 };

/**
 * Parts rebuilt as one closed surface, with the voxel size in metres. The liver is modelled as some 60 segments
 * whose borders don't quite meet: merging vertices leaves cracks or lumps, so it is remeshed whole instead.
 */
const REMESH: Record<string, number> = { liver: 0.0025 };

/**
 * One closed outer surface round a mesh made of touching pieces: its triangles are drawn into a voxel grid (`cell`
 * apart), the outside is flood-filled from the grid's corner, and everything not outside becomes the solid whose
 * smoothed boundary is extracted. Gaps narrower than a cell close; outer shape and hollows wider than that stay.
 */
function remeshUnion(p: Float32Array, tri: Uint32Array, cell: number): Surface {
  const PADDING = 3;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i++) {
    lo[i % 3] = Math.min(lo[i % 3], p[i]);
    hi[i % 3] = Math.max(hi[i % 3], p[i]);
  }
  const origin = new THREE.Vector3(lo[0] - PADDING * cell, lo[1] - PADDING * cell, lo[2] - PADDING * cell);
  const nx = Math.ceil((hi[0] - lo[0]) / cell) + 2 * PADDING + 1;
  const ny = Math.ceil((hi[1] - lo[1]) / cell) + 2 * PADDING + 1;
  const nz = Math.ceil((hi[2] - lo[2]) / cell) + 2 * PADDING + 1;
  const sxy = nx * ny;
  const shell = new Uint8Array(sxy * nz);
  surfaceSamples(p, tri, cell * 0.5, (x, y, z) => {
    shell[Math.round((x - origin.x) / cell) + nx * Math.round((y - origin.y) / cell) +
      sxy * Math.round((z - origin.z) / cell)] = 1;
  });
  // Outside: everything reachable from the corner without crossing the shell.
  const outside = new Uint8Array(shell.length);
  const stack = new Int32Array(shell.length);
  let top = 0;
  stack[top++] = 0;
  outside[0] = 1;
  while (top) {
    const c = stack[--top];
    const i = c % nx;
    const j = Math.floor(c / nx) % ny;
    const k = Math.floor(c / sxy);
    if (i > 0) visit(c - 1);
    if (i < nx - 1) visit(c + 1);
    if (j > 0) visit(c - nx);
    if (j < ny - 1) visit(c + nx);
    if (k > 0) visit(c - sxy);
    if (k < nz - 1) visit(c + sxy);
  }
  function visit(c: number) {
    if (outside[c] || shell[c]) return;
    outside[c] = 1;
    stack[top++] = c;
  }
  const f = new Float32Array(shell.length);
  for (let c = 0; c < f.length; c++) f[c] = outside[c] ? 0 : 1;
  const tmp = new Float32Array(f.length);
  for (let pass = 0; pass < 2; pass++) blur3(f, nx, ny, nz, tmp);
  // The shell cells sit on the original surface, so the solid reaches half a cell past it: a higher level takes it back.
  const s = surfaceNets(f, nx, ny, nz, 0.62, origin, cell);
  taubin(s.p, neighbours(s.p.length / 3, s.tri), 6);
  return s;
}

/**
 * Splits the edges where the surface folds sharply (adjacent faces more than acos(cosMax) apart, edges longer
 * than minLen) at their midpoints; triangles with one, two or three split edges become two, three or four.
 * Neighbours share each midpoint, so the result has no cracks. Smoothing afterwards rounds those creases off,
 * where the simplification left bones and organs blocky, without spending triangles on flat areas.
 */
function refineCreases(p: Float32Array, tri: Uint32Array, cosMax: number, minLen: number): Surface {
  const n = p.length / 3;
  const nf = tri.length / 3;
  const fn = new Float32Array(nf * 3);
  for (let f = 0; f < nf; f++) {
    const a = tri[f * 3] * 3;
    const b = tri[f * 3 + 1] * 3;
    const c = tri[f * 3 + 2] * 3;
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    const x = uy * vz - uz * vy;
    const y = uz * vx - ux * vz;
    const z = ux * vy - uy * vx;
    const l = Math.hypot(x, y, z) || 1;
    fn[f * 3] = x / l;
    fn[f * 3 + 1] = y / l;
    fn[f * 3 + 2] = z / l;
  }
  const BIG = 2 ** 22;
  const key = (a: number, b: number) => (a < b ? a * BIG + b : b * BIG + a);
  const firstFace = new Map<number, number>();
  const mid = new Map<number, number>();
  const extra: number[] = [];
  for (let f = 0; f < nf; f++) {
    for (let e = 0; e < 3; e++) {
      const a = tri[f * 3 + e];
      const b = tri[f * 3 + ((e + 1) % 3)];
      const k = key(a, b);
      const g = firstFace.get(k);
      if (g === undefined) {
        firstFace.set(k, f);
        continue;
      }
      const dot = fn[f * 3] * fn[g * 3] + fn[f * 3 + 1] * fn[g * 3 + 1] + fn[f * 3 + 2] * fn[g * 3 + 2];
      if (dot > cosMax || mid.has(k)) continue;
      const len = Math.hypot(p[a * 3] - p[b * 3], p[a * 3 + 1] - p[b * 3 + 1], p[a * 3 + 2] - p[b * 3 + 2]);
      if (len < minLen) continue;
      mid.set(k, n + extra.length / 3);
      for (let d = 0; d < 3; d++) extra.push((p[a * 3 + d] + p[b * 3 + d]) / 2);
    }
  }
  if (!mid.size) return { p, tri };
  const out: number[] = [];
  for (let f = 0; f < nf; f++) {
    let v0 = tri[f * 3];
    let v1 = tri[f * 3 + 1];
    let v2 = tri[f * 3 + 2];
    let m0 = mid.get(key(v0, v1)) ?? -1;
    let m1 = mid.get(key(v1, v2)) ?? -1;
    let m2 = mid.get(key(v2, v0)) ?? -1;
    const split = (m0 >= 0 ? 1 : 0) + (m1 >= 0 ? 1 : 0) + (m2 >= 0 ? 1 : 0);
    if (split === 0) out.push(v0, v1, v2);
    else if (split === 3) out.push(v0, m0, m2, m0, v1, m1, m2, m1, v2, m0, m1, m2);
    else {
      // Rotate so the split edges start at edge 0 (v0-v1), then edge 1 (v1-v2).
      for (let r = 0; r < 3; r++) {
        if (split === 1 ? m0 >= 0 : m0 >= 0 && m1 >= 0) break;
        [v0, v1, v2] = [v1, v2, v0];
        [m0, m1, m2] = [m1, m2, m0];
      }
      if (split === 1) out.push(v0, m0, v2, m0, v1, v2);
      else out.push(m0, v1, m1, v0, m0, m1, v0, m1, v2);
    }
  }
  const np = new Float32Array(p.length + extra.length);
  np.set(p);
  np.set(extra, p.length);
  return { p: np, tri: Uint32Array.from(out) };
}

/** Crease refinement per part: [cos of the fold angle, shortest edge to split in metres]; others skip it. */
const CREASES: Record<string, [number, number]> = {
  skeleton_bones: [0.87, 0.0015],
  skeleton_spine: [0.87, 0.0015],
  skeleton_hips: [0.87, 0.0015],
  skeleton_thorax: [0.85, 0.0025],
};

/* ------------------------------------------------------------------ fibres and borders */

/**
 * Fibre field of a mesh made of separate pieces (muscles, nerves): per connected piece, its principal axis (power
 * iteration on the covariance of its vertices) and each vertex's position along it, 0 to 1 from end to end.
 */
function fibres(p: Float32Array, tri: Uint32Array): Float32Array {
  const n = p.length / 3;
  const piece = Int32Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < tri.length; t += 3) {
    for (const v of [tri[t + 1], tri[t + 2]]) {
      const a = find(piece, tri[t]);
      const b = find(piece, v);
      if (a !== b) piece[b] = a;
    }
  }
  const id = new Int32Array(n).fill(-1);
  const of = new Int32Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const r = find(piece, i);
    if (id[r] < 0) id[r] = count++;
    of[i] = id[r];
  }
  // Per piece: vertex count, sums of x, y, z and of their products.
  const acc = new Float64Array(count * 10);
  for (let i = 0; i < n; i++) {
    const o = of[i] * 10;
    const x = p[i * 3];
    const y = p[i * 3 + 1];
    const z = p[i * 3 + 2];
    acc[o] += 1;
    acc[o + 1] += x;
    acc[o + 2] += y;
    acc[o + 3] += z;
    acc[o + 4] += x * x;
    acc[o + 5] += x * y;
    acc[o + 6] += x * z;
    acc[o + 7] += y * y;
    acc[o + 8] += y * z;
    acc[o + 9] += z * z;
  }
  const axis = new Float32Array(count * 3);
  const centre = new Float32Array(count * 3);
  for (let c = 0; c < count; c++) {
    const o = c * 10;
    const k = acc[o];
    const mx = acc[o + 1] / k;
    const my = acc[o + 2] / k;
    const mz = acc[o + 3] / k;
    const cxx = acc[o + 4] / k - mx * mx;
    const cxy = acc[o + 5] / k - mx * my;
    const cxz = acc[o + 6] / k - mx * mz;
    const cyy = acc[o + 7] / k - my * my;
    const cyz = acc[o + 8] / k - my * mz;
    const czz = acc[o + 9] / k - mz * mz;
    // Start from vertical (most limb and back muscles run up and down) and iterate towards the main axis.
    let ax = 0.05;
    let ay = 1;
    let az = 0.05;
    for (let it = 0; it < 32; it++) {
      const nx = cxx * ax + cxy * ay + cxz * az;
      const ny = cxy * ax + cyy * ay + cyz * az;
      const nz = cxz * ax + cyz * ay + czz * az;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-20) break;
      ax = nx / l;
      ay = ny / l;
      az = nz / l;
    }
    const l = Math.hypot(ax, ay, az) || 1;
    axis.set([ax / l, ay / l, az / l], c * 3);
    centre.set([mx, my, mz], c * 3);
  }
  // Position along the axis, normalised per piece.
  const along = new Float32Array(n);
  const lo = new Float32Array(count).fill(Infinity);
  const hi = new Float32Array(count).fill(-Infinity);
  for (let i = 0; i < n; i++) {
    const c = of[i] * 3;
    const s = (p[i * 3] - centre[c]) * axis[c] + (p[i * 3 + 1] - centre[c + 1]) * axis[c + 1] +
      (p[i * 3 + 2] - centre[c + 2]) * axis[c + 2];
    along[i] = s;
    if (s < lo[of[i]]) lo[of[i]] = s;
    if (s > hi[of[i]]) hi[of[i]] = s;
  }
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const c = of[i];
    out[i * 4] = axis[c * 3];
    out[i * 4 + 1] = axis[c * 3 + 1];
    out[i * 4 + 2] = axis[c * 3 + 2];
    out[i * 4 + 3] = (along[i] - lo[c]) / Math.max(hi[c] - lo[c], 1e-9);
  }
  return out;
}

/**
 * The flat caps closing the femur cut (see scripts/build_anatomy.py): faces whose three corners share one height
 * exactly (the corners of a cap are quantized to the same value). Returns the other faces and smoothing weights
 * that pin the caps' vertices. The caps stay in the drawn mesh, where they hide any gap simplification left at the
 * seam, but take no part in rounding or shading the bone's surface, so the two pieces meet without a groove.
 */
function splitCaps(p: Float32Array, tri: Uint32Array) {
  const side: number[] = [];
  const pins = new Float32Array(p.length / 3).fill(1);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t];
    const b = tri[t + 1];
    const c = tri[t + 2];
    if (p[a * 3 + 1] === p[b * 3 + 1] && p[b * 3 + 1] === p[c * 3 + 1]) {
      pins[a] = pins[b] = pins[c] = 0;
    } else side.push(a, b, c);
  }
  return { side: Uint32Array.from(side), pins };
}

/* ------------------------------------------------------------------ muscles */

/**
 * The muscles' baked vertex colour (see scripts/build_anatomy.py) on the welded vertices: aFibre = fibre direction
 * (decoded from octahedral blue and alpha) and tendon (red), plus the occlusion (1 - green).
 */
function bakedMuscle(tint: Float32Array, map: Uint32Array, count: number) {
  const fibre = new Float32Array(count * 4);
  const occl = new Float32Array(count);
  const done = new Uint8Array(count);
  for (let i = 0; i < map.length; i++) {
    const v = map[i];
    if (done[v]) continue;
    done[v] = 1;
    const ox = tint[i * 4 + 2] * 2 - 1;
    const oy = tint[i * 4 + 3] * 2 - 1;
    const oz = 1 - Math.abs(ox) - Math.abs(oy);
    const l = Math.hypot(ox, oy, oz) || 1;
    fibre[v * 4] = ox / l;
    fibre[v * 4 + 1] = oy / l;
    fibre[v * 4 + 2] = oz / l;
    fibre[v * 4 + 3] = tint[i * 4];
    occl[v] = 1 - tint[i * 4 + 1];
  }
  return { fibre, occl };
}

/** The skin's core: its surface shrunk toward the centre lines of body and limbs (as in suit.ts), world space. */
function skinCore(skin: NonNullable<OrganInput['skin']>) {
  const { p, tri } = readWelded(skin.pos, skin.index);
  const e = skin.matrix;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i];
    const y = p[i + 1];
    const z = p[i + 2];
    p[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    p[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    p[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
  const surface = p.slice();
  const core = p;
  const nb = neighbours(core.length / 3, tri);
  for (let it = 0; it < 200; it++) relax(core, nb, 0.6);
  return { surface, core };
}

/**
 * Core point of each muscle vertex: the core of the nearest skin vertex, so both faces of a muscle (and everything
 * under one patch of skin) agree on which half of the body they are in. Mesh space in, mesh space out.
 */
function muscleCore(p: Float32Array, matrix: number[], skin: ReturnType<typeof skinCore>) {
  const cell = 0.03;
  const inv = 1 / cell;
  const { surface, core } = skin;
  const grid = new Map<number, number[]>();
  for (let i = 0; i < surface.length / 3; i++) {
    const k = cellKey(Math.floor(surface[i * 3] * inv), Math.floor(surface[i * 3 + 1] * inv),
      Math.floor(surface[i * 3 + 2] * inv));
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  }
  const rest = new THREE.Matrix4().fromArray(matrix);
  const back = rest.clone().invert();
  const v = new THREE.Vector3();
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    v.fromArray(p, i).applyMatrix4(rest);
    const gx = Math.floor(v.x * inv);
    const gy = Math.floor(v.y * inv);
    const gz = Math.floor(v.z * inv);
    let best = -1;
    let bestD = Infinity;
    for (let r = 1; r <= 4 && best < 0; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dz = -r; dz <= r; dz++) {
            const list = grid.get(cellKey(gx + dx, gy + dy, gz + dz));
            if (!list) continue;
            for (const j of list) {
              const d = (surface[j * 3] - v.x) ** 2 + (surface[j * 3 + 1] - v.y) ** 2 + (surface[j * 3 + 2] - v.z) ** 2;
              if (d < bestD) {
                bestD = d;
                best = j;
              }
            }
          }
        }
      }
    }
    if (best < 0) v.set(0, v.y, 0);
    else v.fromArray(core, best * 3);
    v.applyMatrix4(back).toArray(out, i);
  }
  return out;
}

/**
 * A light copy of a mesh for picking: vertices clustered on a grid (`cell` apart, mesh units), triangles that
 * collapse dropped. The shape stays within a cell of the original.
 */
function clusterMesh(p: Float32Array, tri: Uint32Array, cell: number) {
  const inv = 1 / cell;
  const ids = new Map<number, number>();
  const sum: number[] = [];
  const cnt: number[] = [];
  const of = new Uint32Array(p.length / 3);
  for (let i = 0; i < p.length / 3; i++) {
    const k = cellKey(Math.floor(p[i * 3] * inv), Math.floor(p[i * 3 + 1] * inv), Math.floor(p[i * 3 + 2] * inv));
    let id = ids.get(k);
    if (id === undefined) {
      id = cnt.length;
      ids.set(k, id);
      sum.push(0, 0, 0);
      cnt.push(0);
    }
    of[i] = id;
    sum[id * 3] += p[i * 3];
    sum[id * 3 + 1] += p[i * 3 + 1];
    sum[id * 3 + 2] += p[i * 3 + 2];
    cnt[id]++;
  }
  const pos = new Float32Array(sum.length);
  for (let c = 0; c < cnt.length; c++) {
    pos[c * 3] = sum[c * 3] / cnt[c];
    pos[c * 3 + 1] = sum[c * 3 + 1] / cnt[c];
    pos[c * 3 + 2] = sum[c * 3 + 2] / cnt[c];
  }
  const index = new Uint32Array(tri.length);
  let m = 0;
  for (let t = 0; t < tri.length; t += 3) {
    const a = of[tri[t]];
    const b = of[tri[t + 1]];
    const c = of[tri[t + 2]];
    if (a === b || b === c || a === c) continue;
    index[m++] = a;
    index[m++] = b;
    index[m++] = c;
  }
  return { pos, index: index.slice(0, m) };
}

/* ------------------------------------------------------------------ entry points */

/** A muscle region: welded, shading normals, curvature, and the baked fibres, tendons and occlusion. */
function prepareMuscle(m: OrganMeshInput, core: () => ReturnType<typeof skinCore> | null): OrganArrays {
  const { p, tri, map } = readWelded(m.pos, m.index);
  const count = p.length / 3;
  const nb = neighbours(count, tri);
  const shade = p.slice();
  taubin(shade, nb, 2);
  const nrm = vertexNormals(shade, tri);
  const curv = curvature(shade, nrm, nb);
  let fibre: Float32Array | null = null;
  if (m.tint) {
    const baked = bakedMuscle(m.tint, map, count);
    fibre = baked.fibre;
    for (let i = 0; i < count; i++) curv[i * 2 + 1] = baked.occl[i];
  }
  const skin = core();
  let cores: Float32Array | null = null;
  if (skin) {
    // Neighbouring vertices can fall to different patches of skin: a few passes of averaging keep the lens's cut
    // between the near and far half of the body clean.
    cores = muscleCore(p, m.matrix, skin);
    const tmp = new Float32Array(cores.length);
    const ch = new Float32Array(count);
    const out = new Float32Array(count);
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < count; i++) ch[i] = cores[i * 3 + k];
      for (let pass = 0; pass < 4; pass++) {
        neighbourMean(ch, nb, out);
        ch.set(out);
      }
      for (let i = 0; i < count; i++) tmp[i * 3 + k] = ch[i];
    }
    cores = tmp;
  }
  return {
    pos: p,
    nrm,
    curv,
    index: tri,
    lung: false,
    fibre,
    core: cores,
    pick: clusterMesh(p, tri, PICK_CELL / m.unit),
  };
}

/** Welds, refines and annotates one mesh input. Pure arrays (runs in the worker). */
function prepareOne(m: OrganMeshInput, field: () => LungField | null): OrganArrays {
  const lung = m.part === 'lung_r' || m.part === 'lung_l' ? lungSurface(m, field()) : null;
  const unit = m.unit;
  let { p, tri } = lung ?? readWelded(m.pos, m.index);
  let seam: Float32Array | null = null;
  if (!lung && REMESH[m.part]) ({ p, tri } = remeshUnion(p, tri, REMESH[m.part] / unit));
  else if (!lung && SEAMS[m.part]) ({ p, tri, seam } = closeSeams({ p, tri }, SEAMS[m.part] / unit));
  const coarse = !lung && tri.length / 3 < SUBDIVIDE_BELOW;
  const crease = CREASES[m.part];
  if (coarse) {
    // Split every triangle in four, then round the new surface off (close to Loop subdivision).
    const s = subdivide(tri, p.length / 3, [{ data: p, size: 3 }]);
    p = s.data[0];
    tri = s.tri;
  } else if (crease) {
    ({ p, tri } = refineCreases(p, tri, crease[0], crease[1] / unit));
  }
  const count = p.length / 3;
  // The caps closing the femur cut stay in the drawn mesh but are left out of smoothing and shading.
  const caps = CUT.has(m.part) ? splitCaps(p, tri) : null;
  const surface = caps ? caps.side : tri;
  const pins = caps?.pins;
  const nb = neighbours(count, surface);
  if (seam) {
    // Relax the merged band and two rings round it: the grooves along the old cracks fill in.
    const w = new Float32Array(count);
    w.set(seam.subarray(0, Math.min(seam.length, count)));
    const grown = new Float32Array(count);
    for (let ring = 0; ring < 2; ring++) {
      neighbourMean(w, nb, grown);
      for (let i = 0; i < count; i++) w[i] = Math.min(1, Math.max(w[i], grown[i] * 1.6));
    }
    taubin(p, nb, 6, w);
  }
  if (coarse) taubin(p, nb, 4, pins);
  else if (crease) taubin(p, nb, 2, pins);
  // Shading normals from a gently smoothed copy: facets go, the outline stays.
  const shade = p.slice();
  taubin(shade, nb, coarse ? 3 : 2, pins);
  const nrm = vertexNormals(shade, surface);
  if (caps) {
    // A vertex that lies only on a cap (its centre) takes the cap's own normal.
    const all = vertexNormals(shade, tri);
    for (let i = 0; i < count; i++) if (nb.off[i] === nb.off[i + 1]) nrm.set(all.subarray(i * 3, i * 3 + 3), i * 3);
  }
  const fibre = FIBRES.has(m.part) ? fibres(p, tri) : null;
  return { pos: p, nrm, curv: curvature(shade, nrm, nb), index: tri, lung: !!lung, fibre, core: null, pick: null };
}

/**
 * Prepares every mesh input flagged `prep`; the others only lend their shape to the lungs' surroundings.
 * Pure arrays (runs in the worker).
 */
export function organArrays(input: OrganInput): { results: (OrganArrays | null)[] } {
  const world = new Map<string, { w: Float32Array; index: Uint32Array | null }>();
  const lookup: PartLookup = (part) => {
    const cached = world.get(part);
    if (cached) return cached;
    const m = input.meshes.find((x) => x.part === part);
    if (!m) return undefined;
    const entry = { w: toWorld(m), index: m.index };
    world.set(part, entry);
    return entry;
  };
  let field: LungField | null | undefined;
  const lungs = () => (field === undefined ? (field = buildLungField(lookup)) : field);
  let skin: ReturnType<typeof skinCore> | null | undefined;
  const core = () => (skin === undefined ? (skin = input.skin ? skinCore(input.skin) : null) : skin);
  return {
    results: input.meshes.map((m) => {
      if (!m.prep) return null;
      return isMuscle(m.part) ? prepareMuscle(m, core) : prepareOne(m, lungs);
    }),
  };
}

/** Body parts of the model (node names "<system>--<part>"), skin layers excluded. */
function organParts(root: THREE.Object3D) {
  const out: { mesh: THREE.Mesh; part: string }[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const [system, part] = (mesh.name || mesh.parent?.name || '').split('--');
    if (system && part && system !== 'skin') out.push({ mesh, part });
  });
  return out;
}

function unitOf(mesh: THREE.Mesh) {
  // Metres per unit of the mesh's own space (the model's node scale is uniform).
  return ((mesh.userData.baseScale as THREE.Vector3 | undefined) ?? mesh.scale).x;
}

/** The baked vertex colour of a muscle region (RGBA, 0 to 1 per channel). */
function tintOf(source: THREE.BufferGeometry) {
  const colour = source.getAttribute('color');
  if (!colour || colour.itemSize !== 4) return null;
  const out = new Float32Array(colour.count * 4);
  for (let i = 0; i < colour.count; i++) {
    out[i * 4] = colour.getX(i);
    out[i * 4 + 1] = colour.getY(i);
    out[i * 4 + 2] = colour.getZ(i);
    out[i * 4 + 3] = colour.getW(i);
  }
  return out;
}

/** Lobe of each vertex of a lung's bronchial tree, from its vertex colour (red upper, green middle, blue lower). */
function lobesOf(source: THREE.BufferGeometry) {
  const colour = source.getAttribute('color');
  if (!colour) return null;
  const out = new Uint8Array(colour.count);
  for (let i = 0; i < colour.count; i++) {
    const r = colour.getX(i);
    const g = colour.getY(i);
    const b = colour.getZ(i);
    const top = Math.max(r, g, b);
    if (top > 0.5) out[i] = top === r ? 1 : top === g ? 2 : 3;
  }
  return out;
}

/** An index buffer as small as the vertex count allows. */
const indexOf = (index: Uint32Array, count: number) =>
  new THREE.BufferAttribute(count > 65535 ? index : Uint16Array.from(index), 1);

/** A mesh queued for (re)preparation and not prepared by this version yet. */
const due = (mesh: THREE.Mesh) =>
  mesh.userData.organQueued === ORGAN_PREP_VERSION && mesh.userData.organPrep !== ORGAN_PREP_VERSION;

/** Sends every queued mesh under `root` to the worker, and swaps in the results. */
function submit(root: THREE.Object3D) {
  const parts = organParts(root);
  const skinMesh = root.getObjectByName('skin--skin') as THREE.Mesh | undefined;
  let skin: OrganInput['skin'] = null;
  if (skinMesh && parts.some(({ mesh, part }) => isMuscle(part) && due(mesh))) {
    skinMesh.updateWorldMatrix(true, false);
    const g = sourceGeometry(skinMesh);
    const index = g.getIndex();
    skin = {
      pos: readPositions(g.getAttribute('position')),
      index: index ? Uint32Array.from(index.array) : null,
      matrix: skinMesh.matrixWorld.toArray(),
    };
  }
  const input: OrganInput = {
    meshes: parts.map(({ mesh, part }) => {
      const source = (mesh.userData.organSource as THREE.BufferGeometry | undefined) ?? mesh.geometry;
      mesh.userData.organSource = source;
      const index = source.getIndex();
      const prep = due(mesh);
      return {
        part,
        pos: readPositions(source.getAttribute('position')),
        index: index ? Uint32Array.from(index.array) : null,
        matrix: restMatrix(mesh).toArray(),
        unit: unitOf(mesh),
        prep,
        lobe: part === 'lung_r' || part === 'lung_l' ? lobesOf(source) : null,
        tint: prep && isMuscle(part) ? tintOf(source) : null,
      };
    }),
    skin,
  };
  runPrep('organs', input, organArrays, ({ results }) => {
    results.forEach((r, i) => {
      if (!r) return;
      const { mesh } = parts[i];
      const count = r.pos.length / 3;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(r.nrm, 3));
      g.setAttribute('aCurv', new THREE.BufferAttribute(r.curv, 2));
      if (r.fibre) g.setAttribute('aFibre', new THREE.BufferAttribute(r.fibre, 4));
      if (r.core) g.setAttribute('aCore', new THREE.BufferAttribute(r.core, 3));
      g.setIndex(indexOf(r.index, count));
      g.computeBoundingBox();
      g.computeBoundingSphere();
      const source = mesh.userData.organSource as THREE.BufferGeometry;
      if (mesh.geometry !== source) mesh.geometry.dispose();
      mesh.geometry = g;
      // Picking: the lungs' new surface, the muscles' light copy, otherwise the original mesh (fewer triangles to
      // test, same space).
      const old = mesh.userData.pickGeometry as THREE.BufferGeometry | undefined;
      if (old?.userData.ownPick) old.dispose();
      let pick: THREE.BufferGeometry = r.lung ? g : source;
      if (r.pick) {
        pick = new THREE.BufferGeometry();
        pick.setAttribute('position', new THREE.BufferAttribute(r.pick.pos, 3));
        pick.setIndex(indexOf(r.pick.index, r.pick.pos.length / 3));
        pick.computeBoundingBox();
        pick.computeBoundingSphere();
        pick.userData.ownPick = true;
      }
      mesh.userData.pickGeometry = pick;
      mesh.userData.organPrep = ORGAN_PREP_VERSION;
    });
  });
}

const queued = new Set<THREE.Object3D>();

/**
 * Refines one organ or bone mesh, once per loaded model (the model stays cached, so remounts cost nothing; a newer
 * ORGAN_PREP_VERSION rebuilds from userData.organSource). The work runs in a worker, batched for the whole model
 * after the caller's traversal (Body3D re-centres heart and lungs as it goes); until it is done the original mesh
 * shows. Positions stay in the mesh's own space, so Body3D's pivots and animations keep working. The original,
 * lighter mesh is kept in userData.pickGeometry for picking.
 */
export function prepareOrganGeometry(mesh: THREE.Mesh) {
  mesh.userData.unit = unitOf(mesh);
  if (mesh.userData.organPrep === ORGAN_PREP_VERSION || mesh.userData.organQueued === ORGAN_PREP_VERSION) return;
  mesh.userData.organQueued = ORGAN_PREP_VERSION;
  let root: THREE.Object3D = mesh;
  while (root.parent) root = root.parent;
  if (queued.has(root)) return;
  queued.add(root);
  queueMicrotask(() => {
    queued.delete(root);
    submit(root);
  });
}
