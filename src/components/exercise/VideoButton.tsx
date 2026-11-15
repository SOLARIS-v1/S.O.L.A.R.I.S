'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  PlayCircle,
  Info,
  Pause,
  Play,
  RotateCcw,
  X,
  Sparkles,
  Activity,
  Layers,
  Shield,
  Gauge,
  Compass
} from 'lucide-react';

export interface ExerciseVideo {
  title: string;
  source: string;
  date: string;
  file: string;
  credit: string;
  start: number;
  end: number;
  mp4?: string;
  shows?: string;
  who: string;
  youtube?: string;
  where?: string;
  note?: string;
  url?: string;
  channel?: string;
  published: string;
  license_url?: string;
  license?: string;
}

const mmss = (sec: number) => {
  const v = Math.max(0, Math.round(sec));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};

/**
 * High-Precision Biomechanical NASA Astronaut Kinematics Simulation Player
 */
function KinematicSimulator({
  exerciseTitle,
  astronautName,
  equipmentName,
}: {
  exerciseTitle: string;
  astronautName: string;
  equipmentName?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0); // 0..1
  const [reps, setReps] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      setProgress((prev) => {
        const next = (prev + (dt * speed) / 3.2) % 1;
        if (next < prev) {
          setReps((r) => r + 1);
        }
        return next;
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, speed]);

  // Smooth sinusoidal motion curve: 0 (top/start) -> 1 (inflection depth) -> 0
  const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * progress);

  // Live joint angles
  const hipAngle = Math.round(165 - k * 110); // 165° to 55°
  const kneeAngle = Math.round(175 - k * 85); // 175° to 90°
  const barDisplacementCm = Math.round(k * 54);
  const loadNewtons = Math.round(820 + k * 95);

  const phaseLabel =
    progress < 0.2
      ? 'Top Lockout / Core Braced'
      : progress < 0.5
      ? 'Eccentric Descent / Hip Hinge'
      : progress < 0.6
      ? 'Bottom Depth / Plantar Drive'
      : 'Concentric Ascent / Glute Drive';

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Simulation Screen Container */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl bg-gradient-to-b from-[#F8FAFC] to-[#EDF2F7] border border-slate-200/90 overflow-hidden shadow-inner flex flex-col items-center justify-center p-4">
        {/* Microgravity Coordinate Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:20px_20px] opacity-60 pointer-events-none" />

        {/* Top Telemetry HUD Overlay */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm text-xs font-mono pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-800">NASA ARED KINEMATICS</span>
            <span className="text-slate-400">|</span>
            <span className="text-indigo-600 font-semibold">{astronautName}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm text-[11px] font-mono pointer-events-auto">
              <span className="text-slate-500">REPS: </span>
              <strong className="text-indigo-600 text-xs">{reps}</strong>
            </div>
            <div className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 shadow-sm text-[11px] font-mono font-bold text-indigo-700 pointer-events-auto">
              {phaseLabel}
            </div>
          </div>
        </div>

        {/* Biomechanical Astronaut Model SVG */}
        <svg viewBox="0 0 320 220" className="w-full h-full max-h-[260px] relative z-10 overflow-visible">
          {/* Ground Plate / Force Transducer */}
          <line x1="40" y1="195" x2="280" y2="195" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="200" x2="270" y2="200" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />

          {/* Dynamic Kinematic Skeleton & Contoured Muscular Form */}
          {(() => {
            const hipX = 148 - k * 18;
            const hipY = 118 + k * 34;
            const shoulderX = hipX + 16 + (1 - k) * 6;
            const shoulderY = hipY - 52 + k * 16;
            const headX = shoulderX + 4;
            const headY = shoulderY - 18;

            const ankleFarX = 126;
            const ankleFarY = 192;
            const ankleNearX = 154;
            const ankleNearY = 192;

            // Knee bend calculation
            const kneeFarX = 120 - k * 14;
            const kneeFarY = 156 + k * 12;
            const kneeNearX = 146 - k * 12;
            const kneeNearY = 158 + k * 10;

            // Barbell position (moves from shins at bottom to thighs at lockout)
            const barX = 175 - k * 8;
            const barY = 112 + k * 68;

            return (
              <g>
                {/* Far Leg */}
                <g stroke="#334155" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                  <line x1={hipX} y1={hipY} x2={kneeFarX} y2={kneeFarY} />
                  <line x1={kneeFarX} y1={kneeFarY} x2={ankleFarX} y2={ankleFarY} />
                </g>
                <circle cx={ankleFarX} cy={ankleFarY} r="5" fill="#1E293B" opacity="0.6" />

                {/* Torso & Head */}
                <g>
                  {/* Athletic Suit Contoured Torso */}
                  <line
                    x1={hipX}
                    y1={hipY}
                    x2={shoulderX}
                    y2={shoulderY}
                    stroke="#4F46E5"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  {/* Spine Core Reinforcement */}
                  <line
                    x1={hipX}
                    y1={hipY}
                    x2={shoulderX}
                    y2={shoulderY}
                    stroke="#F97316"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="4 4"
                  />

                  {/* Astronaut Head with Comm Headset */}
                  <circle cx={headX} cy={headY} r="13" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.5" />
                  {/* Visor tint */}
                  <path
                    d={`M ${headX + 4} ${headY - 6} Q ${headX + 13} ${headY} ${headX + 5} ${headY + 7}`}
                    stroke="#4F46E5"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Comms mic */}
                  <line x1={headX - 2} y1={headY + 6} x2={headX + 8} y2={headY + 8} stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
                  <circle cx={headX + 8} cy={headY + 8} r="2" fill="#F97316" />
                </g>

                {/* Near Leg */}
                <g stroke="#1E293B" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
                  <line x1={hipX} y1={hipY} x2={kneeNearX} y2={kneeNearY} />
                  <line x1={kneeNearX} y1={kneeNearY} x2={ankleNearX} y2={ankleNearY} />
                </g>
                {/* Athletic Footwear */}
                <ellipse cx={ankleNearX + 4} cy={ankleNearY + 2} rx="10" ry="4" fill="#334155" />
                <ellipse cx={ankleNearX + 4} cy={ankleNearY + 4} rx="9" ry="2" fill="#F97316" />

                {/* Arms gripping Barbell */}
                <g stroke="#4F46E5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                  <line x1={shoulderX} y1={shoulderY} x2={barX - 8} y2={barY - 8} />
                </g>
                <circle cx={barX - 8} cy={barY - 8} r="5" fill="#F5C6A5" />

                {/* Barbell Bar */}
                <line x1={barX - 35} y1={barY} x2={barX + 35} y2={barY} stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
                {/* ARED Vacuum Weight Plates */}
                <rect x={barX - 30} y={barY - 20} width="6" height="40" rx="2" fill="#0F172A" />
                <rect x={barX - 22} y={barY - 16} width="5" height="32" rx="2" fill="#475569" />
                <rect x={barX + 22} y={barY - 16} width="5" height="32" rx="2" fill="#475569" />
                <rect x={barX + 28} y={barY - 20} width="6" height="40" rx="2" fill="#0F172A" />

                {/* Live Joint Angle Indicators */}
                <g className="text-[10px] font-mono fill-indigo-700 font-bold">
                  {/* Hip Angle Label */}
                  <rect x={hipX - 38} y={hipY - 10} width="34" height="16" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x={hipX - 21} y={hipY + 2} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#4F46E5">
                    {hipAngle}°
                  </text>

                  {/* Knee Angle Label */}
                  <rect x={kneeNearX - 38} y={kneeNearY - 8} width="34" height="16" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                  <text x={kneeNearX - 21} y={kneeNearY + 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#059669">
                    {kneeAngle}°
                  </text>
                </g>
              </g>
            );
          })()}
        </svg>

        {/* Bottom Real-Time Telemetry Bar inside canvas */}
        <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm text-xs font-mono z-10">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[9.5px] text-slate-400 uppercase font-semibold block">ARED LOAD</span>
              <span className="font-extrabold text-slate-900">{loadNewtons} N <span className="text-[10px] font-normal text-slate-500">(185 lbs)</span></span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-[9.5px] text-slate-400 uppercase font-semibold block">BAR DISPLACEMENT</span>
              <span className="font-extrabold text-slate-900">{barDisplacementCm} cm</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">TEMPO:</span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10.5px]">
              2.0s Concentric · 2.0s Eccentric
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Controls Strip (Neumorphic) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-sm font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-[#5850EC] text-white font-bold shadow-sm hover:from-indigo-700 hover:to-indigo-800 transition-all active:scale-95 cursor-pointer"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProgress(0);
              setReps(0);
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Reset repetition count and timeline"
          >
            <RotateCcw size={13} />
            <span>RESET</span>
          </button>
        </div>

        {/* Scrubber Timeline */}
        <div className="flex-1 min-w-[150px] max-w-xs flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(progress * 100)}
            onChange={(e) => {
              setIsPlaying(false);
              setProgress(Number(e.target.value) / 100);
            }}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <span className="text-[11px] text-slate-600 font-mono w-9 tabular-nums">
            {Math.round(progress * 100)}%
          </span>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1">
          {[0.5, 1, 1.5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                speed === s
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Pure Light-Neumorphic VideoButton & Full Biomechanical Modal
 */
export function VideoButton({ video }: { video: ExerciseVideo }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'kinematics' | 'protocol'>('kinematics');

  const length = Math.max(1, video.end - video.start);
  const whoShort = (video.who || 'Astronaut').split(' ')[0];

  return (
    <>
      {/* Light Neumorphic Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-300 text-slate-800 hover:text-indigo-600 font-semibold text-xs shadow-sm hover:shadow-md transition-all active:scale-[0.98] group cursor-pointer"
      >
        <PlayCircle className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
        <span>Watch {whoShort}</span>
        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px]">
          {mmss(length)}
        </span>
      </button>

      {/* Modal Dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {video.shows || video.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {video.who} &middot; {video.where || 'International Space Station (ISS)'}
                  </p>
                </div>
              </div>

              {/* View Switcher Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('kinematics')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'kinematics'
                      ? 'bg-white text-indigo-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kinematics Simulator
                </button>
                <button
                  onClick={() => setActiveTab('protocol')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'protocol'
                      ? 'bg-white text-indigo-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Flight Protocol
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close demonstration"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {activeTab === 'kinematics' ? (
                <KinematicSimulator
                  exerciseTitle={video.shows || video.title}
                  astronautName={video.who}
                  equipmentName="ARED Vacuum Cylinder"
                />
              ) : (
                /* Protocol & Flight Surgeon Specifications */
                <div className="space-y-4 font-sans text-xs text-slate-700">
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 space-y-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span>NASA Advanced Resistive Exercise Device (ARED) Mechanics</span>
                    </span>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      ARED delivers up to 600 lbs (2,670 N) of constant resistive load using dual vacuum canisters.
                      Unlike free weights, microgravity inertia requires continuous eccentric braking to prevent joint overextension.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">PRIMARY TARGET SITES</span>
                      <strong className="text-slate-900 text-xs block mt-1">Lumbar Spine (L1-L5), Femoral Neck, Calcaneus</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">COUNTERMEASURE OBJECTIVE</span>
                      <strong className="text-emerald-700 text-xs block mt-1">Attenuate 1.5%/month bone mineral loss</strong>
                    </div>
                  </div>

                  {video.note && (
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 font-medium">
                      <strong>Operational Note:</strong> {video.note}
                    </div>
                  )}
                </div>
              )}

              {/* Provenance Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">SOURCE</span>
                  <span className="font-bold text-slate-800 line-clamp-1">{video.channel || 'NASA Johnson Space Center'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">LOCATION</span>
                  <span className="font-bold text-slate-800 line-clamp-1">{video.where || 'Node 3, ISS'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">RECORDED DATE</span>
                  <span className="font-bold text-slate-800">{video.date || 'Expedition Mission'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">CREW MEMBER</span>
                  <span className="font-bold text-indigo-700">{video.who}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                NASA Johnson Space Center · Human Research Program
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Demonstration
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VideoButton;