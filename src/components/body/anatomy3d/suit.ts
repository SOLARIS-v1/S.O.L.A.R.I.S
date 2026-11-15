/**
 * Flight suit for the 3D body: a slim IVA suit, helmet and neck ring, all built at runtime, plus the
 * preparation of the artistic skin.
 *
 * The suit shell is the skin mesh itself: relaxed (so it reads as fabric, not anatomy), subdivided twice for a
 * smooth silhouette, given baked ambient occlusion, and pushed out along its normals by a few millimetres.
 * Panels, seams, stitching, pockets, hardware, gloves, boots and patches are painted and embossed in the fragment
 * shader from world-space landmarks of the BodyParts3D figure (metres, Y-up, facing +Z, 1.72 m tall). Fine
 * detail (weave, stitches, zip teeth) fades in as the camera gets close, so it never shimmers from afar.
 *
 * The chest and shoulder patches are original ASTRA artwork. The NASA insignia is a protected emblem
 * (14 CFR 1221) and is deliberately not used here.
 */
import * as THREE from 'three';
import { runPrep } from './prepRunner';

/** World-space landmarks of the figure, measured from the skin mesh. */
export const BODY = {
  neckCut: 1.488, // suit ends here, inside the helmet
  wrist: 0.945,
  bootTop: 0.19,
  chestPatch: new THREE.Vector2(0.088, 1.29), // wearer's left chest
  nameTape: new THREE.Vector2(-0.083, 1.31), // wearer's right chest
  shoulderPatchY: 1.25, // wearer's right upper arm
  helmet: { center: new THREE.Vector3(0, 1.6, -0.005), radii: new THREE.Vector3(0.135, 0.175, 0.15), bottom: 1.47 },
} as const;

/** X-ray lens shared by skin, suit and helmet: the outer surface is cut away in a circle around the pointer. */
export const LENS_GLSL = /* glsl */ `
  uniform vec2 uLensPos;
  uniform float uLensR;
  uniform float uLens;
  uniform float uFade;
  uniform vec3 uRim;
  float lensHole(out float ring) {
    float d = distance(gl_FragCoord.xy, uLensPos);
    ring = smoothstep(uLensR * 0.72, uLensR * 0.9, d) * (1.0 - smoothstep(uLensR * 0.9, uLensR * 1.05, d)) * uLens;
    return (1.0 - smoothstep(uLensR * 0.78, uLensR, d)) * uLens;
  }
  float bandS(float v, float a, float b, float w) {
    return smoothstep(a - w, a + w, v) * (1.0 - smoothstep(b - w, b + w, v));
  }`;

/** Bump mapping from a procedural height (metres), after Mikkelsen: raised panels, grooved seams, weave. */
const BUMP_GLSL = /* glsl */ `
  vec3 bumpNormal(vec3 surfPos, vec3 n, float h) {
    vec3 sx = dFdx(surfPos);
    vec3 sy = dFdy(surfPos);
    vec3 r1 = cross(sy, n);
    vec3 r2 = cross(n, sx);
    float det = dot(sx, r1);
    if (abs(det) < 1e-14) return n;
    vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
    return normalize(abs(det) * n - grad);
  }
  float inBox(vec2 uv) {
    return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  }
  float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  // Value noise, for drape, fold irregularity and wear.
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }
  // Fabric compression folds across coordinate u: wavy, tilted crests that come and go, never a regular rib.
  // Folds fade out once their crests get closer than about a pixel on screen (grazing or distant views), so they
  // never alias into stripes.
  // The noise (warp, gate) is computed once per fragment and shared by every fold: each inlined value-noise call
  // made the suit shader take seconds longer to compile on Windows/Direct3D.
  float fold(float u, float freq, float warp, float gate) {
    float phase = u * freq;
    float aa = 1.0 - smoothstep(0.6, 1.4, fwidth(phase));
    float crest = pow(0.5 + 0.5 * sin(phase + warp), 3.0);
    return crest * gate * aa;
  }`;

export interface LensUniforms {
  uLensPos: { value: THREE.Vector2 };
  uLensR: { value: number };
  uLens: { value: number };
  uRim: { value: THREE.Color };
}

/* ------------------------------------------------------------------ mesh processing */

const smooth01 = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Vertex adjacency in compressed rows: the neighbours of vertex i are adj[off[i]] .. adj[off[i + 1] - 1]. */
export interface Adjacency {
  off: Int32Array;
  adj: Int32Array;
}

/** Scratch copy for relax(), reused so smoothing loops allocate nothing. */
let relaxPrev = new Float32Array(0);

/** Moves each weighted vertex toward the average of its neighbours (all at once, from the previous positions). */
export function relax(p: Float32Array, nb: Adjacency, factor: number, weight?: Float32Array) {
  if (relaxPrev.length < p.length) relaxPrev = new Float32Array(p.length);
  const prev = relaxPrev;
  prev.set(p);
  const { off, adj } = nb;
  const count = off.length - 1;
  for (let i = 0; i < count; i++) {
    const w = weight ? weight[i] : 1;
    const s = off[i];
    const e = off[i + 1];
    if (!w || s === e) continue;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let k = s; k < e; k++) {
      const j = adj[k] * 3;
      x += prev[j];
      y += prev[j + 1];
      z += prev[j + 2];
    }
    const len = e - s;
    const f = (factor * w) / len;
    p[i * 3] += (x - prev[i * 3] * len) * f;
    p[i * 3 + 1] += (y - prev[i * 3 + 1] * len) * f;
    p[i * 3 + 2] += (z - prev[i * 3 + 2] * len) * f;
  }
}

/** Taubin smoothing (shrink, then inflate): removes surface detail without thinning the figure. */
export function taubin(p: Float32Array, nb: Adjacency, iterations: number, weight?: Float32Array) {
  for (let it = 0; it < iterations; it++) {
    relax(p, nb, 0.5, weight);
    relax(p, nb, -0.53, weight);
  }
}

/** Mean of each vertex's neighbours for a scalar field, written to `out`. */
export function neighbourMean(f: Float32Array, nb: Adjacency, out: Float32Array) {
  const { off, adj } = nb;
  for (let i = 0; i < off.length - 1; i++) {
    const s = off[i];
    const e = off[i + 1];
    if (s === e) {
      out[i] = f[i];
      continue;
    }
    let sum = 0;
    for (let k = s; k < e; k++) sum += f[adj[k]];
    out[i] = sum / (e - s);
  }
  return out;
}

/** Each vertex's distinct neighbours, from the triangle list. */
export function neighbours(count: number, tri: Uint32Array): Adjacency {
  const start = new Int32Array(count + 1);
  for (let t = 0; t < tri.length; t++) start[tri[t] + 1] += 2;
  for (let i = 0; i < count; i++) start[i + 1] += start[i];
  const fill = start.slice(0, count);
  const raw = new Int32Array(start[count]);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t];
    const b = tri[t + 1];
    const c = tri[t + 2];
    raw[fill[a]++] = b;
    raw[fill[a]++] = c;
    raw[fill[b]++] = a;
    raw[fill[b]++] = c;
    raw[fill[c]++] = a;
    raw[fill[c]++] = b;
  }
  // An edge shared by two triangles is listed twice: sort each row and keep one of each.
  const off = new Int32Array(count + 1);
  const adj = new Int32Array(raw.length);
  let n = 0;
  for (let i = 0; i < count; i++) {
    off[i] = n;
    const row = raw.subarray(start[i], start[i + 1]);
    row.sort();
    for (let k = 0; k < row.length; k++) if (k === 0 || row[k] !== row[k - 1]) adj[n++] = row[k];
  }
  off[count] = n;
  return { off, adj: adj.slice(0, n) };
}

/**
 * Welds the skin mesh (split vertices share a position) so it can be processed as one surface. Positions are the
 * mesh's own (already read from the quantized attribute), optionally transformed by a column-major matrix.
 */
