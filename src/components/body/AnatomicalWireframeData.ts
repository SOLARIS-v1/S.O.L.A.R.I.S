/**
 * Generates high-definition anatomical 3D wireframe line segments and structured organ point matrices.
 * Medical-grade anatomical proportions: skull, 24-vertebrae spine, 12 paired ribs, pelvic girdle,
 * limb contour lines, and volumetric organ clusters.
 */

export interface AnatomicalGeometryData {
  // Wireframe line segments (pairs of vertices: p1, p2, p3, p4...)
  linePositions: Float32Array;
  lineColors: Float32Array;
  lineZoneTypes: Float32Array; // 0=body, 1=head, 2=heart, 3=spine, 4=skin

  // High-density structured point lattice
  pointPositions: Float32Array;
  pointColors: Float32Array;
  pointOrganTypes: Float32Array;
  pointPhases: Float32Array;
}

export function generateAnatomicalModelData(): AnatomicalGeometryData {
  const lineCoords: number[] = [];
  const lineCols: number[] = [];
  const lineZones: number[] = [];

  function addLine(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    r: number, g: number, b: number,
    zone: number
  ) {
    lineCoords.push(x1, y1, z1, x2, y2, z2);
    lineCols.push(r, g, b, r, g, b);
    lineZones.push(zone, zone);
  }

  function addRing(
    cx: number, cy: number, cz: number,
    rx: number, rz: number,
    segments: number,
    r: number, g: number, b: number,
    zone: number
  ) {
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const x1 = cx + rx * Math.cos(a1);
      const z1 = cz + rz * Math.sin(a1);
      const x2 = cx + rx * Math.cos(a2);
      const z2 = cz + rz * Math.sin(a2);
      addLine(x1, cy, z1, x2, cy, z2, r, g, b, zone);
    }
  }

  // -------------------------------------------------------------
  // 1. SKELETAL VERTEBRAL SPINE COLUMN (24 vertebrae + spinal canal)
  // -------------------------------------------------------------
  const VERTEBRAE_COUNT = 24;
  let prevSpineX = 0;
  let prevSpineY = 1.34;
  let prevSpineZ = -0.04;

  for (let v = 0; v < VERTEBRAE_COUNT; v++) {
    const t = v / (VERTEBRAE_COUNT - 1);
    const vy = 1.32 - t * 0.98; // From C1 (1.32) down to L5/Sacrum (0.34)
    // Natural anatomical lordosis and kyphosis curvature
    const vz = -0.05 - 0.045 * Math.sin(t * Math.PI * 2);
    const vx = 0;

    // Connect vertebral body axis
    addLine(prevSpineX, prevSpineY, prevSpineZ, vx, vy, vz, 0.96, 0.96, 1.0, 3);
    prevSpineX = vx;
    prevSpineY = vy;
    prevSpineZ = vz;

    // Vertebral transverse processes & spinous process (disc cross)
    const discR = 0.035 + 0.02 * Math.sin(t * Math.PI);
    addLine(vx - discR, vy, vz, vx + discR, vy, vz, 0.92, 0.92, 0.98, 3);
    addLine(vx, vy, vz, vx, vy, vz - discR * 0.9, 0.92, 0.92, 0.98, 3);
  }

  // -------------------------------------------------------------
  // 2. THORACIC RIBCAGE (12 paired bilateral curving ribs)
  // -------------------------------------------------------------
  const RIB_COUNT = 12;
  const sternumTopY = 1.20;
  const sternumBotY = 0.72;

  // Sternum midline
  addLine(0, sternumTopY, 0.16, 0, sternumBotY, 0.14, 0.9, 0.92, 0.98, 0);

  for (let rib = 0; rib < RIB_COUNT; rib++) {
    const t = rib / (RIB_COUNT - 1);
    const spineY = 1.25 - t * 0.50;
    const spineZ = -0.05 - 0.045 * Math.sin((rib / 24) * Math.PI * 2);
    const frontY = 1.18 - t * 0.44;
    const frontZ = 0.16 - t * 0.03;

    const ribWidth = 0.14 + 0.13 * Math.sin(t * Math.PI); // Widest at mid-thorax (ribs 6-8)
    const ribDepth = 0.16;

    // Left and right rib curves (4 segments each for smooth anatomical arc)
    const numSegments = 5;
    let prevLX = 0, prevLY = spineY, prevLZ = spineZ;
    let prevRX = 0, prevRY = spineY, prevRZ = spineZ;

    for (let s = 1; s <= numSegments; s++) {
      const st = s / numSegments;
      const angle = st * Math.PI; // From 0 (back) to PI (front)
      const arcY = spineY + (frontY - spineY) * st - Math.sin(st * Math.PI) * 0.02;

      const lx = -ribWidth * Math.sin(angle);
      const lz = spineZ + (frontZ - spineZ) * st + Math.sin(angle) * (ribDepth * 0.4);

      const rx = ribWidth * Math.sin(angle);
      const rz = lz;

      addLine(prevLX, prevLY, prevLZ, lx, arcY, lz, 0.82, 0.86, 0.94, 0);
      addLine(prevRX, prevRY, prevRZ, rx, arcY, rz, 0.82, 0.86, 0.94, 0);

      prevLX = lx; prevLY = arcY; prevLZ = lz;
      prevRX = rx; prevRY = arcY; prevRZ = rz;
    }
  }

  // -------------------------------------------------------------
  // 3. SHOULDER GIRDLE & CLAVICLES
  // -------------------------------------------------------------
  // Clavicles (collarbones) from manubrium out to acromion
  addLine(0, 1.22, 0.14, -0.22, 1.20, 0.06, 0.9, 0.92, 0.98, 0);
  addLine(-0.22, 1.20, 0.06, -0.36, 1.16, -0.01, 0.9, 0.92, 0.98, 0);
  addLine(0, 1.22, 0.14, 0.22, 1.20, 0.06, 0.9, 0.92, 0.98, 0);
  addLine(0.22, 1.20, 0.06, 0.36, 1.16, -0.01, 0.9, 0.92, 0.98, 0);

  // Scapular spine arches on back
  addLine(0, 1.24, -0.06, -0.26, 1.15, -0.10, 0.75, 0.82, 0.92, 0);
  addLine(0, 1.24, -0.06, 0.26, 1.15, -0.10, 0.75, 0.82, 0.92, 0);

  // -------------------------------------------------------------
  // 4. SKULL, CRANIUM & FACIAL CONTOURS
  // -------------------------------------------------------------
  const craniumY = 1.48;
  const craniumZ = 0.01;

  // Cranial rings at multiple heights
  addRing(0, 1.40, craniumZ, 0.10, 0.11, 14, 0.88, 0.92, 1.0, 1);
  addRing(0, 1.48, craniumZ, 0.125, 0.135, 16, 0.92, 0.95, 1.0, 1);
  addRing(0, 1.56, craniumZ, 0.115, 0.125, 14, 0.88, 0.92, 1.0, 1);
  addRing(0, 1.62, craniumZ, 0.08, 0.09, 12, 0.85, 0.90, 1.0, 1);

  // Sagittal cranial arch (front to back)
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI;
    const a2 = ((i + 1) / 8) * Math.PI;
    const y1 = craniumY + 0.16 * Math.sin(a1);
    const z1 = craniumZ + 0.14 * Math.cos(a1);
    const y2 = craniumY + 0.16 * Math.sin(a2);
    const z2 = craniumZ + 0.14 * Math.cos(a2);
    addLine(0, y1, z1, 0, y2, z2, 0.9, 0.94, 1.0, 1);
  }

  // Coronal cranial arch (ear to ear)
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI;
    const a2 = ((i + 1) / 8) * Math.PI;
    const y1 = craniumY + 0.16 * Math.sin(a1);
    const x1 = 0.13 * Math.cos(a1);
    const y2 = craniumY + 0.16 * Math.sin(a2);
    const x2 = 0.13 * Math.cos(a2);
    addLine(x1, y1, craniumZ, x2, y2, craniumZ, 0.9, 0.94, 1.0, 1);
  }

  // Jaw / Mandible contour
  addLine(-0.08, 1.38, 0.02, -0.04, 1.30, 0.09, 0.85, 0.90, 0.98, 1);
  addLine(-0.04, 1.30, 0.09, 0, 1.28, 0.10, 0.85, 0.90, 0.98, 1);
  addLine(0, 1.28, 0.10, 0.04, 1.30, 0.09, 0.85, 0.90, 0.98, 1);
  addLine(0.04, 1.30, 0.09, 0.08, 1.38, 0.02, 0.85, 0.90, 0.98, 1);

  // Eye socket orbital rings
  addRing(-0.042, 1.45, 0.125, 0.025, 0.015, 8, 0.9, 0.94, 1.0, 1);
  addRing(0.042, 1.45, 0.125, 0.025, 0.015, 8, 0.9, 0.94, 1.0, 1);

  // -------------------------------------------------------------
  // 5. PELVIS / ILIAC CRESTS
  // -------------------------------------------------------------
  const pelvisY = 0.38;
  addRing(0, pelvisY + 0.06, -0.01, 0.18, 0.13, 14, 0.88, 0.92, 0.98, 0); // Iliac crest ring
  addRing(0, pelvisY - 0.08, -0.01, 0.15, 0.11, 12, 0.85, 0.88, 0.95, 0); // Ischial ring

  // -------------------------------------------------------------
  // 6. UPPER LIMBS (Shoulder, Arm, Elbow, Forearm, Hand)
  // -------------------------------------------------------------
  for (const side of [-1, 1]) {
    const shX = side * 0.36;
    const elbX = side * 0.43;
    const wrX = side * 0.47;
    const handX = side * 0.49;

    // Bone axis: Humerus
    addLine(shX, 1.15, -0.01, elbX, 0.68, 0.01, 0.88, 0.92, 0.98, 4);
    // Bone axis: Radius & Ulna
    addLine(elbX, 0.68, 0.01, wrX, 0.22, 0.03, 0.88, 0.92, 0.98, 4);
    // Bone axis: Metacarpals
    addLine(wrX, 0.22, 0.03, handX, 0.05, 0.04, 0.85, 0.90, 0.96, 4);

    // Anatomical muscle contour rings along arm
    addRing(shX, 1.12, 0.0, 0.065, 0.065, 8, 0.78, 0.84, 0.92, 4);   // Deltoid
    addRing(side * 0.40, 0.90, 0.0, 0.055, 0.055, 8, 0.78, 0.84, 0.92, 4); // Bicep
    addRing(elbX, 0.68, 0.01, 0.045, 0.045, 8, 0.78, 0.84, 0.92, 4);  // Elbow
    addRing(side * 0.45, 0.45, 0.02, 0.042, 0.042, 8, 0.78, 0.84, 0.92, 4); // Forearm
    addRing(wrX, 0.22, 0.03, 0.032, 0.032, 6, 0.78, 0.84, 0.92, 4);   // Wrist
  }

  // -------------------------------------------------------------
  // 7. LOWER LIMBS (Femur, Knee, Shin, Ankle, Foot)
  // -------------------------------------------------------------
  for (const side of [-1, 1]) {
    const hipX = side * 0.14;
    const kneeX = side * 0.14;
    const ankX = side * 0.13;

    // Bone axis: Femur
    addLine(hipX, 0.28, -0.01, kneeX, -0.48, 0.01, 0.90, 0.92, 0.98, 0);
    // Bone axis: Tibia & Fibula
    addLine(kneeX, -0.48, 0.01, ankX, -1.26, -0.02, 0.90, 0.92, 0.98, 0);
    // Foot arch
    addLine(ankX, -1.26, -0.02, side * 0.13, -1.45, 0.12, 0.85, 0.88, 0.95, 0);

    // Anatomical muscle contour rings along leg
    addRing(hipX, 0.12, 0.0, 0.088, 0.088, 10, 0.78, 0.84, 0.92, 0);  // Upper Thigh
    addRing(side * 0.14, -0.18, 0.0, 0.076, 0.076, 10, 0.78, 0.84, 0.92, 0); // Mid Thigh
    addRing(kneeX, -0.48, 0.01, 0.058, 0.058, 8, 0.82, 0.88, 0.95, 0); // Patella Knee
    addRing(side * 0.14, -0.78, -0.01, 0.058, 0.062, 8, 0.78, 0.84, 0.92, 0); // Calf (Gastrocnemius bulge)
    addRing(ankX, -1.26, -0.02, 0.040, 0.040, 6, 0.78, 0.84, 0.92, 0); // Ankle
  }

  // -------------------------------------------------------------
  // 8. MUSCULAR LONGITUDINAL CONTOUR LINES (Chest, Abs, Back)
  // -------------------------------------------------------------
  // Pectoral contours
  addLine(-0.24, 1.12, 0.14, -0.06, 0.98, 0.17, 0.8, 0.85, 0.92, 0);
  addLine(0.24, 1.12, 0.14, 0.06, 0.98, 0.17, 0.8, 0.85, 0.92, 0);
  addLine(-0.06, 0.98, 0.17, -0.22, 0.96, 0.14, 0.8, 0.85, 0.92, 0);
  addLine(0.06, 0.98, 0.17, 0.22, 0.96, 0.14, 0.8, 0.85, 0.92, 0);

  // Rectus abdominis (6-pack grid lines)
  addLine(-0.08, 0.88, 0.15, -0.08, 0.44, 0.13, 0.75, 0.80, 0.90, 0);
  addLine(0.08, 0.88, 0.15, 0.08, 0.44, 0.13, 0.75, 0.80, 0.90, 0);
  addLine(-0.08, 0.75, 0.15, 0.08, 0.75, 0.15, 0.75, 0.80, 0.90, 0);
  addLine(-0.08, 0.60, 0.14, 0.08, 0.60, 0.14, 0.75, 0.80, 0.90, 0);

  // =============================================================
  // 9. HIGH-DENSITY STRUCTURED ORGAN & LATTICE POINT MATRIX
  // =============================================================
  const ptCoords: number[] = [];
  const ptCols: number[] = [];
  const ptOrgans: number[] = [];
  const ptPhases: number[] = [];

  let seed = 4321;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  function addPoint(x: number, y: number, z: number, r: number, g: number, b: number, organ: number) {
    ptCoords.push(x, y, z);
    ptCols.push(r, g, b);
    ptOrgans.push(organ);
    ptPhases.push(rand() * Math.PI * 2);
  }

  // A. BRAIN (Dense ethereal neuro-cluster) - 2,200 points
  for (let i = 0; i < 2200; i++) {
    const u = rand(), v = rand();
    const th = u * Math.PI * 2;
    const ph = Math.acos(2.0 * v - 1.0);
    const rad = Math.cbrt(rand()) * 0.095;
    // Brain gyri folding texture
    const gyri = 1.0 + 0.12 * Math.sin(th * 6.0) * Math.cos(ph * 5.0);
    const bx = rad * gyri * Math.sin(ph) * Math.cos(th);
    const by = 1.48 + rad * gyri * 1.05 * Math.cos(ph);
    const bz = 0.01 + rad * gyri * 1.1 * Math.sin(ph) * Math.sin(th);
    addPoint(bx, by, bz, 0.88, 0.92, 1.0, 1); // Organ 1 = Brain
  }

  // B. HEART (Anatomical myocardium & ventricle) - 2,500 points
  for (let i = 0; i < 2500; i++) {
    const u = rand(), v = rand();
    const th = u * Math.PI * 2;
    const ph = Math.acos(2.0 * v - 1.0);
    const rad = Math.cbrt(rand()) * 0.065;
    const hx = -0.06 + rad * Math.sin(ph) * Math.cos(th);
    const hy = 1.02 + rad * 1.1 * Math.cos(ph);
    const hz = 0.06 + rad * 0.95 * Math.sin(ph) * Math.sin(th);
    addPoint(hx, hy, hz, 1.0, 0.35, 0.38, 2); // Organ 2 = Heart
  }

  // Aortic Arch & Vena Cava vessels
  for (let i = 0; i < 300; i++) {
    const t = i / 300;
    const ax = -0.06 + Math.sin(t * Math.PI) * 0.035;
    const ay = 1.07 + t * 0.08;
    const az = 0.05 + Math.cos(t * Math.PI) * 0.025;
    addPoint(ax + (rand() - 0.5) * 0.01, ay, az, 1.0, 0.45, 0.45, 2);
  }

  // C. LUNGS (Bilateral thoracic lobes with bronchial tree) - 3,200 points
  for (let i = 0; i < 3200; i++) {
    const isLeft = i % 2 === 0;
    const cx = isLeft ? -0.13 : 0.13;
    const u = rand(), v = rand();
    const th = u * Math.PI * 2;
    const ph = Math.acos(2.0 * v - 1.0);
    const rad = Math.cbrt(rand()) * 0.068;
    const lx = cx + rad * Math.sin(ph) * Math.cos(th);
    const ly = 1.04 + rad * 2.1 * Math.cos(ph);
    const lz = 0.02 + rad * 1.05 * Math.sin(ph) * Math.sin(th);
    addPoint(lx, ly, lz, 0.45, 0.88, 0.94, 3); // Organ 3 = Lungs
  }

  // D. SPINAL CORD / NERVOUS AXIS - 1,800 points
  for (let i = 0; i < 1800; i++) {
    const t = rand();
    const sy = 1.32 - t * 0.98;
    const sz = -0.05 - 0.045 * Math.sin(t * Math.PI * 2) + (rand() - 0.5) * 0.015;
    const sx = (rand() - 0.5) * 0.018;
    addPoint(sx, sy, sz, 0.95, 0.92, 0.75, 4); // Organ 4 = Spine
  }

  // E. SURFACE CONTOUR MATRIX - 18,000 points strictly along body envelope
  for (let i = 0; i < 18000; i++) {
    const y = -1.45 + rand() * 3.1;
    let rx = 0.18, rz = 0.14, cx = 0, cz = 0;

    if (y > 1.34) {
      // Head
      rx = 0.11; rz = 0.13; cz = 0.01;
    } else if (y > 1.20) {
      // Neck
      rx = 0.068; rz = 0.068;
    } else if (y > 0.80) {
      // Thorax / Chest
      rx = 0.28 + 0.06 * Math.sin(((y - 0.8) / 0.4) * Math.PI);
      rz = 0.16;
    } else if (y > 0.45) {
      // Abdomen / Waist
      rx = 0.23; rz = 0.14;
    } else if (y > 0.22) {
      // Pelvis / Hips
      rx = 0.28; rz = 0.17;
    } else if (y > -0.50) {
      // Thighs (bilateral)
      const side = rand() > 0.5 ? 1 : -1;
      cx = side * 0.14;
      rx = 0.078; rz = 0.078;
    } else if (y > -1.25) {
      // Calves / Shins (bilateral)
      const side = rand() > 0.5 ? 1 : -1;
      cx = side * 0.14;
      rx = 0.055; rz = 0.058; cz = -0.01;
    } else {
      // Feet
      const side = rand() > 0.5 ? 1 : -1;
      cx = side * 0.14;
      rx = 0.042; rz = 0.075; cz = 0.05;
    }

    const angle = rand() * Math.PI * 2;
    // Surface shell points with gentle volume variation
    const rFactor = 0.92 + 0.08 * rand();
    const px = cx + rx * rFactor * Math.cos(angle);
    const pz = cz + rz * rFactor * Math.sin(angle);

    addPoint(px, y, pz, 0.78, 0.86, 0.96, 0); // Body shell
  }

  return {
    linePositions: new Float32Array(lineCoords),
    lineColors: new Float32Array(lineCols),
    lineZoneTypes: new Float32Array(lineZones),

    pointPositions: new Float32Array(ptCoords),
    pointColors: new Float32Array(ptCols),
    pointOrganTypes: new Float32Array(ptOrgans),
    pointPhases: new Float32Array(ptPhases),
  };
}
