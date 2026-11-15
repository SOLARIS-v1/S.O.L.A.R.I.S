'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  PlayCircle,
  ExternalLink,
  Info,
  Maximize,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Layers,
  Activity,
  RotateCcw
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

const dateLabel = (iso: string) => {
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
};

/**
 * Animated SVG/Canvas demonstration fallback player when external MP4 or YouTube is unavailable
 */
function KinematicCanvasDemonstration({
  exerciseName,
  isPlaying,
  time,
}: {
  exerciseName: string;
  isPlaying: boolean;
  time: number;
}) {
  const phase = time % 1;
  const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/80 rounded-2xl p-4 relative overflow-hidden border border-slate-200">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none" />

      {/* Animated Biomechanical Silhouette */}
      <svg viewBox="0 0 200 160" className="w-48 h-36 relative z-10">
        {/* Floor Line */}
        <line x1="20" y1="140" x2="180" y2="140" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* Hip, Knee, Ankle calculation for demonstration */}
        <g stroke="#4F46E5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Torso & Head */}
          <circle cx={100} cy={35 + k * 18} r="10" fill="#4F46E5" />
          <line x1={100} y1={45 + k * 18} x2={100} y2={85 + k * 26} />
          
          {/* Leg & Knee bending */}
          <polyline
            points={`100,${85 + k * 26} ${82 - k * 8},${112 + k * 16} 86,138`}
          />
          <polyline
            points={`100,${85 + k * 26} ${118 + k * 8},${112 + k * 16} 114,138`}
          />

          {/* Barbell / Equipment */}
          <line
            x1="50"
            y1={75 + k * 45}
            x2="150"
            y2={75 + k * 45}
            stroke="#1E293B"
            strokeWidth="4"
          />
          <circle cx="55" cy={75 + k * 45} r="9" fill="#0F172A" />
          <circle cx="145" cy={75 + k * 45} r="9" fill="#0F172A" />

          {/* Arms holding bar */}
          <polyline points={`100,${55 + k * 18} 92,${65 + k * 32} 85,${75 + k * 45}`} stroke="#6366F1" strokeWidth="4" />
          <polyline points={`100,${55 + k * 18} 108,${65 + k * 32} 115,${75 + k * 45}`} stroke="#6366F1" strokeWidth="4" />
        </g>
      </svg>

      {/* Live Form Overlay Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 border border-slate-200/90 shadow-sm text-[10px] font-mono font-bold text-indigo-700">
        <Activity className="w-3 h-3 text-indigo-600 animate-pulse" />
        <span>ARED KINEMATIC SIMULATION</span>
      </div>

      <div className="absolute bottom-3 right-3 text-[10.5px] font-mono text-slate-500 bg-white/90 px-2 py-0.5 rounded-lg border border-slate-200">
        Phase: <strong className="text-slate-800">{k < 0.5 ? 'Eccentric Descent' : 'Concentric Drive'}</strong>
      </div>
    </div>
  );
}

/**
 * Embedded NASA Clip Player with robust fallback and Neumorphic controls
 */
function ClipPlayer({ video }: { video: ExerciseVideo }) {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(video.start);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [simTime, setSimTime] = useState(0);

  const length = Math.max(1, video.end - video.start);

  // Fallback animation ticker
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        setSimTime((prev) => (prev + dt / 3.0) % 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTime = () => {
      if (el.currentTime >= video.end || el.currentTime < video.start - 0.5) {
        el.currentTime = video.start;
        void el.play().catch(() => {});
      }
      setT(el.currentTime);
    };

    const onError = () => setHasError(true);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('error', onError);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('error', onError);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [video.start, video.end]);

  const toggle = () => {
    const el = ref.current;
    if (el) {
      if (el.paused) void el.play().catch(() => {});
      else el.pause();
    }
    setPlaying(!playing);
  };

  const into = Math.min(length, Math.max(0, t - video.start));
  const pct = (100 * into) / length;

  if (hasError || !video.mp4) {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-white shadow-inner flex flex-col justify-between">
        <KinematicCanvasDemonstration
          exerciseName={video.shows || video.title}
          isPlaying={playing}
          time={simTime}
        />
        {/* Playback bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 font-mono text-xs">
          <button
            onClick={() => setPlaying(!playing)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-colors"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            <span>{playing ? 'PAUSE' : 'PLAY'}</span>
          </button>
          <span className="text-[11px] text-slate-500">Continuous Form Loop</span>
          <span className="text-[11px] text-indigo-600 font-semibold">{mmss(length)} repetition pace</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={box} className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-md group">
      <video
        ref={ref}
        src={`${video.mp4}#t=${video.start}`}
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        className="w-full h-full object-cover"
        aria-label={`${video.shows || video.title}: ${video.who}`}
      />

      {/* Control bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center gap-3 text-white">
        <button
          type="button"
          onClick={toggle}
          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden relative cursor-pointer">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>

        <span className="text-[11px] font-mono text-slate-300">
          {mmss(into)} / {mmss(length)}
        </span>

        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </div>
  );
}

/**
 * Pure Light-Neumorphic VideoButton & Modal with resilient fully local fallback
 */
export function VideoButton({ video }: { video: ExerciseVideo }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'simulation'>('simulation');

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
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <PlayCircle className="w-5 h-5" />
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

              {/* Mode switch pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('simulation')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'simulation'
                      ? 'bg-white text-indigo-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kinematics
                </button>
                {video.mp4 && (
                  <button
                    onClick={() => setActiveTab('video')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'video'
                        ? 'bg-white text-indigo-600 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Local Clip
                  </button>
                )}
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

            {/* Video / Demonstration Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner flex items-center justify-center relative">
                {activeTab === 'video' && video.mp4 ? (
                  <ClipPlayer video={video} />
                ) : (
                  <KinematicCanvasDemonstration
                    exerciseName={video.shows || video.title}
                    isPlaying={true}
                    time={0.5}
                  />
                )}
              </div>

              {/* Coaching Note Callout */}
              {video.note && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/60 text-xs text-indigo-950 font-medium">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{video.note}</span>
                </div>
              )}

              {/* Citation & Provenance Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">SOURCE</span>
                  <span className="font-bold text-slate-800 line-clamp-1">{video.channel || 'NASA Johnson Space Center'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">PUBLISHED</span>
                  <span className="font-bold text-slate-800">{dateLabel(video.published || video.date)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">CLIP WINDOW</span>
                  <span className="font-bold text-slate-800">{mmss(video.start)} – {mmss(video.end)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">LICENSE</span>
                  <span className="font-bold text-emerald-600">NASA Public Domain</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Spaceflight Physical Countermeasures Protocol
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
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