function weld(raw: Float32Array, index: Uint32Array | null, matrix?: ArrayLike<number>) {
  const count = raw.length / 3;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < raw.length; i++) {
    const k = i % 3;
    if (raw[i] < lo[k]) lo[k] = raw[i];
    if (raw[i] > hi[k]) hi[k] = raw[i];
  }
  // 17 bits per axis over the bounding box (finer than the int16 source): one exact integer key per position.
  const q = [0, 1, 2].map((k) => 131071 / Math.max(hi[k] - lo[k], 1e-9));
  const map = new Int32Array(count);
  const keys = new Map<number, number>();
  const pos: number[] = [];
  for (let i = 0; i < count; i++) {
    const kx = Math.round((raw[i * 3] - lo[0]) * q[0]);
    const ky = Math.round((raw[i * 3 + 1] - lo[1]) * q[1]);
    const kz = Math.round((raw[i * 3 + 2] - lo[2]) * q[2]);
    const key = (kx * 131072 + ky) * 131072 + kz;
    let id = keys.get(key);
    if (id === undefined) {
      id = pos.length / 3;
      keys.set(key, id);
      pos.push(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]);
    }
    map[i] = id;
  }
  const p = new Float32Array(pos);
  if (matrix) transformPoints(p, matrix);
  const tri = index ? Uint32Array.from(index, (i) => map[i]) : Uint32Array.from(map);
  return { p, tri };
}

/**
 * Splits every triangle into four at its edge midpoints. Each attribute is interpolated the same way, so
 * parallel data (a smoothed copy, ambient occlusion) stays aligned with the positions.
 */
export function subdivide(tri: Uint32Array, count: number, attrs: { data: Float32Array; size: number }[]) {
  const ids = new Map<number, number>();
  const ends: number[] = [];
  const BIG = 1 << 22;
  const edge = (a: number, b: number) => {
    const key = a < b ? a * BIG + b : b * BIG + a;
    let id = ids.get(key);
    if (id === undefined) {
      id = count + ends.length / 2;
      ids.set(key, id);
      ends.push(a, b);
    }
    return id;
  };
  const out = new Uint32Array(tri.length * 4);
  for (let t = 0, o = 0; t < tri.length; t += 3, o += 12) {
    const a = tri[t];
    const b = tri[t + 1];
    const c = tri[t + 2];
    const ab = edge(a, b);
    const bc = edge(b, c);
    const ca = edge(c, a);
    out[o] = a;
    out[o + 1] = ab;
    out[o + 2] = ca;
    out[o + 3] = ab;
    out[o + 4] = b;
    out[o + 5] = bc;
    out[o + 6] = ca;
    out[o + 7] = bc;
    out[o + 8] = c;
    out[o + 9] = ab;
    out[o + 10] = bc;
    out[o + 11] = ca;
  }
  const total = count + ends.length / 2;
  const data = attrs.map(({ data: d, size }) => {
    const next = new Float32Array(total * size);
    next.set(d.subarray(0, count * size));
    for (let e = 0; e < ends.length / 2; e++) {
      const a = ends[e * 2] * size;
      const b = ends[e * 2 + 1] * size;
      const m = (count + e) * size;
      for (let k = 0; k < size; k++) next[m + k] = (d[a + k] + d[b + k]) * 0.5;
    }
    return next;
  });
  return { tri: out, count: total, data };
}

/** Area-weighted vertex normals. */
export function vertexNormals(p: Float32Array, tri: Uint32Array) {
  const n = new Float32Array(p.length);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3;
    const b = tri[t + 1] * 3;
    const c = tri[t + 2] * 3;
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    n[a] += cx;
    n[a + 1] += cy;
    n[a + 2] += cz;
    n[b] += cx;
    n[b + 1] += cy;
    n[b + 2] += cz;
    n[c] += cx;
    n[c + 1] += cy;
    n[c + 2] += cz;
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

/** Evenly spread directions on the unit sphere (Fibonacci lattice), flattened. */
const AO_RAYS = 40;
const AO_DIRS = Float32Array.from({ length: AO_RAYS * 3 }, (_, k) => {
  const i = Math.floor(k / 3);
  const y = 1 - ((i + 0.5) / AO_RAYS) * 2;
  const r = Math.sqrt(1 - y * y);
  const a = i * Math.PI * (3 - Math.sqrt(5));
  return [Math.cos(a) * r, y, Math.sin(a) * r][k % 3];
});

/**
 * Ambient occlusion baked per vertex (world space, metres): the surface is voxelized, then rays are marched over
 * the outward hemisphere. Armpits, the crotch, between the legs and fingers get soft contact shadows.
 */
function bakeAO(p: Float32Array, n: Float32Array, nb: Adjacency) {
  const cell = 0.012;
  const inv = 1 / cell;
  const count = p.length / 3;
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < count; i++) {
    x0 = Math.min(x0, p[i * 3]);
    y0 = Math.min(y0, p[i * 3 + 1]);
    z0 = Math.min(z0, p[i * 3 + 2]);
    x1 = Math.max(x1, p[i * 3]);
    y1 = Math.max(y1, p[i * 3 + 1]);
    z1 = Math.max(z1, p[i * 3 + 2]);
  }
  const dx = Math.ceil((x1 - x0) * inv) + 2;
  const dy = Math.ceil((y1 - y0) * inv) + 2;
  const dz = Math.ceil((z1 - z0) * inv) + 2;
  const grid = new Uint8Array(dx * dy * dz);
  for (let i = 0; i < count; i++) {
    const gi = Math.floor((p[i * 3] - x0) * inv);
    const gj = Math.floor((p[i * 3 + 1] - y0) * inv);
    const gk = Math.floor((p[i * 3 + 2] - z0) * inv);
    grid[gi + dx * (gj + dy * gk)] = 1;
  }

  const ao = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const nx = n[i * 3];
    const ny = n[i * 3 + 1];
    const nz = n[i * 3 + 2];
    const px = p[i * 3] + nx * 0.01 - x0;
    const py = p[i * 3 + 1] + ny * 0.01 - y0;
    const pz = p[i * 3 + 2] + nz * 0.01 - z0;
    let occ = 0;
    let tot = 0;
    for (let r = 0; r < AO_RAYS * 3; r += 3) {
      const rx = AO_DIRS[r];
      const ry = AO_DIRS[r + 1];
      const rz = AO_DIRS[r + 2];
      const c = rx * nx + ry * ny + rz * nz;
      if (c < 0.3) continue;
      tot += c;
      // March in steps a little under a cell, so no voxel is skipped.
      for (let t = 0.04; t <= 0.24; t += 0.011) {
        const gi = Math.floor((px + rx * t) * inv);
        const gj = Math.floor((py + ry * t) * inv);
        const gk = Math.floor((pz + rz * t) * inv);
        if (gi < 0 || gj < 0 || gk < 0 || gi >= dx || gj >= dy || gk >= dz) break;
        if (grid[gi + dx * (gj + dy * gk)]) {
          occ += c * (1 - (t - 0.04) * 2.5);
          break;
        }
      }
    }
    ao[i] = tot ? 1 - occ / tot : 1;
  }
  // Soften: two passes of neighbour averaging (the vertex itself counts once).
  const prev = new Float32Array(count);
  for (let pass = 0; pass < 2; pass++) {
    prev.set(ao);
    for (let i = 0; i < count; i++) {
      let s = prev[i];
      for (let k = nb.off[i]; k < nb.off[i + 1]; k++) s += prev[nb.adj[k]];
      ao[i] = s / (nb.off[i + 1] - nb.off[i] + 1);
    }
  }
  return ao;
}

/**
 * Bumped whenever the body preparation changes: a model already prepared by older code (kept in memory across hot
 * reloads and page visits) is rebuilt from its original mesh instead of being shown stale. The organs have their own
 * ORGAN_PREP_VERSION (organGeometry.ts); 15 and 16 came with the muscles, new organs and vessels.
 */
export const PREP_VERSION = 16;

/** The skin as loaded from the file, before prepareSkin replaced it. */
export function sourceGeometry(skin: THREE.Mesh): THREE.BufferGeometry {
  return (skin.userData.source as THREE.BufferGeometry | undefined) ?? skin.geometry;
}

/** What the suit and skin preparation needs from the skin mesh: its own positions and indices, and its world matrix. */
export interface SkinInput {
  pos: Float32Array;
  index: Uint32Array | null;
  matrix: number[];
}

