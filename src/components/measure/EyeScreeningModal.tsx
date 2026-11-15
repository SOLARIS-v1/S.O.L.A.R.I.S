import React, { useState } from 'react';
import {
  X,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Glasses,
  Maximize2,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useAstraStore } from '../../api/mockClient';

export type EyeSector = 'foveal' | 'supero_nasal' | 'supero_temporal' | 'infero_nasal' | 'infero_temporal';
export type DefectType = 'distortion' | 'scotoma' | 'blur';

export interface MarkedPoint {
  id: string;
  x: number; // 0 to 1 relative to grid width
  y: number; // 0 to 1 relative to grid height
  type: DefectType;
  sector: EyeSector;
}

export interface EyeTestData {
  eye: 'left' | 'right';
  fixationClear: boolean;
  hasDistortion: boolean;
  hasScotoma: boolean;
  hasBlur: boolean;
  sectors: EyeSector[];
  markedPoints: MarkedPoint[];
  severityScore: number; // 0: Nominal, 1: Mild, 2: Moderate, 3: Severe
  notes?: string;
}

export interface EyeScreeningResult {
  id: string;
  timestamp: string;
  subjectId: string;
  viewingDistanceCm: number;
  correctionWorn: boolean;
  leftEye: EyeTestData;
  rightEye: EyeTestData;
  overallStatus: 'nominal' | 'caution' | 'warning';
  notes?: string;
}

interface EyeScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (result: EyeScreeningResult) => void;
  initialStep?: number;
}

const SECTOR_LABELS: Record<EyeSector, string> = {
  foveal: 'Central / Foveal (0-2°)',
  supero_nasal: 'Supero-Nasal (SN)',
  supero_temporal: 'Supero-Temporal (ST)',
  infero_nasal: 'Infero-Nasal (IN)',
  infero_temporal: 'Infero-Temporal (IT)',
};

// Calculate clinical visual field sector from relative (x,y)
export function getSectorForCoord(x: number, y: number, eye: 'left' | 'right'): EyeSector {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const dist = Math.hypot(dx, dy);

  if (dist < 0.12) return 'foveal';

  const isSuperior = dy < 0;
  const isNasal = eye === 'left' ? dx > 0 : dx < 0;

  if (isSuperior && isNasal) return 'supero_nasal';
  if (isSuperior && !isNasal) return 'supero_temporal';
  if (!isSuperior && isNasal) return 'infero_nasal';
  return 'infero_temporal';
}

function calculateSeverity(data: Partial<EyeTestData>): number {
  if (!data) return 0;
  const hasCentral = data.sectors?.includes('foveal') || data.markedPoints?.some(p => p.sector === 'foveal');
  const hasScotoma = data.hasScotoma || data.markedPoints?.some(p => p.type === 'scotoma');
  const hasDistortion = data.hasDistortion || data.markedPoints?.some(p => p.type === 'distortion');
  const hasBlur = data.hasBlur || data.markedPoints?.some(p => p.type === 'blur');
  const sectorsCount = data.sectors?.length || 0;

  if (hasCentral && hasScotoma) return 3;
  if (hasScotoma && sectorsCount >= 2) return 3;
  if (hasDistortion && hasCentral) return 2;
  if (hasScotoma || sectorsCount >= 2) return 2;
  if (hasDistortion || hasBlur || sectorsCount === 1) return 1;
  if (!data.fixationClear) return 1;
  return 0;
}

