// SOLARIS Medical Intelligence — Sleep Architecture, Fragmentation & Fatigue Correlation
// Implements TST, TIB, Efficiency, WASO, Hypnogram Stage Breakdown & PVT Fatigue Correlations

import React from 'react';
import { SleepRecoveryTelemetry } from '../../data/healthData';
import { Moon, BedDouble, AlertTriangle, BatteryCharging, Clock, Brain, CheckCircle2 } from 'lucide-react';

interface SleepRecoveryCardProps {
  sleep: SleepRecoveryTelemetry;
}

export const SleepRecoveryCard: React.FC<SleepRecoveryCardProps> = ({ sleep }) => {
  const {
    totalSleepTime_hrs,
    timeInBed_hrs,
    sleepEfficiency_pct,
    sleepLatency_min,
    waso_min,
    awakeningsCount,
    microArousalsCount,
    sleepFragmentationIndex,
    stagesBreakdown,
    hypnogram,
    fatigueCorrelations,
  } = sleep;

  const tstHours = Math.floor(totalSleepTime_hrs);
  const tstMins = Math.round((totalSleepTime_hrs - tstHours) * 60);

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/80 p-5 font-mono text-slate-800 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-slate-900">
                Sleep Architecture & Neurobehavioral Recovery
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  fatigueCorrelations.readinessGrade === 'OPTIMAL'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : fatigueCorrelations.readinessGrade === 'QUALIFIED'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                READINESS: {fatigueCorrelations.readinessGrade}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                PROVENANCE: {sleepEfficiency_pct.provenance.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              AstroSkin Dual-Band RIP + Bio-Monitor Pelvic Actimeter Sleep Polysomnography Proxy
            </p>
          </div>
        </div>

        {/* Recovery Score Badge */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <BatteryCharging className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-[10px] text-slate-500 block leading-none">RECOVERY SCORE</span>
            <span className="text-sm font-bold text-slate-900">
              {fatigueCorrelations.recoveryScore_pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid (8 Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* TST */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 mb-1">TOTAL SLEEP TIME (TST)</div>
          <div className="text-xl font-bold text-slate-900">
            {tstHours}h {tstMins}m
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Goal: ≥ 7.0 hours
          </div>
        </div>

        {/* TIB */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 mb-1">TIME IN BED (TIB)</div>
          <div className="text-xl font-bold text-slate-900">
            {timeInBed_hrs.toFixed(1)} hrs
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Berth sleep window
          </div>
        </div>

        {/* Sleep Efficiency */}
        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200">
          <div className="flex items-center justify-between text-[10px] text-teal-700 mb-1">
            <span>EFFICIENCY</span>
            <span className="text-[9px] font-bold">DERIVED</span>
          </div>
          <div className="text-xl font-bold text-teal-700">
            {sleepEfficiency_pct.value}%
          </div>
          <div className="text-[10px] text-teal-600 mt-1">
            Target: &gt; 85.0%
          </div>
        </div>

        {/* Sleep Latency */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 mb-1">SLEEP ONSET LATENCY</div>
          <div className="text-xl font-bold text-slate-900">
            {sleepLatency_min} min
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Normal: 10 – 20 min
          </div>
        </div>

        {/* WASO */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 mb-1">WASO (WAKE AFTER ONSET)</div>
          <div className={`text-xl font-bold ${waso_min > 40 ? 'text-amber-600' : 'text-slate-900'}`}>
            {waso_min} min
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Target: &lt; 30 min
          </div>
        </div>

        {/* Awakenings */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 mb-1">AWAKENINGS / AROUSALS</div>
          <div className="text-xl font-bold text-slate-900">
            {awakeningsCount} <span className="text-xs text-slate-500 font-normal">({microArousalsCount} micro)</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Microgravity rest interruptions
          </div>
        </div>

        {/* Fragmentation Index */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>FRAGMENTATION INDEX</span>
            <span
              className={`text-[9px] font-bold ${
                sleepFragmentationIndex.status === 'LOW'
                  ? 'text-emerald-700'
                  : sleepFragmentationIndex.status === 'MODERATE'
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {sleepFragmentationIndex.status}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {sleepFragmentationIndex.value}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Events per hour
          </div>
        </div>

        {/* Sleep Debt */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 mb-1">CUMULATIVE SLEEP DEBT</div>
          <div className={`text-xl font-bold ${fatigueCorrelations.sleepDebtCumulative_hrs > 6 ? 'text-rose-600' : 'text-slate-900'}`}>
            {fatigueCorrelations.sleepDebtCumulative_hrs} hrs
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Over trailing 7 Sols
          </div>
        </div>
      </div>

      {/* Hypnogram & Architecture Breakdown */}
      <div className="w-full bg-slate-50/70 rounded-xl border border-slate-200 p-3 flex flex-col gap-3 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600 pb-2 border-b border-slate-200">
          <span className="font-semibold text-slate-900">Sleep Hypnogram Architecture (8-Hour Epoch Profile)</span>
          {/* Stage Legend */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded bg-rose-500" /> Awake ({stagesBreakdown.awake_pct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded bg-teal-600" /> REM ({stagesBreakdown.rem_pct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded bg-indigo-500" /> Light N1/N2 ({stagesBreakdown.light_n1_n2_pct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded bg-purple-600" /> Deep Slow-Wave N3 ({stagesBreakdown.deep_n3_pct}%)
            </span>
          </div>
        </div>

        {/* Hypnogram Step Chart (SVG) */}
        <div className="w-full h-32 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 800 110" preserveAspectRatio="none">
            {/* Horizontal stage lanes: 0=Awake, 1=REM, 2=Light, 3=Deep */}
            <line x1="0" y1="12" x2="800" y2="12" stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />
            <line x1="0" y1="38" x2="800" y2="38" stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />
            <line x1="0" y1="68" x2="800" y2="68" stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />
            <line x1="0" y1="98" x2="800" y2="98" stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />

            {/* Labels on left */}
            <text x="6" y="10" fill="#E11D48" fontSize="8" fontFamily="monospace">AWAKE</text>
            <text x="6" y="36" fill="#0D9488" fontSize="8" fontFamily="monospace">REM</text>
            <text x="6" y="66" fill="#4F46E5" fontSize="8" fontFamily="monospace">LIGHT (N1/N2)</text>
            <text x="6" y="96" fill="#7C3AED" fontSize="8" fontFamily="monospace">DEEP (N3)</text>

            {/* Step-line for Hypnogram */}
            <path
              d={hypnogram
                .map((epoch, idx) => {
                  const x = (idx / (hypnogram.length - 1 || 1)) * 750 + 40;
                  const y = epoch.stageIndex === 0 ? 12 : epoch.stageIndex === 1 ? 38 : epoch.stageIndex === 2 ? 68 : 98;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Sleep Stage Proportion Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200 border border-slate-300">
          <div style={{ width: `${stagesBreakdown.awake_pct}%` }} className="h-full bg-rose-500" title="Awake" />
          <div style={{ width: `${stagesBreakdown.rem_pct}%` }} className="h-full bg-teal-600" title="REM" />
          <div style={{ width: `${stagesBreakdown.light_n1_n2_pct}%` }} className="h-full bg-indigo-500" title="Light" />
          <div style={{ width: `${stagesBreakdown.deep_n3_pct}%` }} className="h-full bg-purple-600" title="Deep Slow-Wave" />
        </div>
      </div>

      {/* PVT Vigilance & Fatigue Correlation Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500">PVT REACTION TIME (MEDIAN)</div>
            <div className="text-sm font-bold text-slate-900">
              {fatigueCorrelations.pvtReactionTime_ms} ms
              <span className="text-[10px] text-slate-500 font-normal ml-1">
                ({fatigueCorrelations.pvtLapsesCount} lapses &gt;500ms)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500">KAROLINSKA SLEEPINESS SCALE</div>
            <div className="text-sm font-bold text-slate-900">
              KSS Score {fatigueCorrelations.kssScore} / 9
              <span className="text-[10px] text-slate-500 font-normal ml-1">
                {fatigueCorrelations.kssScore <= 3 ? '(Alert)' : fatigueCorrelations.kssScore <= 6 ? '(Moderate)' : '(Fighting Sleep)'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-600 border-t md:border-t-0 md:border-l border-slate-200 md:pl-3 flex flex-col justify-center">
          <div className="text-[10px] text-slate-900 font-semibold mb-0.5">Clinical Fatigue Recommendation:</div>
          <p className="line-clamp-2 text-[10px]">{fatigueCorrelations.clinicalNotes}</p>
        </div>
      </div>
    </div>
  );
};