/** Positions as plain floats, read through the accessor rules (the model is quantized: normalized int16). */
export function readPositions(src: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const n = src.count;
  const out = new Float32Array(n * 3);
  if (!(src instanceof THREE.InterleavedBufferAttribute) && src.itemSize === 3) {
    const a = src.array;
    if (a instanceof Float32Array) {
      out.set(a.subarray(0, n * 3));
      return out;
    }
    if (a instanceof Int16Array && src.normalized) {
      for (let i = 0; i < n * 3; i++) out[i] = Math.max(a[i] / 32767, -1);
      return out;
    }
  }
  for (let i = 0; i < n; i++) {
    out[i * 3] = src.getX(i);
    out[i * 3 + 1] = src.getY(i);
    out[i * 3 + 2] = src.getZ(i);
  }
  return out;
}

function skinInput(skin: THREE.Mesh): SkinInput {
  skin.updateWorldMatrix(true, false);
  const g = sourceGeometry(skin);
  const index = g.getIndex();
  return {
    pos: readPositions(g.getAttribute('position')),
    index: index ? Uint32Array.from(index.array) : null,
    matrix: skin.matrixWorld.toArray(),
  };
}

/** Relaxes a small round area flat (used for the navel pocket), weights from world landmarks. */
function smoothSpot(p: Float32Array, world: Float32Array, nb: Adjacency, c: THREE.Vector3, r: number) {
  const n = p.length / 3;
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(world[i * 3] - c.x, world[i * 3 + 1] - c.y, world[i * 3 + 2] - c.z);
    w[i] = 1 - smooth01(r * 0.6, r, d);
  }
  for (let it = 0; it < 60; it++) relax(p, nb, 0.6, w);
}
const NAVEL = new THREE.Vector3(0, 1.03, 0.097);

/**
 * Unisex figure: relaxes the genitals into a smooth surface, like a mannequin. Plain Laplacian relaxation collapses
 * the protrusion into the surrounding surface (clamping it instead folds the mesh). `world` holds the same vertices
 * in world space (metres, Y-up, facing +Z) and only drives the weights; `top` is where the smoothing fades out.
 */
function smoothGroin(p: Float32Array, world: Float32Array, nb: Adjacency, top: number) {
  const n = p.length / 3;
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = Math.abs(world[i * 3]);
    const y = world[i * 3 + 1];
    const z = world[i * 3 + 2];
    w[i] = (1 - smooth01(0.06, 0.1, x)) * smooth01(0.69, 0.74, y) * (1 - smooth01(top - 0.05, top, y)) *
      smooth01(-0.03, 0.02, z);
  }
  for (let it = 0; it < 180; it++) relax(p, nb, 0.7, w);
}

/**
 * The thighs of the source figure nearly touch below the crotch, which leaves a deep, dark slit where the legs meet
 * the pelvis. The inner thighs are eased apart a few millimetres just below the crotch (nothing moves on the
 * midline) and the area is rounded off, so the legs meet in a smooth arch like a mannequin's.
 */
function openCrotch(p: Float32Array, world: Float32Array, nb: Adjacency, scale: number) {
  const n = p.length / 3;
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = world[i * 3];
    const y = world[i * 3 + 1];
    const z = world[i * 3 + 2];
    const k = smooth01(0.54, 0.66, y) * (1 - smooth01(0.74, 0.8, y)) * (1 - smooth01(0.03, 0.09, Math.abs(x))) *
      (1 - smooth01(0.05, 0.09, Math.abs(z)));
    // Outward from the midline, fading to nothing on it, so the two sides part without tearing.
    p[i * 3] += (((0.011 * x) / (Math.abs(x) + 0.006)) * k) / scale;
    w[i] = Math.min(1, k * 1.5) * (1 - smooth01(0.78, 0.82, y));
  }
  taubin(p, nb, 40, w);
  // Then fill the apex where the inner thighs meet into a rounder arch (plain relaxation fills a notch).
  const apex = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const y = world[i * 3 + 1];
    apex[i] = (1 - smooth01(0.02, 0.05, Math.abs(world[i * 3]))) * smooth01(0.64, 0.68, y) *
      (1 - smooth01(0.74, 0.78, y)) * (1 - smooth01(0.04, 0.08, Math.abs(world[i * 3 + 2])));
  }
  for (let it = 0; it < 40; it++) relax(p, nb, 0.5, apex);
}

/** Eyes: centres of the eyeballs (BodyParts3D) and the radius of the closed lids over them, in metres. */
const EYE = { x: 0.03, y: 1.596, z: 0.0515, r: 0.0141 } as const;

/**
 * Closed eyelids for the mannequin face. The source skin is open at the eyes (a tunnel through the shell, with the
 * skull showing through), so a lid is laid over each eyeball: a patch of a sphere just outside it, its rim tucked
 * back under the surrounding skin, with a faint line where the lids meet. Returned in world space, with the
 * attributes the skin needs (core = the eye's centre, occlusion slightly lower than the open face).
 */
function eyelids() {
  const COLS = 26;
  const ROWS = 18;
  const pos: number[] = [];
  const ao: number[] = [];
  const core: number[] = [];
  const tri: number[] = [];
  for (const side of [-1, 1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= ROWS; j++) {
      const v = (j / ROWS) * 2 - 1;
      for (let i = 0; i <= COLS; i++) {
        const u = (i / COLS) * 2 - 1;
        // Wider than tall, the outer corner a little higher (the palpebral fissure tilts up laterally). The patch
        // is almond-shaped: its rim dives well under the surrounding skin, so no edge of it ever shows.
        const theta = u * 1.25;
        const phi = v * 0.55 + u * side * 0.06;
        const edge = Math.min(1, Math.hypot(u, v));
        const r = EYE.r - 0.009 * smooth01(0.78, 1, edge);
        pos.push(
          side * EYE.x + r * Math.sin(theta) * Math.cos(phi),
          EYE.y + r * Math.sin(phi),
          EYE.z + r * Math.cos(theta) * Math.cos(phi),
        );
        const seam = Math.exp(-(((v + 0.12) / 0.07) ** 2));
        ao.push((0.74 - 0.3 * smooth01(0.6, 1, edge)) * (1 - 0.4 * seam));
        core.push(side * EYE.x, EYE.y, EYE.z);
      }
    }
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const a = base + j * (COLS + 1) + i;
        const b = a + 1;
        const c = a + COLS + 1;
        const d = c + 1;
        // u runs toward +x and v toward +y: counter-clockwise seen from the front.
        tri.push(a, b, d, a, d, c);
      }
    }
  }
  return { pos: new Float32Array(pos), ao: new Float32Array(ao), core: new Float32Array(core), tri };
}