export const EyeScreeningModal: React.FC<EyeScreeningModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialStep = 0,
}) => {
  const { activeSubjectId, crew, addTimelineEvent } = useAstraStore();
  const activeAstronaut = crew.find((c) => c.id === activeSubjectId) || crew[0];

  const [step, setStep] = useState<number>(initialStep);

  // Preparation state
  const [distanceVerified, setDistanceVerified] = useState(true);
  const [glassesWorn, setGlassesWorn] = useState(false);
  const [gentleCoverVerified, setGentleCoverVerified] = useState(true);
  const [lightingNominal, setLightingNominal] = useState(true);

  // Left Eye state (OS)
  const [leftData, setLeftData] = useState<EyeTestData>({
    eye: 'left',
    fixationClear: true,
    hasDistortion: false,
    hasScotoma: false,
    hasBlur: false,
    sectors: [],
    markedPoints: [],
    severityScore: 0,
  });

  // Right Eye state (OD)
  const [rightData, setRightData] = useState<EyeTestData>({
    eye: 'right',
    fixationClear: true,
    hasDistortion: false,
    hasScotoma: false,
    hasBlur: false,
    sectors: [],
    markedPoints: [],
    severityScore: 0,
  });

  const [activeDefectTool, setActiveDefectTool] = useState<DefectType>('distortion');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [highContrastDark, setHighContrastDark] = useState(false);

  if (!isOpen) return null;

  const handleGridClick = (
    e: React.MouseEvent<SVGSVGElement>,
    eye: 'left' | 'right'
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const sector = getSectorForCoord(x, y, eye);
    const newPoint: MarkedPoint = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x,
      y,
      type: activeDefectTool,
      sector,
    };

    if (eye === 'left') {
      const updatedPoints = [...leftData.markedPoints, newPoint];
      const updatedSectors = Array.from(new Set([...leftData.sectors, sector]));
      const updated: EyeTestData = {
        ...leftData,
        markedPoints: updatedPoints,
        sectors: updatedSectors,
        hasDistortion: leftData.hasDistortion || activeDefectTool === 'distortion',
        hasScotoma: leftData.hasScotoma || activeDefectTool === 'scotoma',
        hasBlur: leftData.hasBlur || activeDefectTool === 'blur',
        severityScore: calculateSeverity({
          ...leftData,
          markedPoints: updatedPoints,
          sectors: updatedSectors,
        }),
      };
      setLeftData(updated);
    } else {
      const updatedPoints = [...rightData.markedPoints, newPoint];
      const updatedSectors = Array.from(new Set([...rightData.sectors, sector]));
      const updated: EyeTestData = {
        ...rightData,
        markedPoints: updatedPoints,
        sectors: updatedSectors,
        hasDistortion: rightData.hasDistortion || activeDefectTool === 'distortion',
        hasScotoma: rightData.hasScotoma || activeDefectTool === 'scotoma',
        hasBlur: rightData.hasBlur || activeDefectTool === 'blur',
        severityScore: calculateSeverity({
          ...rightData,
          markedPoints: updatedPoints,
          sectors: updatedSectors,
        }),
      };
      setRightData(updated);
    }
  };

  const clearEyePoints = (eye: 'left' | 'right') => {
    if (eye === 'left') {
      setLeftData((prev) => ({
        ...prev,
        markedPoints: [],
        sectors: [],
        hasDistortion: false,
        hasScotoma: false,
        hasBlur: false,
        fixationClear: true,
        severityScore: 0,
      }));
    } else {
      setRightData((prev) => ({
        ...prev,
        markedPoints: [],
        sectors: [],
        hasDistortion: false,
        hasScotoma: false,
        hasBlur: false,
        fixationClear: true,
        severityScore: 0,
      }));
    }
  };

  const toggleSector = (eye: 'left' | 'right', sector: EyeSector) => {
    const isLeft = eye === 'left';
    const target = isLeft ? leftData : rightData;
    const exists = target.sectors.includes(sector);
    const updatedSectors = exists
      ? target.sectors.filter((s) => s !== sector)
      : [...target.sectors, sector];

    const updated: EyeTestData = {
      ...target,
      sectors: updatedSectors,
      severityScore: calculateSeverity({
        ...target,
        sectors: updatedSectors,
      }),
    };

    if (isLeft) setLeftData(updated);
    else setRightData(updated);
  };

  const handleSave = () => {
    const leftSev = leftData.severityScore;
    const rightSev = rightData.severityScore;
    const maxSev = Math.max(leftSev, rightSev);

    const overallStatus: 'nominal' | 'caution' | 'warning' =
      maxSev === 0 ? 'nominal' : maxSev === 1 ? 'caution' : 'warning';

    const result: EyeScreeningResult = {
      id: `eye-screen-${Date.now()}`,
      timestamp: new Date().toISOString(),
      subjectId: activeSubjectId,
      viewingDistanceCm: 33,
      correctionWorn: glassesWorn,
      leftEye: { ...leftData },
      rightEye: { ...rightData },
      overallStatus,
      notes: clinicalNotes.trim() || undefined,
    };

    try {
      const existing = localStorage.getItem('solaris_eye_screenings_v1');
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(result);
      localStorage.setItem('solaris_eye_screenings_v1', JSON.stringify(list));
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }

    addTimelineEvent({
      subject_id: activeSubjectId,
      timestamp: new Date().toISOString(),
      category: 'measurement',
      title: `Amsler Grid Screening: ${overallStatus.toUpperCase()}`,
      summary: `Left Eye (OS): ${
        leftData.severityScore === 0 ? 'Nominal' : `Score ${leftData.severityScore}/3`
      } (${leftData.markedPoints.length} defects). Right Eye (OD): ${
        rightData.severityScore === 0 ? 'Nominal' : `Score ${rightData.severityScore}/3`
      } (${rightData.markedPoints.length} defects).`,
      detail: `Left Eye severity ${leftData.severityScore}/3, Right Eye severity ${rightData.severityScore}/3. Evaluated under high-contrast grid.`,
      severity: overallStatus === 'nominal' ? 'normal' : overallStatus === 'caution' ? 'watch' : 'urgent',
      source: 'EyeScreening',
      is_simulated: false,
    });

    setIsSaved(true);
    onSaved?.(result);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const renderAmslerGrid = (
    data: EyeTestData,
    isInteractive: boolean,
    sizePx: number = 360
  ) => {
    const lineIndices = Array.from({ length: 21 }, (_, i) => i * 18);
    const bgFill = highContrastDark ? '#0F172A' : '#FFFFFF';
    const gridLineColor = highContrastDark ? '#94A3B8' : '#334155';
    const gridOpacity = highContrastDark ? '0.6' : '0.45';

    return (
      <div className="relative inline-flex flex-col items-center select-none">
        <svg
          width={sizePx}
          height={sizePx}
          viewBox="-2 -2 364 364"
          className={`rounded-2xl border-2 transition-all ${
            highContrastDark
              ? 'border-slate-700 bg-slate-900 shadow-xl'
              : 'border-slate-300 bg-white shadow-md'
          } ${isInteractive ? 'cursor-crosshair' : ''}`}
          onClick={(e) => isInteractive && handleGridClick(e, data.eye)}
        >
          <rect x="0" y="0" width="360" height="360" fill={bgFill} rx="12" />

          {lineIndices.map((pos) => (
            <g key={`lines-${pos}`}>
              <line
                x1={pos}
                y1={0}
                x2={pos}
                y2={360}
                stroke={gridLineColor}
                strokeOpacity={gridOpacity}
                strokeWidth={pos === 0 || pos === 360 ? 2 : 1}
              />
              <line
                x1={0}
                y1={pos}
                x2={360}
                y2={pos}
                stroke={gridLineColor}
                strokeOpacity={gridOpacity}
                strokeWidth={pos === 0 || pos === 360 ? 2 : 1}
              />
            </g>
          ))}

          <line x1="0" y1="0" x2="360" y2="360" stroke={gridLineColor} strokeOpacity="0.15" strokeDasharray="3 3" />
          <line x1="360" y1="0" x2="0" y2="360" stroke={gridLineColor} strokeOpacity="0.15" strokeDasharray="3 3" />

          {data.markedPoints.map((pt) => {
            const cx = pt.x * 360;
            const cy = pt.y * 360;
            if (pt.type === 'scotoma') {
              return (
                <g key={pt.id}>
                  <circle cx={cx} cy={cy} r="14" fill="#EF4444" fillOpacity="0.35" />
                  <circle cx={cx} cy={cy} r="6" fill="#EF4444" />
                  <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} stroke="#FFFFFF" strokeWidth="1.5" />
                  <line x1={cx + 6} y1={cy - 6} x2={cx - 6} y2={cy + 6} stroke="#FFFFFF" strokeWidth="1.5" />
                </g>
              );
            }
            if (pt.type === 'distortion') {
              return (
                <g key={pt.id}>
                  <circle cx={cx} cy={cy} r="16" fill="#F59E0B" fillOpacity="0.25" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="2 2" />
                  <path
                    d={`M ${cx - 10} ${cy} Q ${cx - 5} ${cy - 8} ${cx} ${cy} T ${cx + 10} ${cy}`}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                  />
                  <circle cx={cx} cy={cy} r="3" fill="#D97706" />
                </g>
              );
            }
            return (
              <g key={pt.id}>
                <circle cx={cx} cy={cy} r="18" fill="#0EA5E9" fillOpacity="0.25" filter="blur(1px)" />
                <circle cx={cx} cy={cy} r="5" fill="#0284C7" />
              </g>
            );
          })}

          {/* Central Red Fixation Dot */}
          <circle cx="180" cy="180" r="5.5" fill="#EF4444" className="shadow-md" />
          <circle cx="180" cy="180" r="1.5" fill="#FFFFFF" />
        </svg>

        {isInteractive && (
          <div className="text-[11px] font-mono text-slate-500 mt-2 flex items-center gap-2">
            <span>Red Fixation Dot at center</span>
            <span>•</span>
            <span>Subtends 20° central field</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#F8FAFC] border border-slate-200 rounded-3xl shadow-2xl text-slate-800 overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900 font-sans">
                  Amsler Grid Visual Field Screening
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                  SANS-OPT-04
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Astronaut: <span className="text-slate-900 font-semibold">{activeAstronaut.name}</span> ({activeAstronaut.callsign}) • Mission Sol 142
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHighContrastDark(!highContrastDark)}
              title="Toggle Grid Contrast"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono transition-colors"
            >
              {highContrastDark ? 'Light Grid' : 'Dark Grid'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
              aria-label="Close Eye Screening Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4-Step Progress Navigation Header */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
            {[
              { idx: 0, label: '1. PREPARATION' },
              { idx: 1, label: '2. LEFT EYE (OS)' },
              { idx: 2, label: '3. RIGHT EYE (OD)' },
              { idx: 3, label: '4. REVIEW & TREND' },
            ].map((s) => {
              const isActive = step === s.idx;
              const isPassed = step > s.idx;
              return (
                <button
                  key={s.idx}
                  onClick={() => setStep(s.idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-semibold'
                      : isPassed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-current text-[9px] flex items-center justify-center">
                      {s.idx + 1}
                    </span>
                  )}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
            <span>Calibrated distance: 33 cm</span>
          </div>
        </div>

        {/* Mandatory Clinical Safety Directive Banner */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>CLINICAL SAFETY DIRECTIVE:</strong> Amsler Grid is a subjective functional field screening for metamorphopsia and scotomas. It does <u>NOT</u> diagnose SANS (Spaceflight-Associated Neuro-ocular Syndrome) or optic-disc edema. Diagnostic structural assessment requires dilated fundoscopy and Spectral-Domain OCT.
          </span>
        </div>

        {/* Step Content Body */}
        <div className="flex-1 overflow-y-auto p-6 font-sans">
          {/* STEP 1: PREPARATION */}
          {step === 0 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Visual Field Preparation & Clinical Protocol
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The Amsler Grid evaluates the central 20° of your visual field (macula and fovea) to detect early signs of retinal folds, fluid shifts, or choroidal distortions in microgravity.
                </p>
              </div>

              {/* Protocol Instructions Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-bold">
                    <Maximize2 className="w-4 h-4" />
                    <span>VIEWING DISTANCE: 30–35 CM</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Position your display approximately 12–14 inches (comfortable reading distance) directly in front of your eyes at eye level.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                  <div className="flex items-center gap-2 text-teal-600 font-mono text-xs font-bold">
                    <Glasses className="w-4 h-4" />
                    <span>OPTICAL CORRECTION</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If you wear reading glasses or contact lenses for near tasks, <strong>wear them now</strong>. Do not remove near-vision correction.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-600 font-mono text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>GENTLE EYE COVER ONLY</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cover the non-tested eye with an eye-patch or the palm of your hand. <strong>Do NOT apply pressure to the eyeball</strong>, as pressure causes artificial transient retinal ischemia and false scotomas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-600 font-mono text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>STRICT CENTRAL FIXATION</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Keep your gaze locked continuously onto the <strong>central red dot</strong>. Observe peripheral grid lines without darting your eyes.
                  </p>
                </div>
              </div>

              {/* Pre-Test Verification Checklist */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 font-mono text-xs">
                <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  Pre-Test Operator Checklist
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={distanceVerified}
                      onChange={(e) => setDistanceVerified(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={distanceVerified ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                      Viewing distance confirmed at 30–35 cm (12–14 in)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={glassesWorn}
                      onChange={(e) => setGlassesWorn(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={glassesWorn ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                      Wearing reading glasses or near optical correction (if prescribed)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gentleCoverVerified}
                      onChange={(e) => setGentleCoverVerified(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={gentleCoverVerified ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                      Non-tested eye will be covered gently without globe pressure
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lightingNominal}
                      onChange={(e) => setLightingNominal(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={lightingNominal ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                      Habitat ambient lighting is comfortable and glare-free
                    </span>
                  </label>
                </div>
              </div>

              {/* Start Button */}
              <div className="flex justify-end pt-2">
                <button
                  disabled={!distanceVerified || !gentleCoverVerified}
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs tracking-wider font-mono hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all"
                >
                  <span>Begin Left Eye (OS) Protocol</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: LEFT EYE (OS) */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
                    <h3 className="text-base font-bold text-slate-900">
                      STEP 2: LEFT EYE (OCULUS SINISTER — OS)
                    </h3>
                  </div>
                  <p className="text-xs font-mono text-slate-600">
                    Cover your <strong className="text-slate-900">RIGHT EYE</strong>. Look strictly at the red center dot with your LEFT eye.
                  </p>
                </div>

                <button
                  onClick={() => clearEyePoints('left')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Left Eye</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
                  {renderAmslerGrid(leftData, true, 380)}

                  <div className="w-full mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                      <span>SELECT DEFECT TOOL:</span>
                      <span className="font-semibold text-slate-900">{leftData.markedPoints.length} points plotted</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveDefectTool('distortion')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono border transition-all ${
                          activeDefectTool === 'distortion'
                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Wavy Lines</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveDefectTool('scotoma')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono border transition-all ${
                          activeDefectTool === 'scotoma'
                            ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Missing Hole</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveDefectTool('blur')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono border transition-all ${
                          activeDefectTool === 'blur'
                            ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                        <span>Blur / Hazy</span>
                      </button>
                    </div>

                    <p className="text-[11px] font-mono text-slate-500 pt-1">
                      Tip: Tap directly on the grid where the distortion or missing patch occurs.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 font-sans">
                    <h4 className="text-xs font-bold font-mono text-indigo-700 uppercase tracking-wider">
                      Subjective Observations (OS)
                    </h4>

                    {/* Question 1: Central Fixation Dot */}
                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-900 font-medium">
                        1. Can you see the central red fixation dot clearly?
                      </div>
                      <div className="flex gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setLeftData({ ...leftData, fixationClear: true })}
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            leftData.fixationClear
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Yes, Sharp Dot
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLeftData({
                              ...leftData,
                              fixationClear: false,
                              severityScore: Math.max(leftData.severityScore, 1),
                            })
                          }
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            !leftData.fixationClear
                              ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          No / Disappears
                        </button>
                      </div>
                    </div>

                    {/* Question 2: Metamorphopsia / Distortion */}
                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-900 font-medium">
                        2. Do any grid lines appear wavy, bent, or distorted?
                      </div>
                      <div className="flex gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setLeftData({ ...leftData, hasDistortion: false })}
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            !leftData.hasDistortion
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Straight & Parallel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLeftData({
                              ...leftData,
                              hasDistortion: true,
                              severityScore: Math.max(leftData.severityScore, 1),
                            })
                          }
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            leftData.hasDistortion
                              ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Wavy / Distorted
                        </button>
                      </div>
                    </div>

                    {/* Question 3: Missing areas / Scotoma */}
                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-900 font-medium">
                        3. Are any boxes or lines missing or grayed out?
                      </div>
                      <div className="flex gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setLeftData({ ...leftData, hasScotoma: false })}
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            !leftData.hasScotoma
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Complete Grid
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLeftData({
                              ...leftData,
                              hasScotoma: true,
                              severityScore: Math.max(leftData.severityScore, 2),
                            })
                          }
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            leftData.hasScotoma
                              ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Missing / Dark Holes
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 font-mono text-xs">
                    <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      AFFECTED SECTORS (OS)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(SECTOR_LABELS) as EyeSector[]).map((sector) => {
                        const isSelected = leftData.sectors.includes(sector);
                        return (
                          <button
                            key={sector}
                            type="button"
                            onClick={() => toggleSector('left', sector)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {SECTOR_LABELS[sector]} {isSelected ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-600">LEFT EYE SCORE:</span>
                    <span
                      className={`px-3 py-1 rounded-full font-bold ${
                        leftData.severityScore === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : leftData.severityScore === 1
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {leftData.severityScore === 0
                        ? '0 - NOMINAL'
                        : leftData.severityScore === 1
                        ? '1 - MILD / PERIPHERAL'
                        : leftData.severityScore === 2
                        ? '2 - MODERATE METAMORPHOPSIA'
                        : '3 - SEVERE / CENTRAL SCOTOMA'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Prep</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs tracking-wide font-mono hover:bg-indigo-700 shadow-sm transition-all"
                    >
                      <span>Proceed to Right Eye (OD)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RIGHT EYE (OD) */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-600 animate-pulse" />
                    <h3 className="text-base font-bold text-slate-900">
                      STEP 3: RIGHT EYE (OCULUS DEXTER — OD)
                    </h3>
                  </div>
                  <p className="text-xs font-mono text-slate-600">
                    Now cover your <strong className="text-slate-900">LEFT EYE</strong>. Keep your RIGHT eye locked onto the red fixation dot.
                  </p>
                </div>

                <button
                  onClick={() => clearEyePoints('right')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Right Eye</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
                  {renderAmslerGrid(rightData, true, 380)}

                  <div className="w-full mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                      <span>SELECT DEFECT TOOL:</span>
                      <span className="font-semibold text-slate-900">{rightData.markedPoints.length} points plotted</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveDefectTool('distortion')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono border transition-all ${
                          activeDefectTool === 'distortion'
                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Wavy Lines</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveDefectTool('scotoma')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono border transition-all ${
                          activeDefectTool === 'scotoma'
                            ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Missing Hole</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveDefectTool('blur')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono border transition-all ${
                          activeDefectTool === 'blur'
                            ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                        <span>Blur / Hazy</span>
                      </button>
                    </div>

                    <p className="text-[11px] font-mono text-slate-500 pt-1">
                      Tip: Tap directly on the grid where the distortion or missing patch occurs.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 font-sans">
                    <h4 className="text-xs font-bold font-mono text-teal-700 uppercase tracking-wider">
                      Subjective Observations (OD)
                    </h4>

                    {/* Question 1: Central Fixation Dot */}
                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-900 font-medium">
                        1. Can you see the central red fixation dot clearly?
                      </div>
                      <div className="flex gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setRightData({ ...rightData, fixationClear: true })}
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            rightData.fixationClear
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Yes, Sharp Dot
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRightData({
                              ...rightData,
                              fixationClear: false,
                              severityScore: Math.max(rightData.severityScore, 1),
                            })
                          }
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            !rightData.fixationClear
                              ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          No / Disappears
                        </button>
                      </div>
                    </div>

                    {/* Question 2: Metamorphopsia / Distortion */}
                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-900 font-medium">
                        2. Do any grid lines appear wavy, bent, or distorted?
                      </div>
                      <div className="flex gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setRightData({ ...rightData, hasDistortion: false })}
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            !rightData.hasDistortion
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Straight & Parallel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRightData({
                              ...rightData,
                              hasDistortion: true,
                              severityScore: Math.max(rightData.severityScore, 1),
                            })
                          }
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            rightData.hasDistortion
                              ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Wavy / Distorted
                        </button>
                      </div>
                    </div>

                    {/* Question 3: Missing areas / Scotoma */}
                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-900 font-medium">
                        3. Are any boxes or lines missing or grayed out?
                      </div>
                      <div className="flex gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setRightData({ ...rightData, hasScotoma: false })}
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            !rightData.hasScotoma
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Complete Grid
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRightData({
                              ...rightData,
                              hasScotoma: true,
                              severityScore: Math.max(rightData.severityScore, 2),
                            })
                          }
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all ${
                            rightData.hasScotoma
                              ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          Missing / Dark Holes
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 font-mono text-xs">
                    <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      AFFECTED SECTORS (OD)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(SECTOR_LABELS) as EyeSector[]).map((sector) => {
                        const isSelected = rightData.sectors.includes(sector);
                        return (
                          <button
                            key={sector}
                            type="button"
                            onClick={() => toggleSector('right', sector)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                              isSelected
                                ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {SECTOR_LABELS[sector]} {isSelected ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-600">RIGHT EYE SCORE:</span>
                    <span
                      className={`px-3 py-1 rounded-full font-bold ${
                        rightData.severityScore === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : rightData.severityScore === 1
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rightData.severityScore === 0
                        ? '0 - NOMINAL'
                        : rightData.severityScore === 1
                        ? '1 - MILD / PERIPHERAL'
                        : rightData.severityScore === 2
                        ? '2 - MODERATE METAMORPHOPSIA'
                        : '3 - SEVERE / CENTRAL SCOTOMA'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Left Eye</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs tracking-wide font-mono hover:bg-indigo-700 shadow-sm transition-all"
                    >
                      <span>Review & Historical Comparison</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & HISTORICAL COMPARISON */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  STEP 4: CLINICAL REVIEW & COMPARATIVE ASSESSMENT
                </h3>
                <p className="text-xs font-mono text-slate-600">
                  Preserving Left and Right eye observations independently. Verify or edit findings before saving to medical record.
                </p>
              </div>

              {/* Side-by-Side Comparison of Left Eye vs Right Eye */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Eye Card (OS) */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-600" />
                      <span className="font-bold text-slate-900 font-mono text-sm">LEFT EYE (OS)</span>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-mono text-indigo-600 hover:underline font-semibold"
                    >
                      Edit OS Findings
                    </button>
                  </div>

                  <div className="flex justify-center">
                    {renderAmslerGrid(leftData, false, 200)}
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Fixation Clarity:</span>
                      <span className={leftData.fixationClear ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                        {leftData.fixationClear ? 'Sharp / Stable' : 'Impaired / Scotoma'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Distortions (Wavy lines):</span>
                      <span className={leftData.hasDistortion ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                        {leftData.hasDistortion ? 'Present' : 'None Detected'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Scotomas (Dark/Missing):</span>
                      <span className={leftData.hasScotoma ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                        {leftData.hasScotoma ? 'Present' : 'None Detected'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Plotted Defect Points:</span>
                      <span className="text-slate-900 font-bold">{leftData.markedPoints.length}</span>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-500">Affected Sectors:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {leftData.sectors.length === 0 ? (
                          <span className="text-emerald-700 font-medium">0 sectors affected (Nominal)</span>
                        ) : (
                          leftData.sectors.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold">
                              {SECTOR_LABELS[s]}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-500">OS Verdict:</span>
                    <span
                      className={`px-3 py-1 rounded-full font-bold ${
                        leftData.severityScore === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : leftData.severityScore === 1
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {leftData.severityScore === 0 ? 'NOMINAL' : `SCORE ${leftData.severityScore}/3`}
                    </span>
                  </div>
                </div>

                {/* Right Eye Card (OD) */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-teal-600" />
                      <span className="font-bold text-slate-900 font-mono text-sm">RIGHT EYE (OD)</span>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs font-mono text-teal-700 hover:underline font-semibold"
                    >
                      Edit OD Findings
                    </button>
                  </div>

                  <div className="flex justify-center">
                    {renderAmslerGrid(rightData, false, 200)}
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Fixation Clarity:</span>
                      <span className={rightData.fixationClear ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                        {rightData.fixationClear ? 'Sharp / Stable' : 'Impaired / Scotoma'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Distortions (Wavy lines):</span>
                      <span className={rightData.hasDistortion ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                        {rightData.hasDistortion ? 'Present' : 'None Detected'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Scotomas (Dark/Missing):</span>
                      <span className={rightData.hasScotoma ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                        {rightData.hasScotoma ? 'Present' : 'None Detected'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Plotted Defect Points:</span>
                      <span className="text-slate-900 font-bold">{rightData.markedPoints.length}</span>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-500">Affected Sectors:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rightData.sectors.length === 0 ? (
                          <span className="text-emerald-700 font-medium">0 sectors affected (Nominal)</span>
                        ) : (
                          rightData.sectors.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-semibold">
                              {SECTOR_LABELS[s]}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-500">OD Verdict:</span>
                    <span
                      className={`px-3 py-1 rounded-full font-bold ${
                        rightData.severityScore === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : rightData.severityScore === 1
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rightData.severityScore === 0 ? 'NOMINAL' : `SCORE ${rightData.severityScore}/3`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historical Comparison Table */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Historical Trend & Baseline Comparison</span>
                  </div>
                  <span>Cadence: Every 14 Sols</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 pr-3">Session</th>
                        <th className="py-2.5 px-3">Date / Sol</th>
                        <th className="py-2.5 px-3">Left Eye (OS)</th>
                        <th className="py-2.5 px-3">Right Eye (OD)</th>
                        <th className="py-2.5 px-3">Correction</th>
                        <th className="py-2.5 pl-3">Clinical Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 pr-3 text-slate-900 font-bold">Sol 0 Baseline</td>
                        <td className="py-2.5 px-3 text-slate-500">2026-06-25</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">0 Defects</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">0 Defects</td>
                        <td className="py-2.5 px-3 text-slate-500">None</td>
                        <td className="py-2.5 pl-3 text-slate-500">Baseline Locked</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-3 text-slate-900">Sol 128 Routine</td>
                        <td className="py-2.5 px-3 text-slate-500">2026-11-01</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">0 Defects</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">0 Defects</td>
                        <td className="py-2.5 px-3 text-slate-500">None</td>
                        <td className="py-2.5 pl-3 text-emerald-700 font-medium">Cleared</td>
                      </tr>
                      <tr className="bg-indigo-50/50">
                        <td className="py-2.5 pr-3 text-indigo-700 font-bold">Current (Sol 142)</td>
                        <td className="py-2.5 px-3 text-indigo-700 font-semibold">Today</td>
                        <td className="py-2.5 px-3 font-semibold">
                          {leftData.severityScore === 0 ? (
                            <span className="text-emerald-700">0 Defects (Nominal)</span>
                          ) : (
                            <span className="text-amber-700">Score {leftData.severityScore}/3 ({leftData.markedPoints.length} pts)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          {rightData.severityScore === 0 ? (
                            <span className="text-emerald-700">0 Defects (Nominal)</span>
                          ) : (
                            <span className="text-amber-700">Score {rightData.severityScore}/3 ({rightData.markedPoints.length} pts)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{glassesWorn ? '+1.5D Reading' : 'None'}</td>
                        <td className="py-2.5 pl-3 text-slate-500">Pending Review</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes Input Field */}
              <div className="space-y-1.5 font-mono text-xs">
                <label className="text-slate-600 font-semibold">OPERATOR / CLINICAL NOTES (OPTIONAL):</label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record any ocular fatigue, headache, reading distance changes, or transient visual obscurations..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-xs font-mono"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Right Eye</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaved}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider shadow-md transition-all font-mono"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaved ? 'Saved to Medical Log!' : 'Commit Screening to Medical Record'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
