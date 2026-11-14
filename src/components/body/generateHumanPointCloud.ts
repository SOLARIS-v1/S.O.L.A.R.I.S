/**
 * Generates 40k-60k points inside a smooth-union SDF human with dense organ clusters.
 * 8 heads tall, gender-neutral, anatomical proportions.
 */

export interface PointCloudData {
  positions: Float32Array;
  organTypes: Float32Array;
  phases: Float32Array;
  baseColors: Float32Array;
  pointCount: number;
}

function sdCapsule(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  r: number
): number {
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const lenSq = bax * bax + bay * bay + baz * baz;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / lenSq));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

function sdEllipsoid(
  px: number, py: number, pz: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number
): number {
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  const dz = (pz - cz) / rz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - 1.0;
}

function smin(d1: number, d2: number, k: number = 0.08): number {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (d2 - d1) / k));
  return (1 - h) * d2 + h * d1 - k * h * (1 - h);
}

function evaluateHumanSDF(x: number, y: number, z: number): number {
  // Head & Neck
  const dHead = sdEllipsoid(x, y, z, 0, 1.48, 0.01, 0.13, 0.16, 0.14);
  const dJaw = sdCapsule(x, y, z, 0, 1.38, 0.02, 0, 1.30, 0.04, 0.085);
  const dNeck = sdCapsule(x, y, z, 0, 1.20, -0.01, 0, 1.34, 0.0, 0.07);
  let d = smin(smin(dHead, dJaw, 0.04), dNeck, 0.05);

  // Torso
  const dChest = sdEllipsoid(x, y, z, 0, 1.05, 0.0, 0.32, 0.16, 0.17);
  const dRibs = sdEllipsoid(x, y, z, 0, 0.85, 0.0, 0.27, 0.15, 0.15);
  const dAbdomen = sdEllipsoid(x, y, z, 0, 0.62, 0.0, 0.24, 0.14, 0.14);
  const dPelvis = sdEllipsoid(x, y, z, 0, 0.38, -0.01, 0.29, 0.15, 0.17);
  d = smin(d, dChest, 0.07);
  d = smin(d, dRibs, 0.06);
  d = smin(d, dAbdomen, 0.06);
  d = smin(d, dPelvis, 0.07);

  // Shoulders & Arms (left & right)
  const ax = Math.abs(x);
  const signX = x < 0 ? -1 : 1;

  const dShoulder = sdCapsule(ax, y, z, 0.22, 1.15, 0.0, 0.36, 1.14, -0.01, 0.075);
  const dUpperArm = sdCapsule(ax, y, z, 0.36, 1.14, -0.01, 0.43, 0.68, 0.01, 0.058);
  const dForearm = sdCapsule(ax, y, z, 0.43, 0.68, 0.01, 0.47, 0.22, 0.03, 0.046);
  const dHand = sdCapsule(ax, y, z, 0.47, 0.22, 0.03, 0.49, 0.02, 0.04, 0.036);
  const dArm = smin(smin(smin(dShoulder, dUpperArm, 0.05), dForearm, 0.04), dHand, 0.03);
  d = smin(d, dArm, 0.06);

  // Legs (thigh, knee/shin, foot)
  const dThigh = sdCapsule(ax, y, z, 0.15, 0.26, -0.01, 0.15, -0.50, 0.01, 0.088);
  const dShin = sdCapsule(ax, y, z, 0.15, -0.50, 0.01, 0.14, -1.28, -0.02, 0.062);
  const dFoot = sdCapsule(ax, y, z, 0.14, -1.28, -0.02, 0.14, -1.45, 0.12, 0.045);
  const dLeg = smin(smin(dThigh, dShin, 0.05), dFoot, 0.04);
  d = smin(d, dLeg, 0.06);

  return d;
}