/** Transforms packed xyz positions by a column-major 4x4 matrix, in place. */
function transformPoints(p: Float32Array, e: ArrayLike<number>) {
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i];
    const y = p[i + 1];
    const z = p[i + 2];
    p[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    p[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    p[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
  return p;
}

/** Prepared skin arrays (the mesh's own space): positions, shading normals, occlusion, core points, indices. */
export interface SkinArrays {
  pos: Float32Array;
  nrm: Float32Array;
  ao: Float32Array;
  core: Float32Array;
  index: Uint32Array;
}

/**
 * The artistic skin: one subdivision for a smooth silhouette, shading normals from a relaxed copy (the low-poly
 * facets disappear while the outline stays anatomically exact) and baked ambient occlusion. The figure is made a
 * neutral mannequin: no genitals, a smooth navel and crotch, closed eyes. Pure arrays (runs in the worker).
 */
export function skinArrays(input: SkinInput): SkinArrays {
  const matrix = new THREE.Matrix4().fromArray(input.matrix);
  const scale = matrix.getMaxScaleOnAxis();
  const { p, tri } = weld(input.pos, input.index);
  const count = p.length / 3;
  // Unisex figure: no genitals. Weights come from world landmarks, relaxation runs in the mesh's own space.
  const landmarks = transformPoints(p.slice(), input.matrix);
  const nb0 = neighbours(count, tri);
  smoothGroin(p, landmarks, nb0, 0.9);
  smoothSpot(p, landmarks, nb0, NAVEL, 0.03);
  openCrotch(p, landmarks, nb0, scale);
  const shade = p.slice();
  taubin(shade, nb0, 60);
  // Core: the surface shrunk toward its centre lines (both skin layers collapse to the same place). The x-ray
  // lens uses it to tell the near half of the body, which it cuts away, from the far half, which it keeps as
  // the cavity wall behind the organs. Face direction can't tell them apart: the skin is a hollow shell whose
  // inner surface faces the organs.
  const core = p.slice();
  for (let it = 0; it < 200; it++) relax(core, nb0, 0.6);
  const s = subdivide(tri, count, [
    { data: p, size: 3 },
    { data: shade, size: 3 },
    { data: core, size: 3 },
  ]);
  const nb = neighbours(s.count, s.tri);
  const [pos, shade1, core1] = s.data;
  taubin(pos, nb, 3);
  taubin(shade1, nb, 3);

  const world = transformPoints(pos.slice(), input.matrix);
  const ao = bakeAO(world, vertexNormals(world, s.tri), nb);
  const enclosed = ao.map((a) => (a < 0.2 ? 1 : 0));
  // A mannequin's crotch is a soft, open curve: the cleft's occlusion is halved so it doesn't read as a slit.
  // Fingers and toes are thinner than the occlusion grid (12 mm cells), which darkens their tips falsely: there
  // the occlusion fades out with the distance to the core.
  const coreWorld = transformPoints(core1.slice(), input.matrix);
  for (let i = 0; i < s.count; i++) {
    const thick = Math.hypot(world[i * 3] - coreWorld[i * 3], world[i * 3 + 1] - coreWorld[i * 3 + 1],
      world[i * 3 + 2] - coreWorld[i * 3 + 2]);
    ao[i] += (1 - ao[i]) * 0.75 * (1 - smooth01(0.008, 0.02, thick));
    const cleft = (1 - smooth01(0.03, 0.07, Math.abs(world[i * 3]))) * smooth01(0.62, 0.68, world[i * 3 + 1]) *
      (1 - smooth01(0.76, 0.8, world[i * 3 + 1])) * (1 - smooth01(0.05, 0.09, Math.abs(world[i * 3 + 2])));
    ao[i] += (1 - ao[i]) * 0.5 * cleft;
  }
  const nrm = vertexNormals(shade1, s.tri);
  // The heavily relaxed copy can turn the normals of thin tips (fingers, toes) away from the real surface, which
  // shades them dark: where the two disagree, the shading follows the real surface.
  const geo = vertexNormals(pos, s.tri);
  for (let i = 0; i < s.count; i++) {
    const d = nrm[i * 3] * geo[i * 3] + nrm[i * 3 + 1] * geo[i * 3 + 1] + nrm[i * 3 + 2] * geo[i * 3 + 2];
    const w = 1 - smooth01(0.3, 0.85, d);
    if (!w) continue;
    const x = nrm[i * 3] + (geo[i * 3] - nrm[i * 3]) * w;
    const y = nrm[i * 3 + 1] + (geo[i * 3 + 1] - nrm[i * 3 + 1]) * w;
    const z = nrm[i * 3 + 2] + (geo[i * 3 + 2] - nrm[i * 3 + 2]) * w;
    const l = Math.hypot(x, y, z) || 1;
    nrm[i * 3] = x / l;
    nrm[i * 3 + 1] = y / l;
    nrm[i * 3 + 2] = z / l;
  }
  // The inner layer of the shell runs only 2-4 mm under the outer one and pokes through it in places (fingertips,
  // shins, neck). It faces the organs (its normal points toward the core) and is fully occluded: ease it 1.5 mm
  // deeper so the outer surface always wins.
  const deeper = 0.0015 / scale;
  for (let i = 0; i < s.count; i++) {
    let out = 0;
    for (let k = 0; k < 3; k++) out += nrm[i * 3 + k] * (pos[i * 3 + k] - core1[i * 3 + k]);
    if (out >= 0 || !enclosed[i]) continue;
    for (let k = 0; k < 3; k++) pos[i * 3 + k] += nrm[i * 3 + k] * deeper;
  }

  // Closed eyelids, appended in the mesh's own space.
  const lids = eyelids();
  const toLocal = matrix.clone().invert().elements;
  transformPoints(lids.pos, toLocal);
  transformPoints(lids.core, toLocal);
  const lidTri = Uint32Array.from(lids.tri);
  const lidNrm = vertexNormals(lids.pos, lidTri);
  const index = new Uint32Array(s.tri.length + lidTri.length);
  index.set(s.tri);
  for (let i = 0; i < lidTri.length; i++) index[s.tri.length + i] = lidTri[i] + s.count;
  return {
    pos: join(pos, lids.pos),
    nrm: join(nrm, lidNrm),
    ao: join(ao, lids.ao),
    core: join(core1, lids.core),
    index,
  };
}

/** Two float arrays end to end. */
function join(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/**
 * Prepares the artistic skin once per loaded model (the model stays cached, so remounts cost nothing). The work
 * runs in a worker: until it is done the skin draws nothing (it only fades in after the entrance scan), then the
 * same geometry object is filled in place, so the glass twin that shares it updates too. The loaded mesh is kept
 * in userData.source, so a newer PREP_VERSION rebuilds from it.
 */
/**
 * An empty mesh that already has the finished mesh's attributes. Shaders are compiled in the background before the
 * worker is done, and a mesh without normals compiles as FLAT_SHADED: a different program from the finished one,
 * which then had to be rebuilt on first draw (seconds of frozen page on Windows).
 */
function emptyGeometry(extra: Record<string, number>) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(0), 3));
  for (const [name, size] of Object.entries(extra)) {
    g.setAttribute(name, new THREE.BufferAttribute(new Float32Array(0), size));
  }
  return g;
}

export function prepareSkin(skin: THREE.Mesh) {
  if (skin.userData.prepVersion === PREP_VERSION) return;
  const input = skinInput(skin);
  const source = sourceGeometry(skin);
  if (skin.geometry !== source) skin.geometry.dispose();
  const g = emptyGeometry({ aAO: 1, aCore: 3 });
  skin.geometry = g;
  skin.userData.source = source;
  skin.userData.prepVersion = PREP_VERSION;
  runPrep('skin', input, skinArrays, (r) => {
    g.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(r.nrm, 3));
    g.setAttribute('aAO', new THREE.BufferAttribute(r.ao, 1));
    g.setAttribute('aCore', new THREE.BufferAttribute(r.core, 3));
    g.setIndex(new THREE.BufferAttribute(r.index, 1));
    g.computeBoundingSphere();
  });
}

/** Prepared suit shell arrays (world space) and the centre of the shoulder tab (z, y). */
export interface SuitArrays {
  pos: Float32Array;
  nrm: Float32Array;
  ao: Float32Array;
  pn: Float32Array;
  index: Uint32Array;
  shoulder: Float32Array;
}

/** Builds the suit shell from the original skin mesh, in world space. Pure arrays (runs in the worker). */
export function suitArrays(input: SkinInput): SuitArrays {
  const { p, tri } = weld(input.pos, input.index, input.matrix);
  const n0 = p.length / 3;
  const nb0 = neighbours(n0, tri);

  smoothGroin(p, p, nb0, 0.93);
  smoothSpot(p, p, nb0, NAVEL, 0.03);
  taubin(p, nb0, 16);
  // Panel normals: from a much smoother copy, so panel edges and piping run in clean curves.
  const panel = p.slice();
  taubin(panel, nb0, 40);
  const pn0 = vertexNormals(panel, tri);

  // Level 1: smooth, then bake occlusion (dense enough for the voxel grid, cheap enough to trace).
  const s1 = subdivide(tri, n0, [
    { data: p, size: 3 },
    { data: pn0, size: 3 },
  ]);
  const nb1 = neighbours(s1.count, s1.tri);
  const [p1, pn1] = s1.data;
  taubin(p1, nb1, 3);
  const ao1 = bakeAO(p1, vertexNormals(p1, s1.tri), nb1);

  // Level 2: the final, finely tessellated shell carries occlusion and panel normals along.
  const s2 = subdivide(s1.tri, s1.count, [
    { data: p1, size: 3 },
    { data: ao1, size: 1 },
    { data: pn1, size: 3 },
  ]);
  const [p2, ao2, pn2] = s2.data;
  const nb2 = neighbours(s2.count, s2.tri);
  taubin(p2, nb2, 2);
  const nrm = vertexNormals(p2, s2.tri);

  let armY = 0;
  let armZ = 0;
  let armCount = 0;
  for (let i = 0; i < s2.count; i++) {
    const x = p2[i * 3];
    const y = p2[i * 3 + 1];
    const limb = smooth01(0.188, 0.205, Math.abs(x));
    const hand = limb * (1 - smooth01(BODY.wrist - 0.01, BODY.wrist, y));
    const boot = 1 - smooth01(BODY.bootTop - 0.01, BODY.bootTop, y);
    // A real garment stands off the body: looser on the torso and legs, close-fitting gloves, sturdy boots.
    const cloth = 0.0125 - 0.0015 * limb;
    const off = cloth + (0.0045 - cloth) * hand + (0.014 - cloth) * boot;
    for (let k = 0; k < 3; k++) p2[i * 3 + k] += nrm[i * 3 + k] * off;
    // Outer face of the right upper arm: centre for the shoulder tab.
    if (x < -0.2 && Math.abs(y - BODY.shoulderPatchY) < 0.02 && nrm[i * 3] < -0.6) {
      armY += y;
      armZ += p2[i * 3 + 2];
      armCount++;
    }
  }
  // Round off the offset surface where the push-out met (armpits, crotch).
  taubin(p2, nb2, 2);
  const shoulder = Float32Array.of(-0.01, BODY.shoulderPatchY);
  if (armCount) shoulder.set([armZ / armCount, armY / armCount]);
  return { pos: p2, nrm: vertexNormals(p2, s2.tri), ao: ao2, pn: pn2, index: s2.tri, shoulder };
}

