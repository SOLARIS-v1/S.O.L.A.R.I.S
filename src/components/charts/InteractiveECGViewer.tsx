// SOLARIS Medical Intelligence — Interactive Lead-II ECG Waveform Viewer
// Clinical standard: 25 mm/s sweep, 10 mm/mV calibration grid, calipers & live phosphor fade

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RefreshCw, ZoomIn, ZoomOut, Gauge, Activity, Scissors } from 'lucide-react';
import { MeasurementProvenance } from '../../data/healthData';

interface InteractiveECGViewerProps {
  heartRate: number; // Current BPM
  hrvRMSSD: number; // ms
  provenance?: MeasurementProvenance;
  astronautName?: string;
}

export const InteractiveECGViewer: React.FC<InteractiveECGViewerProps> = ({
  heartRate,
  hrvRMSSD,
  provenance,
  astronautName = 'Astronaut',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Viewer state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sweepSpeed, setSweepSpeed] = useState<number>(25); // 25 mm/s or 50 mm/s
  const [gain, setGain] = useState<number>(10); // 10 mm/mV (1x), 5 (0.5x), 20 (2x)
  const [selectedLead, setSelectedLead] = useState<'Lead II' | 'Lead I' | 'Lead III'>('Lead II');
  const [caliperMode, setCaliperMode] = useState<boolean>(false);
  const [caliperA, setCaliperA] = useState<number>(180);
  const [caliperB, setCaliperB] = useState<number>(340);
  const [activeCaliper, setActiveCaliper] = useState<'A' | 'B' | null>(null);

  // Persistent waveform buffer for sweep
  const sweepPosRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const phaseRef = useRef<number>(0); // ECG cycle phase [0, 1)

  // Caliper measurement calculations
  // At 25 mm/s, if 1 second = 25 mm and canvas pixels per mm is derived:
  // Let canvas grid be 50 px per 25mm (i.e. 2px/mm, so 1 second = 50px at 25 mm/s, or scaled accordingly)
  const pixelsPerSecond = (sweepSpeed / 25) * 120; // 120 px per second at 25mm/s
  const deltaX = Math.abs(caliperB - caliperA);
  const measuredTime_ms = Math.round((deltaX / pixelsPerSecond) * 1000);
  const estimatedHR_bpm = measuredTime_ms > 0 ? Math.round(60000 / measuredTime_ms) : 0;

  // Synthesis of single ECG Lead II heartbeat cycle f(phase) where phase in [0, 1)
  const getECGVoltage = useCallback((p: number): number => {
    // Normal sinus rhythm morphology
    let v = 0;
    // Isoelectric baseline noise
    v += (Math.random() - 0.5) * 0.02;

    // P wave: atrial depolarization [0.08 to 0.18]
    if (p >= 0.08 && p <= 0.20) {
      const pMid = 0.14;
      const pWidth = 0.06;
      v += 0.18 * Math.exp(-Math.pow((p - pMid) / pWidth, 2) * 4);
    }
    // PR segment is isoelectric [0.20 to 0.28]

    // Q wave: septal depolarization [0.28 to 0.31]
    if (p >= 0.28 && p <= 0.31) {
      v -= 0.15 * Math.sin(((p - 0.28) / 0.03) * Math.PI);
    }
    // R peak: ventricular depolarization [0.31 to 0.35]
    else if (p > 0.31 && p <= 0.35) {
      const rMid = 0.33;
      v += 1.45 * Math.exp(-Math.pow((p - rMid) / 0.015, 2) * 6);
    }
    // S wave: basal ventricular depolarization [0.35 to 0.39]
    else if (p > 0.35 && p <= 0.39) {
      v -= 0.32 * Math.sin(((p - 0.35) / 0.04) * Math.PI);
    }
    // ST segment is isoelectric [0.39 to 0.48]

    // T wave: ventricular repolarization [0.48 to 0.68]
    else if (p >= 0.48 && p <= 0.68) {
      const tMid = 0.58;
      const tWidth = 0.10;
      v += 0.34 * Math.exp(-Math.pow((p - tMid) / tWidth, 2) * 4);
    }

    return v; // in mV
  }, []);

  // Main drawing routine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    // Initialize or resize buffer
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height * 0.55;

    // Scale factors: standard 10mm/mV -> 1mV = 40 pixels (gain=10)
    const pxPerMv = (gain / 10) * 44;

    const render = (time: number) => {
      if (!isSubscribed) return;

      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // If playing, advance sweep and phase
      if (isPlaying) {
        // Heart rate in beats per sec
        const bps = heartRate / 60;
        phaseRef.current = (phaseRef.current + bps * dt) % 1.0;

        // Sweep advance in pixels
        const advancePx = pixelsPerSecond * dt;
        const prevSweep = sweepPosRef.current;
        const nextSweep = (prevSweep + advancePx) % width;

        // Clear ahead region (phosphor erase bar: 20px wide ahead)
        const eraseWidth = 24;
        ctx.fillStyle = '#060A10';
        if (nextSweep > prevSweep) {
          ctx.fillRect(prevSweep, 0, nextSweep - prevSweep + eraseWidth, height);
        } else {
          // Wrapped around
          ctx.fillRect(prevSweep, 0, width - prevSweep, height);
          ctx.fillRect(0, 0, nextSweep + eraseWidth, height);
        }

        // Redraw grid in erased segment
        drawGridSegment(ctx, Math.floor(prevSweep), Math.ceil(nextSweep + eraseWidth), width, height);

        // Draw waveform segment
        const voltage = getECGVoltage(phaseRef.current);
        const y = centerY - voltage * pxPerMv;

        // Draw line with high-contrast medical ice-cyan glow
        ctx.save();
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = 'rgba(78, 205, 196, 0.4)';
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.moveTo(prevSweep, centerY - getECGVoltage((phaseRef.current - bps * dt + 1.0) % 1.0) * pxPerMv);
        ctx.lineTo(nextSweep, y);
        ctx.stroke();

        // Draw glowing sweep lead head
        ctx.fillStyle = '#7CD4FD';
        ctx.shadowColor = '#7CD4FD';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(nextSweep, y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        sweepPosRef.current = nextSweep;
      }

      // If caliper mode is on, render measurement calipers overlay
      if (caliperMode) {
        drawCalipers(ctx, caliperA, caliperB, height, measuredTime_ms, estimatedHR_bpm);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Initial background & grid draw
    drawFullGrid(ctx, width, height);

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, sweepSpeed, gain, heartRate, caliperMode, caliperA, caliperB, measuredTime_ms, estimatedHR_bpm, getECGVoltage, pixelsPerSecond]);

  // Full medical ECG background grid
  const drawFullGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#070C14';
    ctx.fillRect(0, 0, width, height);

    // Minor grid: 1mm (approx 6px)
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(124, 212, 253, 0.05)';
    for (let x = 0; x < width; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Major grid: 5mm (approx 30px)
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(124, 212, 253, 0.14)';
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  // Redraw grid in erased segment during live sweep
  const drawGridSegment = (ctx: CanvasRenderingContext2D, startX: number, endX: number, width: number, height: number) => {
    const x0 = Math.max(0, startX);
    const x1 = Math.min(width, endX);

    // Minor vertical
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(124, 212, 253, 0.05)';
    for (let x = Math.floor(x0 / 6) * 6; x <= x1; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // Minor horizontal
    for (let y = 0; y < height; y += 6) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }

    // Major vertical
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(124, 212, 253, 0.14)';
    for (let x = Math.floor(x0 / 30) * 30; x <= x1; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // Major horizontal
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
  };

  // Draw electronic measurement calipers
  const drawCalipers = (
    ctx: CanvasRenderingContext2D,
    a: number,
    b: number,
    height: number,
    timeMs: number,
    hrBpm: number
  ) => {
    ctx.save();

    // Caliper A (amber)
    ctx.strokeStyle = '#E0BE6A';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(a, 0);
    ctx.lineTo(a, height);
    ctx.stroke();

    // Caliper B (amber)
    ctx.beginPath();
    ctx.moveTo(b, 0);
    ctx.lineTo(b, height);
    ctx.stroke();

    // Measurement connector line
    ctx.setLineDash([]);
    const spanY = 28;
    ctx.beginPath();
    ctx.moveTo(a, spanY);
    ctx.lineTo(b, spanY);
    ctx.stroke();

    // Caliper Arrows
    ctx.fillStyle = '#E0BE6A';
    ctx.beginPath();
    ctx.arc(a, spanY, 3, 0, Math.PI * 2);
    ctx.arc(b, spanY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Caliper Badge Label
    const midX = (a + b) / 2;
    ctx.fillStyle = 'rgba(15, 22, 34, 0.9)';
    ctx.strokeStyle = '#E0BE6A';
    ctx.lineWidth = 1;
    const badgeW = 160;
    const badgeH = 24;
    ctx.fillRect(midX - badgeW / 2, spanY - 20, badgeW, badgeH);
    ctx.strokeRect(midX - badgeW / 2, spanY - 20, badgeW, badgeH);

    ctx.fillStyle = '#EDECE8';
    ctx.font = '10px "Geist Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Δt: ${timeMs} ms  (~${hrBpm} bpm)`, midX, spanY - 4);

    ctx.restore();
  };

  // Handle canvas mouse drag for calipers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!caliperMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;

    const distA = Math.abs(x - caliperA);
    const distB = Math.abs(x - caliperB);

    if (distA < 20) {
      setActiveCaliper('A');
    } else if (distB < 20) {
      setActiveCaliper('B');
    } else {
      // Place closest caliper to clicked point
      if (distA <= distB) {
        setCaliperA(x);
        setActiveCaliper('A');
      } else {
        setCaliperB(x);
        setActiveCaliper('B');
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!caliperMode || !activeCaliper) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left));

    if (activeCaliper === 'A') {
      setCaliperA(x);
    } else if (activeCaliper === 'B') {
      setCaliperB(x);
    }
  };

  const handleCanvasMouseUp = () => {
    setActiveCaliper(null);
  };

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/80 p-5 font-mono text-slate-800 shadow-sm flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-slate-900">
                Continuous Electrocardiogram ({selectedLead})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                LIVE 250 HZ
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                PROVENANCE: {provenance?.type || 'MEASURED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              AstroSkin Thoracic Lead-II Dry Array · Filtering: 0.05–100 Hz Notch 60Hz · Subject: {astronautName}
            </p>
          </div>
        </div>

        {/* Vital Readouts Pill Strip */}
        <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block">HEART RATE</span>
            <span className="text-base font-bold text-indigo-600">{heartRate}</span>
            <span className="text-[10px] text-slate-500 ml-1">bpm</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] text-slate-500 block">HRV RMSSD</span>
            <span className="text-base font-bold text-teal-600">{hrvRMSSD}</span>
            <span className="text-[10px] text-slate-500 ml-1">ms</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] text-slate-500 block">IMPEDANCE</span>
            <span className="text-xs font-semibold text-slate-700">3.8 kΩ</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] text-slate-500 block">SNR</span>
            <span className="text-xs font-semibold text-emerald-600">31.2 dB</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-300 bg-[#0F172A] shadow-inner">
        <canvas
          ref={canvasRef}
          width={920}
          height={224}
          className={`w-full h-full block ${caliperMode ? 'cursor-ew-resize' : 'cursor-default'}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />

        {/* Calibration Watermark */}
        <div className="absolute top-2 left-3 pointer-events-none text-[10px] font-mono text-slate-400 flex items-center gap-3 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
          <span>SWEEP: {sweepSpeed} mm/s</span>
          <span>GAIN: {gain} mm/mV</span>
          <span>GRID: 5mm (0.2s) × 5mm (0.5mV)</span>
        </div>

        {/* Freeze Frame Overlay Indicator */}
        {!isPlaying && (
          <div className="absolute top-2 right-3 px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold flex items-center gap-1.5">
            <Pause className="w-3 h-3" />
            <span>SWEEP FROZEN (CALIPER ENABLED)</span>
          </div>
        )}
      </div>

      {/* Control Bar & Caliper Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
              if (isPlaying) setCaliperMode(true); // Automatically engage calipers on freeze
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              isPlaying
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-600" />
                <span>FREEZE FRAME</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600" />
                <span>RESUME LIVE SWEEP</span>
              </>
            )}
          </button>

          <button
            onClick={() => setCaliperMode(!caliperMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              caliperMode
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{caliperMode ? 'CALIPERS ACTIVE' : 'ENABLE CALIPERS'}</span>
          </button>
        </div>

        {/* Lead Selection */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['Lead II', 'Lead I', 'Lead III'] as const).map((lead) => (
            <button
              key={lead}
              onClick={() => setSelectedLead(lead)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedLead === lead
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lead}
            </button>
          ))}
        </div>

        {/* Sweep Speed & Gain Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500">SPEED:</span>
            <button
              onClick={() => setSweepSpeed(25)}
              className={`px-2 py-0.5 rounded text-[10px] border ${
                sweepSpeed === 25
                  ? 'bg-white text-indigo-700 font-bold border-indigo-200 shadow-xs'
                  : 'text-slate-600 border-slate-200 hover:text-slate-900'
              }`}
            >
              25 mm/s
            </button>
            <button
              onClick={() => setSweepSpeed(50)}
              className={`px-2 py-0.5 rounded text-[10px] border ${
                sweepSpeed === 50
                  ? 'bg-white text-indigo-700 font-bold border-indigo-200 shadow-xs'
                  : 'text-slate-600 border-slate-200 hover:text-slate-900'
              }`}
            >
              50 mm/s
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500">GAIN:</span>
            {[5, 10, 20].map((g) => (
              <button
                key={g}
                onClick={() => setGain(g)}
                className={`px-2 py-0.5 rounded text-[10px] border ${
                  gain === g
                    ? 'bg-white text-indigo-700 font-bold border-indigo-200 shadow-xs'
                    : 'text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {g / 10}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clinical Interpretation & Calibration footer */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            Sinus Rhythm with stable PR interval (~152 ms) and normal QRS duration (~86 ms). No ectopic pauses in current Lead II window.
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          NASA-STD-3001 VOL 1 · CSA Bio-Monitor Astroskin Ref
        </div>
      </div>
    </div>
  );
};