export function generateHumanPointCloud(): PointCloudData {
  const TARGET_BODY_POINTS = 38000;
  const TARGET_BRAIN_POINTS = 2400;
  const TARGET_HEART_POINTS = 2400;
  const TARGET_LUNG_POINTS = 4000;
  const TARGET_SPINE_POINTS = 2600;
  const TARGET_ABDOMEN_POINTS = 2600;

  const totalPoints =
    TARGET_BODY_POINTS +
    TARGET_BRAIN_POINTS +
    TARGET_HEART_POINTS +
    TARGET_LUNG_POINTS +
    TARGET_SPINE_POINTS +
    TARGET_ABDOMEN_POINTS; // ~52,000 points

  const positions = new Float32Array(totalPoints * 3);
  const organTypes = new Float32Array(totalPoints); // 0=body, 1=brain, 2=heart, 3=lungs, 4=spine, 5=abdomen
  const phases = new Float32Array(totalPoints);
  const baseColors = new Float32Array(totalPoints * 3);

  let ptr = 0;

  // Simple deterministic seeded random generator
  let seed = 42;
  function rand(): number {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // 1. Body shell volume (rejection sampled inside SDF)
  let count = 0;
  while (count < TARGET_BODY_POINTS) {
    // Bounding box for human figure: x in [-0.55, 0.55], y in [-1.55, 1.68], z in [-0.22, 0.22]
    const x = (rand() - 0.5) * 1.15;
    const y = -1.55 + rand() * 3.25;
    const z = (rand() - 0.5) * 0.44;

    const d = evaluateHumanSDF(x, y, z);
    if (d < 0.0) {
      // Inside body
      const idx = ptr * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      organTypes[ptr] = 0.0;
      phases[ptr] = rand() * Math.PI * 2;

      // Depth/height color grading: ice white to blue-grey
      const t = Math.max(0, Math.min(1, (y + 1.5) / 3.2));
      const depthFactor = 0.8 + 0.2 * Math.cos(z * 4.0);
      baseColors[idx] = (0.75 + 0.18 * t) * depthFactor;     // R
      baseColors[idx + 1] = (0.84 + 0.12 * t) * depthFactor; // G
      baseColors[idx + 2] = (0.94 + 0.05 * t) * depthFactor; // B

      ptr++;
      count++;
    }
  }

  // 2. Brain (inside cranium)
  for (let i = 0; i < TARGET_BRAIN_POINTS; i++) {
    // Ellipsoid sampling
    const u = rand();
    const v = rand();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(rand());

    const bx = r * 0.095 * Math.sin(phi) * Math.cos(theta);
    const by = 1.48 + r * 0.10 * Math.cos(phi);
    const bz = 0.01 + r * 0.105 * Math.sin(phi) * Math.sin(theta);

    const idx = ptr * 3;
    positions[idx] = bx;
    positions[idx + 1] = by;
    positions[idx + 2] = bz;

    organTypes[ptr] = 1.0;
    phases[ptr] = rand() * Math.PI * 2;

    // Brain color: pearl violet-cyan
    baseColors[idx] = 0.85;
    baseColors[idx + 1] = 0.88;
    baseColors[idx + 2] = 0.98;

    ptr++;
  }

  // 3. Heart (left anterior chest)
  for (let i = 0; i < TARGET_HEART_POINTS; i++) {
    const u = rand();
    const v = rand();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(rand());

    const hx = -0.06 + r * 0.055 * Math.sin(phi) * Math.cos(theta);
    const hy = 1.02 + r * 0.065 * Math.cos(phi);
    const hz = 0.06 + r * 0.055 * Math.sin(phi) * Math.sin(theta);

    const idx = ptr * 3;
    positions[idx] = hx;
    positions[idx + 1] = hy;
    positions[idx + 2] = hz;

    organTypes[ptr] = 2.0;
    phases[ptr] = rand() * Math.PI * 2;

    // Heart color: soft warm ruby-coral luminescence
    baseColors[idx] = 0.95;
    baseColors[idx + 1] = 0.45;
    baseColors[idx + 2] = 0.42;

    ptr++;
  }

  // 4. Lungs (left & right lobes)
  for (let i = 0; i < TARGET_LUNG_POINTS; i++) {
    const isLeft = i % 2 === 0;
    const cx = isLeft ? -0.13 : 0.13;
    const cy = 1.04;
    const cz = 0.02;

    const u = rand();
    const v = rand();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(rand());

    const lx = cx + r * 0.07 * Math.sin(phi) * Math.cos(theta);
    const ly = cy + r * 0.14 * Math.cos(phi);
    const lz = cz + r * 0.075 * Math.sin(phi) * Math.sin(theta);

    const idx = ptr * 3;
    positions[idx] = lx;
    positions[idx + 1] = ly;
    positions[idx + 2] = lz;

    organTypes[ptr] = 3.0;
    phases[ptr] = rand() * Math.PI * 2;

    // Lungs color: airy cyan-teal
    baseColors[idx] = 0.45;
    baseColors[idx + 1] = 0.85;
    baseColors[idx + 2] = 0.90;

    ptr++;
  }

  // 5. Spine (24 vertebral segments curving down back)
  const VERTEBRAE_COUNT = 24;
  const ptsPerVertebra = Math.floor(TARGET_SPINE_POINTS / VERTEBRAE_COUNT);
  for (let v = 0; v < VERTEBRAE_COUNT; v++) {
    const t = v / (VERTEBRAE_COUNT - 1);
    // Cervical -> Thoracic -> Lumbar -> Sacral
    const vy = 1.28 - t * 0.92;
    // Natural anatomical spinal curve: lordosis and kyphosis
    const vz = -0.06 - 0.035 * Math.sin(t * Math.PI * 2);

    for (let k = 0; k < ptsPerVertebra; k++) {
      const angle = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.026;
      const sx = r * Math.cos(angle);
      const sy = vy + (rand() - 0.5) * 0.015;
      const sz = vz + r * Math.sin(angle);

      const idx = ptr * 3;
      positions[idx] = sx;
      positions[idx + 1] = sy;
      positions[idx + 2] = sz;

      organTypes[ptr] = 4.0;
      phases[ptr] = rand() * Math.PI * 2;

      // Spine color: crisp bone-pearl
      baseColors[idx] = 0.96;
      baseColors[idx + 1] = 0.96;
      baseColors[idx + 2] = 0.98;

      ptr++;
    }
  }

  // 6. Abdomen / Metabolic Core
  for (let i = 0; i < TARGET_ABDOMEN_POINTS; i++) {
    const u = rand();
    const v = rand();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(rand());

    const mx = -0.01 + r * 0.08 * Math.sin(phi) * Math.cos(theta);
    const my = 0.65 + r * 0.085 * Math.cos(phi);
    const mz = 0.03 + r * 0.075 * Math.sin(phi) * Math.sin(theta);

    const idx = ptr * 3;
    positions[idx] = mx;
    positions[idx + 1] = my;
    positions[idx + 2] = mz;

    organTypes[ptr] = 5.0;
    phases[ptr] = rand() * Math.PI * 2;

    // Abdomen color: warm amber-gold
    baseColors[idx] = 0.92;
    baseColors[idx + 1] = 0.78;
    baseColors[idx + 2] = 0.45;

    ptr++;
  }

  return {
    positions,
    organTypes,
    phases,
    baseColors,
    pointCount: ptr,
  };
}