/**
 * Builds the suit shell from the original skin mesh, in world space. The work runs in a worker: the returned
 * geometry is empty until it is done (the suit only fades in after the entrance scan) and is then filled in place;
 * the shoulder tab's centre is updated in place too.
 */
export function buildSuitGeometry(skin: THREE.Mesh) {
  const input = skinInput(skin);
  const geometry = emptyGeometry({ aAO: 1, aPN: 3 });
  const shoulder = new THREE.Vector2(-0.01, BODY.shoulderPatchY);
  runPrep('suit', input, suitArrays, (r) => {
    geometry.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(r.nrm, 3));
    geometry.setAttribute('aAO', new THREE.BufferAttribute(r.ao, 1));
    geometry.setAttribute('aPN', new THREE.BufferAttribute(r.pn, 3));
    geometry.setIndex(new THREE.BufferAttribute(r.index, 1));
    geometry.computeBoundingSphere();
    shoulder.set(r.shoulder[0], r.shoulder[1]);
  });
  return { geometry, shoulder };
}

/* ------------------------------------------------------------------ patch artwork */

/**
 * Atlas (1024 x 1024): top-left the round ASTRA mission patch, top-right the shoulder tab, and below them the
 * crew member's name tape.
 */
export function makePatchTexture(name = '') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d')!;
  const font = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif';
  const brand = (x0: number, y0: number, x1: number, y1: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, '#7cc4ff');
    gr.addColorStop(1, '#b4a5ff');
    return gr;
  };
  /** The ASTRA mark: a planet ring, a tilted orbit and a craft. */
  const mark = (cx: number, cy: number, s: number) => {
    g.save();
    g.translate(cx, cy);
    g.lineCap = 'round';
    g.strokeStyle = brand(-s, -s, s, s);
    g.lineWidth = s * 0.14;
    g.beginPath();
    g.arc(0, 0, s * 0.38, 0, Math.PI * 2);
    g.stroke();
    g.rotate((-28 * Math.PI) / 180);
    g.lineWidth = s * 0.09;
    g.beginPath();
    g.ellipse(0, 0, s * 0.82, s * 0.33, 0, 0, Math.PI * 2);
    g.stroke();
    g.rotate((28 * Math.PI) / 180);
    g.fillStyle = '#7cc4ff';
    g.beginPath();
    g.arc(s * 0.66, -s * 0.34, s * 0.13, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  const arcText = (text: string, cx: number, cy: number, r: number, top: boolean) => {
    g.save();
    g.translate(cx, cy);
    g.font = `700 40px ${font}`;
    g.fillStyle = '#eef3ff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const step = 0.155;
    const start = -((text.length - 1) * step) / 2;
    for (let i = 0; i < text.length; i++) {
      const a = start + i * step;
      g.save();
      if (top) {
        g.rotate(a);
        g.translate(0, -r);
      } else {
        g.rotate(-a);
        g.translate(0, r);
      }
      g.fillText(text[i], 0, 0);
      g.restore();
    }
    g.restore();
  };

  // Round mission patch.
  const cx = 256;
  const cy = 256;
  g.fillStyle = '#d6dde8';
  g.beginPath();
  g.arc(cx, cy, 250, 0, Math.PI * 2);
  g.fill();
  const field = g.createRadialGradient(cx - 60, cy - 80, 20, cx, cy, 236);
  field.addColorStop(0, '#24386e');
  field.addColorStop(1, '#0a1230');
  g.fillStyle = field;
  g.beginPath();
  g.arc(cx, cy, 236, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(cx, cy, 236, 0, Math.PI * 2);
  g.clip();
  const mars = g.createRadialGradient(cx + 80, cy + 150, 10, cx + 110, cy + 210, 190);
  mars.addColorStop(0, '#f08a5d');
  mars.addColorStop(1, '#6e2416');
  g.fillStyle = mars;
  g.beginPath();
  g.arc(cx + 120, cy + 230, 170, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.fillStyle = '#ffffff';
  for (const [sx, sy, r] of [[150, 170, 7], [372, 150, 6], [120, 300, 5], [330, 238, 5]]) {
    g.beginPath();
    g.arc(sx, sy, r, 0, Math.PI * 2);
    g.fill();
  }
  mark(cx, cy - 6, 120);
  g.strokeStyle = 'rgba(214,221,232,0.9)';
  g.lineWidth = 4;
  g.beginPath();
  g.arc(cx, cy, 168, 0, Math.PI * 2);
  g.stroke();
  arcText('SOLARIS', cx, cy, 202, true);
  arcText('MERIDIAN-1', cx, cy, 202, false);

  // Shoulder tab.
  const tx = 768;
  const ty = 256;
  g.fillStyle = '#d6dde8';
  g.beginPath();
  g.roundRect(tx - 236, ty - 112, 472, 224, 40);
  g.fill();
  g.fillStyle = '#0c1634';
  g.beginPath();
  g.roundRect(tx - 224, ty - 100, 448, 200, 30);
  g.fill();
  mark(tx - 130, ty, 74);
  g.font = `700 96px ${font}`;
  g.fillStyle = '#eef3ff';
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillText('SOLARIS', tx - 60, ty + 4);

  // Name tape (x 12-1012, y 530-750).
  if (name) {
    g.fillStyle = '#d6dde8';
    g.beginPath();
    g.roundRect(12, 530, 1000, 220, 26);
    g.fill();
    g.fillStyle = '#0c1634';
    g.beginPath();
    g.roundRect(24, 542, 976, 196, 18);
    g.fill();
    mark(112, 640, 64);
    const label = name.toUpperCase();
    let size = 108;
    g.font = `700 ${size}px ${font}`;
    while (g.measureText(label).width > 770 && size > 40) {
      size -= 4;
      g.font = `700 ${size}px ${font}`;
    }
    g.fillStyle = '#eef3ff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 592, 646);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------------------------------------------------ materials */

/**
 * Shared vertex stage. The suit shell (`shell`) also carries baked occlusion and panel normals, and its chest
 * rises and falls with the crew member's breathing.
 */
const suitVertex = (shader: { vertexShader: string }, shell: boolean) => {
  shader.vertexShader = shader.vertexShader
    .replace(
      'void main() {',
      `varying vec3 vSP;\nvarying vec3 vSN;\nvarying vec3 vHL;\n${
        shell ? 'attribute float aAO;\nattribute vec3 aPN;\nvarying float vAO;\nvarying vec3 vPN;\nuniform float uBreath;\n' : ''
      }void main() {`,
    )
    .replace(
      '#include <begin_vertex>',
      shell
        ? `#include <begin_vertex>
          transformed += objectNormal * uBreath * 0.004 * smoothstep(1.0, 1.14, position.y)
            * (1.0 - smoothstep(1.34, 1.44, position.y)) * (1.0 - smoothstep(0.15, 0.2, abs(position.x)))
            * smoothstep(-0.05, 0.05, position.z);`
        : '#include <begin_vertex>',
    )
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vSP = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vSN = normalize(mat3(modelMatrix) * objectNormal);
      vHL = position;${shell ? '\nvAO = aAO;\nvPN = aPN;' : ''}`,
    );
};

export function makeSuitUniforms(lens: LensUniforms, shoulder: THREE.Vector2, patch: THREE.Texture) {
  return {
    ...lens,
    uFade: { value: 0 },
    /** 0 = exhaled, 1 = inhaled. */
    uBreath: { value: 0 },
    uPatch: { value: patch },
    uShoulder: { value: shoulder },
    cWhite: { value: new THREE.Color('#e9ecf1') },
    cGrey: { value: new THREE.Color('#bfc6d1') },
    cPanel: { value: new THREE.Color('#2c323b') },
    cDark: { value: new THREE.Color('#1f2329') },
    cMetal: { value: new THREE.Color('#9eabbf') },
    cAccent: { value: new THREE.Color('#5d8dff') },
    cLining: { value: new THREE.Color('#2a3140').convertLinearToSRGB() },
  };
}
export type SuitUniforms = ReturnType<typeof makeSuitUniforms>;

const SUIT_DECL = /* glsl */ `
  ${LENS_GLSL}
  ${BUMP_GLSL}
  varying vec3 vSP;
  varying vec3 vSN;
  varying vec3 vHL;
  uniform vec3 cWhite, cGrey, cPanel, cDark, cMetal, cAccent, cLining;`;

/** Common tail: rim light, lens cutaway, dark lining on the inside, fade. */
const SUIT_TAIL = /* glsl */ `
  float ndv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
  float ring;
  float hole = lensHole(ring);
  if (gl_FrontFacing) {
    gl_FragColor.rgb += uRim * pow(1.0 - ndv, 4.0) * 0.32;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, ring * 0.6);
    gl_FragColor.a = (1.0 - hole) * uFade;
  } else {
    // Back faces: the lining, cut by the lens as well (the shell also has an inner copy inside the body).
    gl_FragColor = vec4(cLining * (0.45 + 0.55 * ndv), (1.0 - hole) * uFade);
  }`;

/** Suit regions, colours, roughness and the embossing height, from world position and normal. */
const SUIT_SURFACE = /* glsl */ `
  vec3 sp = vSP;
  vec3 sn = normalize(vSN);
  // Panel layout follows the smoothed panel normal, so edges run in clean curves over the folds and anatomy.
  vec3 pn = normalize(vPN);
  float ax = abs(sp.x);
  float outward = pn.x * (sp.x < 0.0 ? -1.0 : 1.0);
  // World size of one pixel here: micro detail fades in only when the camera is close enough to resolve it.
  float fw = length(fwidth(sp));
  // Shared noise (3 lookups for the whole suit): coarse drape and fold warp, fine tone and dust, fold gating.
  float nCoarse = vnoise(sp * 14.0);
  float nFine = vnoise(sp * 45.0);
  float foldWarp = (nCoarse - 0.5) * 7.0 + (nFine - 0.5) * 1.5;
  float foldGate = smoothstep(0.3, 0.75, vnoise(sp * 9.0 + 3.0));
  float fine = 1.0 - smoothstep(0.0005, 0.0016, fw);
  float fineS = 1.0 - smoothstep(0.0012, 0.003, fw);
  float front = smoothstep(0.25, 0.45, pn.z);
  float limb = smoothstep(0.188, 0.205, ax);
  float body = 1.0 - limb;
  float trunk = body * smoothstep(0.2, 0.22, sp.y) * (1.0 - smoothstep(1.34, 1.38, sp.y));

  // Gloves: knuckle guard on the back of the hand, grip pads on the fingertips, wrist strap, metal cuff.
  float hand = limb * (1.0 - smoothstep(0.94, 0.946, sp.y));
  float knuckle = hand * smoothstep(0.15, 0.4, outward) * bandS(sp.y, 0.8, 0.858, 0.003);
  float grip = hand * (1.0 - smoothstep(0.765, 0.775, sp.y));
  float wristStrap = limb * bandS(sp.y, 0.918, 0.938, 0.0012);
  float cuff = limb * bandS(sp.y, 0.946, 0.978, 0.0015);
  float cuffLine = limb * bandS(sp.y, 0.959, 0.964, 0.0008);

  // Boots: sole with tread, toe cap, heel counter, ankle strap with a buckle on the outside.
  float boot = 1.0 - smoothstep(0.186, 0.192, sp.y);
  float sole = 1.0 - smoothstep(0.02, 0.026, sp.y);
  float soleEdge = bandS(sp.y, 0.026, 0.029, 0.0007);
  float toe = boot * (1.0 - sole) * smoothstep(0.075, 0.09, sp.z) * (1.0 - smoothstep(0.075, 0.085, sp.y));
  float heel = boot * (1.0 - sole) * smoothstep(-0.055, -0.07, sp.z) * (1.0 - smoothstep(0.08, 0.09, sp.y));
  float strap = boot * bandS(sp.y, 0.112, 0.134, 0.0012);
  float buckle = strap * smoothstep(0.7, 0.85, outward);
  float bootLine = bandS(sp.y, 0.172, 0.178, 0.0008) * (1.0 - sole);

  // Torso and legs: side panels with piping, shoulder yoke, neck dam, belt and buckle, zip with teeth and pull.
  float sideLo = mix(0.56, 0.78, smoothstep(0.92, 1.0, sp.y));
  float side = smoothstep(sideLo, sideLo + 0.1, outward) * trunk;
  float pipe = bandS(outward, sideLo - 0.09, sideLo - 0.04, 0.012) * trunk;
  float yoke = smoothstep(0.3, 0.46, pn.y) * smoothstep(1.3, 1.34, sp.y);
  float collar = body * bandS(sp.y, 1.428, 1.47, 0.002);
  float belt = body * bandS(sp.y, 0.972, 1.0, 0.0015);
  float beltLine = body * bandS(sp.y, 1.0, 1.0045, 0.0007);
  float buckleB = belt * bandS(sp.x, -0.024, 0.024, 0.001) * front;
  float zip = body * bandS(sp.x, -0.0024, 0.0024, 0.0006) * bandS(sp.y, 1.0, 1.43, 0.002) * front;
  float teeth = zip * step(0.5, fract(sp.y * 450.0)) * fine;
  float pull = body * bandS(sp.x, -0.0045, 0.0045, 0.0006) * bandS(sp.y, 1.398, 1.428, 0.001) * front;

  // Raglan seams from the collar to the armpit, front and back, with a stitch line beside them.
  vec2 ra = vec2(0.075, 1.455);
  vec2 rab = vec2(0.185, 1.325) - ra;
  vec2 rq = vec2(ax, sp.y) - ra;
  float rh = clamp(dot(rq, rab) / dot(rab, rab), 0.0, 1.0);
  float rd = length(rq - rab * rh);
  float inRag = step(0.002, rh) * step(rh, 0.998);
  float raglan = (1.0 - smoothstep(0.0007, 0.002, rd)) * inRag;
  float raglanStitch = bandS(rd, 0.0032, 0.0042, 0.0004) * inRag * step(0.5, fract(rh * length(rab) / 0.004));

  // Thigh cargo pockets: a moulded box with a bevelled edge, a flap and a metal snap.
  float pd = sdRoundRect(vec2(ax - 0.118, sp.y - 0.632), vec2(0.034, 0.068), 0.008);
  float pocket = (1.0 - smoothstep(-0.0006, 0.0006, pd)) * front * body;
  float pocketBevel = pocket * smoothstep(0.0, -0.005, pd);
  float flap = pocket * smoothstep(0.664, 0.668, sp.y);
  float flapLine = pocket * bandS(sp.y, 0.6635, 0.6665, 0.0005);
  float pocketStitch = pocket * bandS(pd, -0.0038, -0.0028, 0.0004) * step(0.5, fract((ax + sp.y) / 0.004));
  float snap = pocket * (1.0 - smoothstep(0.0032, 0.004, length(vec2(ax - 0.118, sp.y - 0.684))));

  // Knee pads: rounded, bevelled, diamond-quilted, stitched round the edge.
  float kpd = sdRoundRect(vec2(ax - 0.076, sp.y - 0.49), vec2(0.042, 0.06), 0.018);
  float knee = (1.0 - smoothstep(-0.0008, 0.0008, kpd)) * smoothstep(0.2, 0.45, pn.z) * body;
  float kneeBevel = knee * smoothstep(0.0, -0.007, kpd);
  vec2 kq = vec2(ax - 0.076, sp.y - 0.49) / 0.026;
  float quilt = min(abs(fract(kq.x + kq.y) - 0.5), abs(fract(kq.x - kq.y) - 0.5));
  float kneeSeam = knee * (1.0 - smoothstep(0.02, 0.07, quilt)) * smoothstep(-0.005, -0.009, kpd);
  float kneeStitch = knee * bandS(kpd, -0.004, -0.003, 0.0004) * step(0.5, fract((ax + sp.y) / 0.004));

  // Suit port (umbilical connector) on the right hip.
  float pr = length(sp.xy - vec2(-0.092, 0.915));
  float port = (1.0 - smoothstep(0.0172, 0.0185, pr)) * front * body;
  float portRing = port * bandS(pr, 0.0105, 0.0128, 0.0005);
  float portCore = port * (1.0 - smoothstep(0.005, 0.006, pr));

  float beltStitch = belt * (bandS(sp.y, 0.9755, 0.9765, 0.0004) + bandS(sp.y, 0.9955, 0.9965, 0.0004))
    * step(0.5, fract(atan(sp.z, sp.x) * 0.15 / 0.004));

  vec3 col = cWhite * (0.975 + 0.05 * nFine);
  float rough = 0.66;
  col = mix(col, cGrey, yoke);
  col = mix(col, cGrey * 0.8, knee);
  col = mix(col, cWhite * 0.9, pocket * 0.5);
  col = mix(col, cGrey, flap * 0.6);
  col = mix(col, cPanel, side);
  col = mix(col, cAccent, pipe);
  col = mix(col, cPanel * 1.15, collar);
  col = mix(col, cPanel, belt);
  rough = mix(rough, 0.5, belt);
  col = mix(col, cAccent, beltLine);
  col = mix(col, cDark, zip);
  col = mix(col, cMetal, teeth);
  col = mix(col, cDark, hand);
  rough = mix(rough, 0.45, hand);
  col = mix(col, cPanel * 1.6, knuckle);
  col = mix(col, cDark * 0.7, grip);
  rough = mix(rough, 0.78, grip);
  col = mix(col, cDark, boot);
  rough = mix(rough, 0.5, boot);
  col = mix(col, cPanel * 1.5, max(toe, heel));
  col = mix(col, cGrey * 0.75, sole);
  rough = mix(rough, 0.9, sole);
  col = mix(col, cPanel * 1.3, strap);
  col = mix(col, cAccent, bootLine);
  col = mix(col, cPanel, wristStrap);
  col = mix(col, cAccent, cuffLine);
  col = mix(col, cPanel * 0.8, raglan * 0.35);
  float stitch = clamp(raglanStitch + pocketStitch + kneeStitch + beltStitch, 0.0, 1.0) * fineS;
  col = mix(col, vec3(0.32, 0.35, 0.4), stitch * 0.7);
  col = mix(col, cDark, portRing);
  col = mix(col, cAccent, portCore);
  float hw = max(max(cuff, max(buckle, buckleB)), max(max(pull, snap), port - portRing - portCore));
  col = mix(col, cMetal, hw);
  rough = mix(rough, 0.28, hw);
  float metal = hw * 0.85;

  // Patches, embroidered: mission patch (left chest), name tape (right chest), ASTRA tab (right shoulder).
  vec2 cuv = (sp.xy - vec2(${BODY.chestPatch.x.toFixed(3)}, ${BODY.chestPatch.y.toFixed(3)})) / 0.092 + 0.5;
  vec4 pc = texture2D(uPatch, vec2(clamp(cuv.x, 0.0, 1.0) * 0.5, 0.5 + clamp(cuv.y, 0.0, 1.0) * 0.5));
  float aC = pc.a * inBox(cuv) * smoothstep(0.2, 0.4, sn.z) * body;
  vec2 tuv = (sp.xy - vec2(${BODY.nameTape.x.toFixed(3)}, ${BODY.nameTape.y.toFixed(3)})) / vec2(0.085, 0.0187) + 0.5;
  vec4 pt = texture2D(uPatch, vec2((12.0 + clamp(tuv.x, 0.0, 1.0) * 1000.0) / 1024.0,
    (274.0 + clamp(tuv.y, 0.0, 1.0) * 220.0) / 1024.0));
  float aT = pt.a * inBox(tuv) * smoothstep(0.3, 0.5, sn.z) * body;
  vec2 auv = (vec2(sp.z, sp.y) - uShoulder) / 0.085 + 0.5;
  vec4 pa = texture2D(uPatch, vec2(0.5 + clamp(auv.x, 0.0, 1.0) * 0.5, 0.5 + clamp(auv.y, 0.0, 1.0) * 0.5));
  float aA = pa.a * inBox(auv) * smoothstep(0.35, 0.55, -sn.x) * step(sp.x, -0.17);
  col = mix(col, pc.rgb, aC);
  col = mix(col, pt.rgb, aT);
  col = mix(col, pa.rgb, aA);
  float patches = max(aC, max(aT, aA));
  rough = mix(rough, 0.78, patches);
  metal *= 1.0 - patches;

  // Wear: a little dust on the lower legs, never on the hardware.
  float dust = (1.0 - smoothstep(0.19, 0.34, sp.y)) * (1.0 - boot) * 0.1 * (1.0 - hw);
  col *= 1.0 - dust * (0.4 + 0.6 * nFine);

  // Embossing height in metres: raised panels and hardware, grooved seams, twill weave, pebbled gloves, tread.
  float hgt = side * 0.0004 + pipe * 0.0008 + belt * 0.0008 + collar * 0.0006;
  hgt += kneeBevel * 0.0022 - kneeSeam * 0.0003 + pocketBevel * 0.0016 + flap * 0.0006 - flapLine * 0.0006
    + snap * 0.0008;
  hgt += (cuff + wristStrap) * 0.0009 + knuckle * 0.0009 + strap * 0.0007 + buckle * 0.0004 + (toe + heel) * 0.0005;
  hgt += zip * 0.0005 + teeth * 0.0002 + pull * 0.0008 + buckleB * 0.0006;
  hgt += port * 0.0018 - portRing * 0.0008 - portCore * 0.0004 + patches * 0.0005;
  hgt -= raglan * 0.0006 + soleEdge * 0.0006;
  float fabric = (1.0 - hand) * (1.0 - boot) * (1.0 - cuff);
  // Folds where a real suit bunches and pulls: above the belt, behind the knee, above the pads, at the elbow,
  // stacked above cuffs and boots, tension lines from the crotch and the armpit; plus a soft overall drape.
  float wr = fold(sp.y, 300.0, foldWarp, foldGate) * bandS(sp.y, 1.006, 1.07, 0.012) * body * 0.0022;
  wr += fold(sp.y, 360.0, foldWarp, foldGate) * bandS(sp.y, 0.43, 0.55, 0.02) * smoothstep(0.1, -0.35, pn.z) * body * 0.0026;
  wr += fold(sp.y, 300.0, foldWarp, foldGate) * bandS(sp.y, 0.555, 0.62, 0.012) * body * 0.0012;
  wr += fold(sp.y, 330.0, foldWarp, foldGate) * bandS(sp.y, 1.07, 1.16, 0.015) * limb * smoothstep(0.15, 0.55, pn.z) * 0.0024;
  wr += fold(sp.y, 420.0, foldWarp, foldGate) * bandS(sp.y, 0.978, 1.03, 0.008) * limb * 0.0016;
  wr += fold(sp.y, 380.0, foldWarp, foldGate) * bandS(sp.y, 0.192, 0.27, 0.012) * 0.0022;
  vec2 cq = vec2(ax, sp.y - 0.74);
  wr += fold(atan(cq.y, cq.x), 10.0, foldWarp, foldGate) * bandS(length(cq), 0.03, 0.15, 0.03) * smoothstep(-0.02, 0.02, cq.y)
    * smoothstep(0.0, 0.4, pn.z) * body * 0.0008;
  vec2 aq = vec2(ax - 0.185, sp.y - 1.33);
  wr += fold(atan(aq.y, aq.x), 10.0, foldWarp, foldGate) * bandS(length(aq), 0.02, 0.12, 0.025)
    * (1.0 - smoothstep(1.34, 1.37, sp.y)) * 0.0012;
  float drape = (nCoarse - 0.5) * 0.0018 * (1.0 - smoothstep(0.006, 0.02, fw))
    + (nFine - 0.5) * 0.0005 * (1.0 - smoothstep(0.002, 0.006, fw));
  float loose = (1.0 - belt) * (1.0 - knee) * (1.0 - pocket) * (1.0 - patches) * (1.0 - port) * (1.0 - zip);
  hgt += (wr + drape) * fabric * loose;
  float twill = sin((sp.x + sp.y) * 2600.0 + sp.z * 1300.0) * sin((sp.x - sp.y) * 2600.0 - sp.z * 900.0);
  hgt += twill * 0.00003 * fine * fabric;
  float pebble = sin(sp.x * 3100.0) * sin(sp.y * 2900.0) * sin(sp.z * 3300.0);
  hgt += pebble * 0.00004 * fine * (hand + boot * (1.0 - sole));
  hgt += sole * (0.5 + 0.5 * sin(sp.y * 2100.0)) * 0.0003 * fine;

  diffuseColor.rgb = col;
  roughnessFactor = rough;
  metalnessFactor = metal;
  totalEmissiveRadiance += cAccent * (pipe + beltLine + cuffLine + bootLine + portCore) * 0.22;`;

/** Suit fabric with all its panels, seams and hardware, and baked ambient occlusion. */
export function makeSuitMaterial(uniforms: SuitUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.62,
    sheen: 0.6,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#dfe7ff'),
    specularIntensity: 0.4,
    envMapIntensity: 0.65,
    transparent: true,
    side: THREE.DoubleSide,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    suitVertex(shader, true);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `${SUIT_DECL}
        varying float vAO;
        varying vec3 vPN;
        uniform sampler2D uPatch;
        uniform vec2 uShoulder;
        void main() {`,
      )
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${SUIT_SURFACE}`)
      .replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\nnormal = bumpNormal(-vViewPosition, normal, hgt);',
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        gl_FragColor.rgb *= mix(0.38, 1.0, vAO);
        ${SUIT_TAIL}
        if (sp.y > ${BODY.neckCut.toFixed(3)}) discard;
        if (gl_FragColor.a < 0.01) discard;`,
      );
  };
  m.customProgramCacheKey = () => 'astra-suit';
  m.forceSinglePass = true; // see makeRealSkin: keeps gl_FrontFacing honest so the lens leaves the lining
  m.shadowSide = THREE.BackSide; // back faces cast: no self-shadow striping on the fabric
  return m;
}

/**
 * Helmet shell: a dark wraparound visor with its trim, visor hinges on both sides, vents at the back and a stripe
 * over the crown.
 */
export function makeHelmetMaterial(uniforms: SuitUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.1,
    transparent: true,
    side: THREE.DoubleSide,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    suitVertex(shader, false);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${SUIT_DECL}\nvoid main() {`)
      .replace(
        '#include <metalnessmap_fragment>',
        /* glsl */ `#include <metalnessmap_fragment>
        vec3 hl = normalize(vHL);
        float az = atan(hl.x, hl.z);
        float el = asin(clamp(hl.y, -1.0, 1.0));
        float sv = pow(abs(az) / 1.08, 4.0) + pow(abs((el + 0.02) / 0.43), 4.0);
        float aa = fwidth(sv) * 1.5 + 1e-4;
        float visor = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, sv);
        float trim = smoothstep(1.0 - aa, 1.0 + aa, sv) * (1.0 - smoothstep(1.3 - aa, 1.3 + aa, sv));
        // Crown stripe: over the top and down the back, never below the visor.
        float crown = max(smoothstep(0.36, 0.44, hl.y), smoothstep(0.0, -0.12, hl.z));
        float stripe = bandS(hl.x, -0.05, 0.05, 0.004) * (1.0 - visor) * (1.0 - trim) * crown;
        // Visor hinge discs at the pivots.
        float hd = length(vec2(abs(az) - 1.571, el + 0.02));
        float hinge = 1.0 - smoothstep(0.2, 0.212, hd);
        float hingeRing = hinge * bandS(hd, 0.12, 0.14, 0.004);
        float hingeCore = 1.0 - smoothstep(0.05, 0.058, hd);
        // Two rows of vents low on the back.
        float vents = bandS(abs(az), 2.62, 2.95, 0.01)
          * (bandS(el, -0.33, -0.3, 0.004) + bandS(el, -0.25, -0.22, 0.004));
        vec3 col = mix(cWhite, cAccent, stripe);
        col = mix(col, cPanel, trim);
        col = mix(col, cMetal, hinge);
        col = mix(col, cDark, hingeRing + vents);
        col = mix(col, cAccent, hingeCore);
        // Smoked gold visor: dark straight on, gold where it catches the lights.
        col = mix(col, vec3(0.42, 0.29, 0.11), visor);
        diffuseColor.rgb = col;
        roughnessFactor = mix(mix(mix(0.28, 0.45, trim), 0.3, hinge), 0.03, visor);
        metalnessFactor = max(visor, hinge * 0.85);
        float hgt = trim * 0.0012 + hinge * 0.0016 - hingeRing * 0.0007 + hingeCore * 0.0004 - vents * 0.0008
          + stripe * 0.0003;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\nnormal = bumpNormal(-vViewPosition, normal, hgt);',
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        ${SUIT_TAIL}
        // Visor: a cool-to-violet sheen, strongest at grazing angles, in the ASTRA brand gradient.
        if (gl_FrontFacing) {
          vec3 tint = mix(vec3(0.49, 0.77, 1.0), vec3(0.71, 0.65, 1.0), hl.y * 0.5 + 0.5);
          gl_FragColor.rgb += tint * (0.02 + pow(1.0 - ndv, 2.0) * 0.2) * visor;
        }
        if (gl_FragColor.a < 0.01) discard;`,
      );
  };
  m.customProgramCacheKey = () => 'astra-helmet';
  m.forceSinglePass = true;
  m.shadowSide = THREE.BackSide;
  return m;
}

/** Neck ring where the helmet seals to the suit: polished upper race, blue anodised lower race, a groove between. */
export function makeNeckRingMaterial(uniforms: SuitUniforms) {
  const ringY = (BODY.helmet.bottom - 0.002).toFixed(4);
  const m = new THREE.MeshPhysicalMaterial({
    color: '#a3afc2',
    metalness: 0.85,
    roughness: 0.28,
    envMapIntensity: 1.2,
    transparent: true,
    side: THREE.DoubleSide,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    suitVertex(shader, false);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${SUIT_DECL}\nvoid main() {`)
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        float ry = vSP.y - ${ringY};
        float lower = smoothstep(0.0008, -0.0008, ry);
        float groove = bandS(ry, -0.001, 0.001, 0.0004);
        diffuseColor.rgb = mix(cMetal * 1.15, cAccent * 0.55, lower);
        roughnessFactor = mix(0.22, 0.38, lower);
        float hgt = -groove * 0.0007;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\nnormal = bumpNormal(-vViewPosition, normal, hgt);',
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        ${SUIT_TAIL}
        if (gl_FragColor.a < 0.01) discard;`,
      );
  };
  m.customProgramCacheKey = () => 'astra-neck-ring';
  m.forceSinglePass = true;
  m.shadowSide = THREE.BackSide;
  return m;
}

export function makeHelmetGeometry() {
  const { center, radii, bottom } = BODY.helmet;
  // Open at the bottom where it meets the neck ring.
  const theta = Math.acos(THREE.MathUtils.clamp((bottom - center.y) / radii.y, -1, 1));
  return new THREE.SphereGeometry(1, 96, 64, 0, Math.PI * 2, 0, theta);
}
