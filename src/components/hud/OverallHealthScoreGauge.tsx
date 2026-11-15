import React from 'react';
import { useAstra } from '../../context/AstraContext';
import { Heart, Activity, Moon, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OverallHealthScoreGaugeProps {
  compact?: boolean;
  className?: string;
}

export const OverallHealthScoreGauge: React.FC<OverallHealthScoreGaugeProps> = ({
  compact = false,
  className = '',
}) => {
  const { activeCrew, verbalSymptoms } = useAstra();

  const vitals = activeCrew?.vitals || {
    heartRate: 78,
    hrv: 42,
    spo2: 98.4,
    respRate: 14.2,
    coreTemp: 37.1,
    radiation_mSv: 54.8,
    sleepHours: 6.8,
  };

  const crewId = activeCrew?.id || 'vance';

  // Compute domain-specific subscores (0 - 100)
  let cardioScore = 95;
  let recoveryScore = 90;
  let metabolicScore = 98;
  let structuralScore = 95;

  if (crewId === 'vance') {
    cardioScore = 72; // Ectopic jumps up to 96 BPM, HRV dipped to 38 ms
    recoveryScore = 84;
    metabolicScore = 98;
    structuralScore = 92;
  } else if (crewId === 'chen') {
    cardioScore = 78;
    recoveryScore = 54; // Sleep 4.6 hrs, acute fatigue
    metabolicScore = 94;
    structuralScore = 58; // Lumbar unloading strain, verbal spine pain
  } else if (crewId === 'patel') {
    cardioScore = 98; // Resting 64 BPM, HRV 62 ms
    recoveryScore = 96;
    metabolicScore = 99;
    structuralScore = 96;
  }

  // Adjust dynamically if verbal symptoms are checked
  if (verbalSymptoms.spineIssue) structuralScore = Math.min(structuralScore, 60);
  if (verbalSymptoms.sleepIssue) recoveryScore = Math.min(recoveryScore, 55);

  // Weighted holistic composite score
  const overallScore = Math.round(
    cardioScore * 0.35 +
    recoveryScore * 0.25 +
    metabolicScore * 0.20 +
    structuralScore * 0.20
  );

  // Status mapping
  const getStatus = (score: number) => {
    if (score >= 88) {
      return {
        label: 'NOMINAL // FLIGHT READY',
        color: 'text-emerald-600',
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        strokeStart: '#10B981',
        strokeEnd: '#34D399',
        icon: CheckCircle2,
        assessment: 'All physiological telemetry channels nominal. Full mission flight clearance.',
      };
    }
    if (score >= 74) {
      return {
        label: 'CAUTION // MONITORING',
        color: 'text-amber-600',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
        strokeStart: '#F59E0B',
        strokeEnd: '#F97316',
        icon: AlertCircle,
        assessment: crewId === 'vance'
          ? 'Intermittent cardiac ectopic jumps (96 BPM) & HRV dip (38 ms). Autonomic monitoring active.'
          : 'Minor physiological deflection observed. Targeted countermeasures recommended.',
      };
    }
    return {
      label: 'ATTENTION // DEFICIT',
      color: 'text-rose-600',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
      strokeStart: '#EF4444',
      strokeEnd: '#EA580C',
      icon: AlertCircle,
      assessment: crewId === 'chen'
        ? 'Acute sleep deficit (4.6h) & microgravity lumbar spinal unloading strain detected.'
        : 'Elevated stress indicators across multiple telemetry channels.',
    };
  };

  const status = getStatus(overallScore);
  const StatusIcon = status.icon;

  // SVG circular gauge geometry
  const radius = compact ? 38 : 46;
  const strokeWidth = compact ? 7 : 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  return (
    <div
      className={`rounded-2xl bg-white border border-slate-200/80 p-4 select-none font-mono text-slate-800 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-800">
            ASTRONAUT HEALTH INDEX
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${status.badgeBg} flex items-center gap-1`}>
          <StatusIcon className="w-3 h-3" />
          <span>{status.label}</span>
        </div>
      </div>

      {/* Main Circular Graph & Key Metrics */}
      <div className="flex items-center gap-4">
        {/* Radial Circular Meter */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width={(radius + strokeWidth) * 2}
            height={(radius + strokeWidth) * 2}
            className="-rotate-90 transform"
          >
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={status.strokeStart} />
                <stop offset="100%" stopColor={status.strokeEnd} />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Animated Score Progress Arc */}
            <circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke="url(#scoreGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Center Score Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold font-mono tracking-tight leading-none text-slate-900">
              {overallScore}
            </span>
            <span className="text-[9px] text-slate-400 font-mono tracking-wider font-semibold">
              / 100
            </span>
          </div>
        </div>

        {/* 4-Domain Physiological Breakdown */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {[
            { label: 'Cardiovascular', val: cardioScore, icon: Heart, unit: `${vitals.heartRate} bpm` },
            { label: 'Rest & Recovery', val: recoveryScore, icon: Moon, unit: `${vitals.sleepHours}h sleep` },
            { label: 'Metabolic / SpO2', val: metabolicScore, icon: Activity, unit: `${vitals.spo2}% SpO2` },
            { label: 'Musculoskeletal', val: structuralScore, icon: ShieldCheck, unit: verbalSymptoms.spineIssue ? 'Strain' : 'Nominal' },
          ].map((dom) => {
            const DomIcon = dom.icon;
            const barColor =
              dom.val >= 85
                ? 'bg-emerald-500'
                : dom.val >= 70
                ? 'bg-amber-500'
                : 'bg-rose-500';

            return (
              <div key={dom.label} className="space-y-0.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="text-slate-600 flex items-center gap-1 truncate">
                    <DomIcon className="w-2.5 h-2.5 text-slate-400" />
                    <span>{dom.label}</span>
                  </span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {dom.val}% <span className="text-[8.5px] text-slate-400 font-normal font-mono">({dom.unit})</span>
                  </span>
                </div>
                {/* Micro Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${dom.val}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Clinical Evaluation Statement */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-2 text-[10.5px] text-slate-600 leading-relaxed">
        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[8.5px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
          AI SYNTHESIS
        </span>
        <p className="line-clamp-2">
          {status.assessment}
        </p>
      </div>
    </div>
  );
};

export default OverallHealthScoreGauge;
