'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ExerciseDef } from '../../data/solarisCatalog';
import { Pause, Play, RotateCcw } from 'lucide-react';

/*
 * High-Precision Biomechanical Astronaut Visualization
 *
 * Each exercise computes poses as a function of phase t (0..1, looping) placing hips, torso,
 * feet and hands. Elbows and knees are solved with two-bone inverse kinematics (IK), ensuring
 * feet stay planted and hands maintain contact with equipment.
 * Full light-neumorphic theme compatibility with explicit clinical palette.
 */

type P = [number, number];
interface Pose {
  hip: P;
  /** Torso lean from vertical, degrees; positive leans forward (right). */
  torso: number;
  /** Ankle positions, far leg first. */
  feet: [P, P];
  /** How far each heel is lifted, 0..1 (pivots on the toe). */
  heel?: [number, number];
  /** Hand targets, far arm first. */
  hands: [P, P];
  /** Equipment drawn under the figure. */
  bar?: P;
  crank?: { c: P; r: number; a: number };
  cable?: { from: P; to: P };
  belt?: number;
  /** Bar on the upper back (squat, heel raise): draw plate behind body */
  barBehind?: boolean;
  /** Lying on bench */
  lying?: boolean;
  seat?: P;
}

const L = { torso: 50, neck: 7, head: 11, thigh: 40, shin: 40, foot: 15, upper: 29, fore: 27 };
const FLOOR = 178;
const rad = (d: number) => (d * Math.PI) / 180;
const ease = (t: number) => 0.5 - 0.5 * Math.cos(2 * Math.PI * t); // 0 -> 1 -> 0 over one loop
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mixP = (a: P, b: P, k: number): P => [mix(a[0], b[0], k), mix(a[1], b[1], k)];

/**
 * Two-bone IK: middle joint (knee or elbow) for chain from `a` to target `t`.
 */
function ik(a: P, t: P, l1: number, l2: number, prefer: (j: P) => number): P {
  const dx = t[0] - a[0];
  const dy = t[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const at = (ang: number): P => [a[0] + l1 * Math.cos(ang), a[1] + l1 * Math.sin(ang)];
  const j1 = at(base + off);
  const j2 = at(base - off);
  return prefer(j1) >= prefer(j2) ? j1 : j2;
}

const shoulderOf = (p: Pose): P => [
  p.hip[0] + L.torso * Math.sin(rad(p.torso)),
  p.hip[1] - L.torso * Math.cos(rad(p.torso)),
];

const onBack = (sh: P, torso: number): P => [
  sh[0] - 5 * Math.cos(rad(torso)) - 3 * Math.sin(rad(torso)),
  sh[1] - 5 * Math.sin(rad(torso)) + 3 * Math.cos(rad(torso)),
];

const hipFor = (sh: P, torso: number): P => [
  sh[0] - L.torso * Math.sin(rad(torso)),
  sh[1] + L.torso * Math.cos(rad(torso)),
];

const ANKLE = 118;
const MIDFOOT = ANKLE + 6;
const FEET: [P, P] = [[ANKLE - 3, FLOOR - 4], [ANKLE + 3, FLOOR - 4]];
const ARM = L.upper + L.fore - 2;

const POSES: Record<string, { period: number; pose: (t: number) => Pose }> = {
  squat: {
    period: 3.4,
    pose: (t) => {
      const k = ease(t);
      const torso = mix(6, 32, k);
      const sh: P = [mix(MIDFOOT - 2, MIDFOOT - 1, k), mix(50, 96, k)];
      const hip = hipFor(sh, torso);
      const bar = onBack(sh, torso);
      return {
        hip,
        torso,
        feet: FEET,
        hands: [[bar[0] + 7, bar[1] + 2], [bar[0] + 10, bar[1] + 3]],
        bar,
        barBehind: true,
      };
    },
  },
  deadlift: {
    period: 3.6,
    pose: (t) => {
      const k = ease(t);
      const torso = mix(4, 56, k);
      const sh: P = [mix(MIDFOOT - 3, MIDFOOT + 4, k), mix(48, 96, k)];
      const hip = hipFor(sh, torso);
      const bar: P = [sh[0] - 1, sh[1] + ARM];
      return { hip, torso, feet: FEET, hands: [bar, [bar[0] + 2, bar[1]]], bar };
    },
  },
  heel_raise: {
    period: 2.4,
    pose: (t) => {
      const k = ease(t);
      const lift = 9 * k;
      const torso = 4;
      const sh: P = [MIDFOOT - 3, 50 - lift];
      const hip = hipFor(sh, torso);
      const bar = onBack(sh, torso);
      return {
        hip,
        torso,
        feet: [[FEET[0][0], FEET[0][1] - lift], [FEET[1][0], FEET[1][1] - lift]],
        heel: [k, k],
        hands: [[bar[0] + 7, bar[1] + 2], [bar[0] + 10, bar[1] + 3]],
        bar,
        barBehind: true,
      };
    },
  },
  press: {
    period: 3.0,
    pose: (t) => {
      const k = ease(t);
      const hip: P = [86, 136];
      const bar: P = mixP([135, 80], [125, 122], k);
      return {
        hip,
        torso: 90,
        feet: [[58, FLOOR - 4], [63, FLOOR - 4]],
        hands: [bar, [bar[0] + 2, bar[1]]],
        bar,
        lying: true,
      };
    },
  },
  row: {
    period: 3.0,
    pose: (t) => {
      const k = ease(t);
      const hip: P = [92, 158];
      const torso = mix(16, -10, k);
      const hand: P = mixP([150, 140], [116, 130], k);
      return {
        hip,
        torso,
        feet: [[148, 164], [152, 164]],
        hands: [hand, [hand[0] + 2, hand[1] + 2]],
        cable: { from: [hand[0] + 4, hand[1]], to: [184, 160] },
        seat: [92, 164],
      };
    },
  },
  run: {
    period: 0.8,
    pose: (t) => {
      const a = 2 * Math.PI * t;
      const foot = (ph: number): P => [
        118 + 22 * Math.cos(a + ph),
        FLOOR - 4 - Math.max(0, 15 * Math.sin(a + ph)),
      ];
      const hip: P = [114, 100 - 3 * Math.abs(Math.sin(a))];
      const sh = shoulderOf({ hip, torso: 7 } as Pose);
      const hand = (ph: number): P => [
        sh[0] + 14 * Math.cos(a + ph + Math.PI) + 6,
        sh[1] + 30 - 8 * Math.sin(a + ph + Math.PI),
      ];
      return {
        hip,
        torso: 7,
        feet: [foot(Math.PI), foot(0)],
        hands: [hand(Math.PI), hand(0)],
        belt: t,
      };
    },
  },
  cycle: {
    period: 1.1,
    pose: (t) => {
      const a = 2 * Math.PI * t;
      const c: P = [124, 158];
      const r = 15;
      const pedal = (ph: number): P => [
        c[0] + r * Math.cos(a + ph),
        c[1] + r * Math.sin(a + ph),
      ];
      return {
        hip: [117, 100],
        torso: 12,
        feet: [pedal(Math.PI), pedal(0)],
        hands: [[148, 90], [150, 92]],
        crank: { c, r, a },
      };
    },
  },
};

/** Tapered capsule for smooth organic body limbs */
function Capsule({
  a,
  b,
  r1,
  r2,
  fill,
  stroke,
}: {
  a: P;
  b: P;
  r1: number;
  r2: number;
  fill: string;
  stroke?: string;
}) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const n: P = [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  const pts = [
    [a[0] + n[0] * r1, a[1] + n[1] * r1],
    [b[0] + n[0] * r2, b[1] + n[1] * r2],
    [b[0] - n[0] * r2, b[1] - n[1] * r2],
    [a[0] - n[0] * r1, a[1] - n[1] * r1],
  ];
  return (
    <g>
      <polygon points={pts.map((q) => q.join(',')).join(' ')} fill={fill} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
      <circle cx={a[0]} cy={a[1]} r={r1} fill={fill} />
      <circle cx={b[0]} cy={b[1]} r={r2} fill={fill} />
    </g>
  );
}

function Figure({ p }: { p: Pose }) {
  const t = rad(p.torso);
  const up: P = [Math.sin(t), -Math.cos(t)];
  let fwd: P = [Math.cos(t), Math.sin(t)];
  if (p.lying) fwd = [-fwd[0], -fwd[1]];
  const at = (o: P, d: P, k: number): P => [o[0] + d[0] * k, o[1] + d[1] * k];
  const sh = shoulderOf(p);
  const neck = at(sh, up, L.neck);
  const head = at(neck, up, L.head);

  // Palette: Professional NASA Astronaut / SOLARIS Athletic Gear
  const C_SHIRT = '#4F46E5'; // Royal Indigo
  const C_SHORTS = '#1E293B'; // Slate Navy
  const C_SKIN_NEAR = '#F5C6A5'; // Warm Natural Skin
  const C_SKIN_FAR = '#E0A885'; // Depth shaded skin
  const C_ACCENT = '#F97316'; // Vivid Flight Orange
  const C_SOCK = '#FFFFFF';
  const C_SHOE = '#334155';
  const C_HAIR = '#292524';
  const C_HEADSET = '#475569';

  const leg = (ankle: P, heel = 0) => {
    const knee = ik(p.hip, ankle, L.thigh, L.shin, p.lying ? (j) => -j[1] : (j) => j[0]);
    const toe: P = [ankle[0] + L.foot * Math.cos(rad(-heel * 40)), ankle[1] + 3 + heel * 8];
    return { knee, ankle, toe };
  };
  const arm = (hand: P) => ({
    elbow: ik(sh, hand, L.upper, L.fore, (j) => j[1] - 0.3 * j[0]),
    hand,
  });

  const drawLeg = (l: ReturnType<typeof leg>, far: boolean) => {
    const skin = far ? C_SKIN_FAR : C_SKIN_NEAR;
    return (
      <g opacity={far ? 0.78 : 1}>
        <Capsule a={l.knee} b={l.ankle} r1={5.2} r2={3.8} fill={skin} />
        <Capsule a={mixP(l.ankle, l.knee, 0.24)} b={l.ankle} r1={4.3} r2={4.3} fill={C_SOCK} />
        {/* Athletic trainer shoe */}
        <Capsule a={[l.ankle[0] - 2.5, l.ankle[1] + 1.5]} b={l.toe} r1={4.4} r2={3.6} fill={C_SHOE} />
        <Capsule a={[l.ankle[0] - 3, l.ankle[1] + 4.6]} b={[l.toe[0] + 1, l.toe[1] + 2.4]} r1={1.4} r2={1.4} fill={C_ACCENT} />
        {/* Thigh */}
        <Capsule a={p.hip} b={l.knee} r1={7.4} r2={5.4} fill={skin} />
        {/* Compression Shorts */}
        <Capsule a={p.hip} b={mixP(p.hip, l.knee, 0.62)} r1={8.2} r2={7} fill={C_SHORTS} />
      </g>
    );
  };

  const drawArm = (a: ReturnType<typeof arm>, far: boolean) => {
    const skin = far ? C_SKIN_FAR : C_SKIN_NEAR;
    return (
      <g opacity={far ? 0.78 : 1}>
        <Capsule a={a.elbow} b={a.hand} r1={3.9} r2={3.2} fill={skin} />
        <Capsule a={sh} b={a.elbow} r1={4.8} r2={4} fill={skin} />
        <Capsule a={sh} b={mixP(sh, a.elbow, 0.5)} r1={6.2} r2={5.4} fill={C_SHIRT} />
        {!far && (
          <Capsule
            a={mixP(a.elbow, a.hand, 0.72)}
            b={mixP(a.elbow, a.hand, 0.86)}
            r1={3.6}
            r2={3.6}
            fill={C_ACCENT}
          />
        )}
        <circle cx={a.hand[0]} cy={a.hand[1]} r={4.3} fill={skin} />
      </g>
    );
  };

  const [farLeg, nearLeg] = [leg(p.feet[0], p.heel?.[0]), leg(p.feet[1], p.heel?.[1])];
  const [farArm, nearArm] = [arm(p.hands[0]), arm(p.hands[1])];

  // Torso
  const pts = [at(p.hip, fwd, 8.5), at(sh, fwd, 10), at(sh, fwd, -10.5), at(p.hip, fwd, -9)];
  const torsoPath = `M${pts.map((q) => q.join(',')).join(' L')} Z`;
  const patch = at(at(sh, up, -11), fwd, 5);
  const collar = at(sh, up, 1.5);

  // Head in profile with comms headset
  const hairC = at(at(head, fwd, -1.8), up, 1.6);
  const faceC = at(head, fwd, 0.8);
  const nose = at(at(head, fwd, 10), up, -0.8);
  const eye = at(at(head, fwd, 6.2), up, 1.4);
  const brow1 = at(at(head, fwd, 4.6), up, 4.2);
  const brow2 = at(at(head, fwd, 8.2), up, 3.8);
  const cup = at(at(head, fwd, -4.6), up, -0.6);
  const bandTop = at(at(head, fwd, -2), up, 11.4);
  const mic = at(at(head, fwd, 8), up, -6.8);
  const feetX = (p.feet[0][0] + p.feet[1][0]) / 2;

  return (
    <g>
      {/* Ground shadow */}
      {!p.lying && !p.seat && (
        <ellipse cx={feetX + 6} cy={FLOOR + 1} rx={32} ry={4} fill="#94A3B8" opacity={0.35} />
      )}

      {drawLeg(farLeg, true)}
      {drawArm(farArm, true)}

      {/* Neck */}
      <Capsule a={sh} b={neck} r1={4.2} r2={3.8} fill={C_SKIN_NEAR} />

      {/* Hip / Pelvis */}
      <circle cx={p.hip[0]} cy={p.hip[1]} r={9} fill={C_SHORTS} />

      {/* Torso Shirt */}
      <path d={torsoPath} fill={C_SHIRT} stroke={C_SHIRT} strokeWidth="5" strokeLinejoin="round" />
      <circle cx={collar[0]} cy={collar[1]} r={4.6} fill="#3730A3" />
      <circle cx={patch[0]} cy={patch[1]} r={2.7} fill={C_ACCENT} />

      {/* Head & Features */}
      <circle cx={hairC[0]} cy={hairC[1]} r={10.9} fill={C_HAIR} />
      <circle cx={faceC[0]} cy={faceC[1]} r={9.7} fill={C_SKIN_NEAR} />
      <circle cx={nose[0]} cy={nose[1]} r={2.2} fill={C_SKIN_NEAR} />
      <circle cx={eye[0]} cy={eye[1]} r={1.3} fill="#1E293B" />
      <line x1={brow1[0]} y1={brow1[1]} x2={brow2[0]} y2={brow2[1]} stroke={C_HAIR} strokeWidth="1.6" strokeLinecap="round" />

      {/* Comms Headset */}
      <path
        d={`M${cup.join(',')} Q${bandTop.join(',')} ${at(cup, up, 1).join(',')}`}
        stroke={C_HEADSET}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <line x1={cup[0]} y1={cup[1]} x2={mic[0]} y2={mic[1]} stroke={C_HEADSET} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx={mic[0]} cy={mic[1]} r={1.6} fill={C_ACCENT} />
      <circle cx={cup[0]} cy={cup[1]} r={3} fill={C_HEADSET} />

      {drawLeg(nearLeg, false)}
      {drawArm(nearArm, false)}
    </g>
  );
}

function Plate({ at }: { at: P }) {
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={14} fill="#64748B" stroke="#334155" strokeWidth="2.5" />
      <circle cx={at[0]} cy={at[1]} r={8} fill="none" stroke="#94A3B8" strokeWidth="1.5" />
      <circle cx={at[0]} cy={at[1]} r={3} fill="#1E293B" />
    </g>
  );
}

function Equipment({ p, under }: { p: Pose; under: boolean }) {
  const C_MACHINE = '#CBD5E1';
  const C_FRAME = '#64748B';
  const C_FLOOR = '#94A3B8';
  const C_ACCENT = '#F97316';

  if (under) {
    return (
      <g>
        {/* Floor Line */}
        <line x1={15} y1={FLOOR} x2={235} y2={FLOOR} stroke={C_FLOOR} strokeWidth="2.5" strokeLinecap="round" />

        {p.bar && p.barBehind && <Plate at={p.bar} />}

        {/* Treadmill (T2) */}
        {p.belt !== undefined && (
          <g>
            <rect x={55} y={FLOOR - 3} width={140} height={9} rx={4.5} fill={C_MACHINE} stroke={C_FRAME} strokeWidth="1.5" />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const x = 60 + (((i * 125) / 6 - p.belt! * 125 + 1250) % 125);
              return (
                <line key={i} x1={x} y1={FLOOR + 1.5} x2={x + 9} y2={FLOOR + 1.5} stroke={C_FRAME} strokeWidth="2" strokeLinecap="round" />
              );
            })}
            {/* Subject harness bungee loading cords */}
            <line x1={p.hip[0]} y1={p.hip[1]} x2={68} y2={FLOOR - 3} stroke={C_ACCENT} strokeWidth="2" strokeDasharray="3 3" />
            <line x1={p.hip[0]} y1={p.hip[1]} x2={180} y2={FLOOR - 3} stroke={C_ACCENT} strokeWidth="2" strokeDasharray="3 3" />
          </g>
        )}

        {/* Bench Press Platform */}
        {p.lying && (
          <g>
            <rect x={50} y={142} width={115} height={12} rx={4} fill={C_MACHINE} stroke={C_FRAME} strokeWidth="1.5" />
            <line x1={68} y1={154} x2={68} y2={FLOOR} stroke={C_FRAME} strokeWidth="4" strokeLinecap="round" />
            <line x1={148} y1={154} x2={148} y2={FLOOR} stroke={C_FRAME} strokeWidth="4" strokeLinecap="round" />
          </g>
        )}

        {/* Row Seat */}
        {p.seat && (
          <rect x={p.seat[0] - 22} y={p.seat[1]} width={48} height={FLOOR - p.seat[1]} rx={3} fill={C_MACHINE} stroke={C_FRAME} strokeWidth="1.5" />
        )}

        {/* Cable machine / Flywheel */}
        {p.cable && (
          <g>
            <rect x={178} y={148} width={34} height={FLOOR - 148} rx={4} fill={C_MACHINE} stroke={C_FRAME} strokeWidth="1.5" />
            <circle cx={195} cy={162} r={9} fill="none" stroke={C_FRAME} strokeWidth="2.5" />
          </g>
        )}

        {/* CEVIS Cycle Ergometer */}
        {p.crank && (
          <g>
            <line x1={p.crank.c[0]} y1={p.crank.c[1]} x2={p.crank.c[0] + 10} y2={FLOOR} stroke={C_FRAME} strokeWidth="4" strokeLinecap="round" />
            <line x1={p.crank.c[0]} y1={p.crank.c[1]} x2={152} y2={88} stroke={C_FRAME} strokeWidth="4" strokeLinecap="round" />
            <line x1={144} y1={88} x2={160} y2={88} stroke={C_FRAME} strokeWidth="3" strokeLinecap="round" />
            <circle cx={p.crank.c[0]} cy={p.crank.c[1]} r={p.crank.r + 6} fill="none" stroke={C_FRAME} strokeWidth="2.5" />
          </g>
        )}
      </g>
    );
  }

  // Equipment drawn on top of figure
  return (
    <g>
      {p.bar && !p.barBehind && <Plate at={p.bar} />}
      {p.cable && (
        <line
          x1={p.cable.from[0]}
          y1={p.cable.from[1]}
          x2={p.cable.to[0]}
          y2={p.cable.to[1]}
          stroke="#475569"
          strokeWidth="2"
        />
      )}
      {p.crank && (
        <g>
          {[0, Math.PI].map((ph) => {
            const x = p.crank!.c[0] + p.crank!.r * Math.cos(p.crank!.a + ph);
            const y = p.crank!.c[1] + p.crank!.r * Math.sin(p.crank!.a + ph);
            return (
              <line
                key={ph}
                x1={p.crank!.c[0]}
                y1={p.crank!.c[1]}
                x2={x}
                y2={y}
                stroke="#334155"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      )}
    </g>
  );
}

// ------------------------------------------------------------------ Main Component
export function AstroFigure({ anim, label }: { anim: ExerciseDef['anim']; label: string }) {
  const def = POSES[anim] || POSES.deadlift || POSES.squat;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [reps, setReps] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  // High-precision smooth animation loop
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      setT((prevT) => {
        const nextT = (prevT + (dt * speed) / (def.period || 3.0)) % 1;
        if (nextT < prevT) {
          setReps((r) => r + 1);
        }
        return nextT;
      });

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, def.period]);

  const pose = def.pose(t);

  // Biomechanical phase identification
  const getPhaseName = () => {
    if (anim === 'run') {
      return t < 0.5 ? 'Right Leg Stance / Mid-Foot Drive' : 'Left Leg Stance / Cadence Swing';
    }
    if (anim === 'cycle') {
      return t < 0.5 ? 'Drive Phase (Power Stroke)' : 'Recovery Phase (Upstroke)';
    }
    if (anim === 'squat' || anim === 'deadlift') {
      if (t < 0.2) return 'Top Lockout / Core Braced';
      if (t < 0.5) return 'Eccentric Descent / Hip Hinge';
      if (t < 0.6) return 'Bottom Depth / Plantar Drive';
      return 'Concentric Ascent / Glute Extension';
    }
    if (anim === 'press') {
      return t < 0.5 ? 'Eccentric Lowering to Sternum' : 'Concentric Press to Lockout';
    }
    if (anim === 'row') {
      return t < 0.5 ? 'Concentric Pull to Lower Ribs' : 'Eccentric Return & Reach';
    }
    return t < 0.5 ? 'Extension / Lift Phase' : 'Descent / Plant Phase';
  };

  return (
    <div ref={box} className="w-full flex flex-col items-center gap-3 select-none">
      {/* Biomechanical Canvas Container - Soft Neumorphic Card */}
      <div className="relative w-full aspect-[4/3] rounded-2xl bg-gradient-to-b from-[#FFFFFF] to-[#F4F7FC] border border-slate-200/90 overflow-hidden shadow-inner flex items-center justify-center">
        <svg
          viewBox="-6 -4 252 192"
          className="w-full h-full block"
          role="img"
          aria-label={`Animation: ${label}`}
        >
          <Equipment p={pose} under />
          <Figure p={pose} />
          <Equipment p={pose} under={false} />
        </svg>

        {/* Top HUD Bar with non-colliding layout */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none z-10">
          {/* Live Repetition Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm text-xs font-mono pointer-events-auto">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">REPS</span>
            <span className="font-extrabold text-indigo-600 tabular-nums text-sm">{reps}</span>
            <span className="text-[10px] text-slate-500">/ 8</span>
          </div>

          {/* Phase Pill with auto-truncation */}
          <div className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm text-[10.5px] font-mono pointer-events-auto max-w-[55%] truncate">
            <span className="text-indigo-600 font-bold truncate block">{getPhaseName()}</span>
          </div>
        </div>

        {/* Loop Timeline Indicator */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-[#5850EC] transition-all duration-75"
            style={{ width: `${Math.round(t * 100)}%` }}
          />
        </div>
      </div>

      {/* Interactive Form Controls - Pure Neumorphic Strip */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/80 font-mono text-xs shadow-sm">
        <div className="flex items-center gap-2">
          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/80 font-semibold transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title={playing ? 'Pause Form Motion' : 'Play Form Motion'}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            <span>{playing ? 'PAUSE' : 'PLAY'}</span>
          </button>

          {/* Reset Reps */}
          <button
            type="button"
            onClick={() => {
              setT(0);
              setReps(0);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Reset Reps and Timeline"
          >
            <RotateCcw size={12} />
            <span>RESET</span>
          </button>
        </div>

        {/* Phase Timeline Scrubber */}
        <div className="flex-1 min-w-[140px] max-w-xs flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(t * 100)}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value) / 100);
            }}
            className="w-full accent-indigo-600 cursor-pointer"
            title="Drag to inspect form at exact position"
          />
          <span className="text-[11px] text-slate-500 font-mono tabular-nums w-9">
            {Math.round(t * 100)}%
          </span>
        </div>

        {/* Playback Speed Multipliers */}
        <div className="flex items-center gap-1">
          {[0.5, 1, 1.5].map((sVal) => (
            <button
              key={sVal}
              onClick={() => setSpeed(sVal)}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono transition-colors shadow-2xs ${
                speed === sVal
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {sVal}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AstroFigure;
