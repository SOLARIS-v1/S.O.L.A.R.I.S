// SOLARIS Medical Intelligence — RR Interval & Autonomic HRV Analysis
// Includes Tachogram, Poincaré Scatter Plot, and Autonomic Balance Metrics

import React, { useState } from 'react';
import { CardiovascularTelemetry } from '../../data/healthData';
import { Activity, GitCommit, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

interface RRIntervalAnalysisCardProps {
  cardio: CardiovascularTelemetry;
}

export const RRIntervalAnalysisCard: React.FC<RRIntervalAnalysisCardProps> = ({ cardio }) => {
  const [activeTab, setActiveTab] = useState<'tachogram' | 'poincare'>('tachogram');
  const { rrIntervals, poincareData, hrvRMSSD, hrvSDNN, pnn50, stressIndex, baselineComparison } = cardio;

  // Calculate stats for tachogram
  const minRR = Math.min(...rrIntervals.map((r) => r.rr_ms), 600);
  const maxRR = Math.max(...rrIntervals.map((r) => r.rr_ms), 1000);
  const avgRR = Math.round(rrIntervals.reduce((a, b) => a + b.rr_ms, 0) / (rrIntervals.length || 1));

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/80 p-5 font-mono text-slate-800 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-slate-900">
                RR Interval & Autonomic Tone Analysis
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                PROVENANCE: {hrvRMSSD.provenance.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Beat-to-Beat Vagal Regulation · Parasympathetic (RMSSD) & Total Variance (SDNN)
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('tachogram')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tachogram'
                ? 'bg-white text-indigo-700 font-bold border border-indigo-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            TACHOGRAM (RR vs BEAT)
          </button>
          <button
            onClick={() => setActiveTab('poincare')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'poincare'
                ? 'bg-white text-indigo-700 font-bold border border-indigo-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            POINCARÉ PLOT (RR_n vs RR_n+1)
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* RMSSD */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>HRV RMSSD</span>
            <span className="text-[9px] text-teal-700 font-bold">PARASYMPATHETIC</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-teal-600">{hrvRMSSD.value}</span>
            <span className="text-[10px] text-slate-500">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Baseline: {hrvRMSSD.baseline} ms ({hrvRMSSD.value < hrvRMSSD.baseline ? '−' : '+'}{Math.abs(hrvRMSSD.value - hrvRMSSD.baseline)})
          </div>
        </div>

        {/* SDNN */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>HRV SDNN</span>
            <span className="text-[9px] text-indigo-700 font-bold">TOTAL VARIANCE</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-indigo-600">{hrvSDNN.value}</span>
            <span className="text-[10px] text-slate-500">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Baseline: {hrvSDNN.baseline} ms
          </div>
        </div>

        {/* pNN50 */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>pNN50 RATIO</span>
            <span className="text-[9px] text-slate-700 font-bold">Δ &gt; 50ms</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-800">{pnn50.value}</span>
            <span className="text-[10px] text-slate-500">%</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Normal: &gt; 5.0%
          </div>
        </div>

        {/* Baevsky Stress Index */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>BAEVSKY STRESS INDEX</span>
            <span
              className={`text-[9px] font-bold ${
                stressIndex.status === 'RELAXED'
                  ? 'text-emerald-700'
                  : stressIndex.status === 'EUSTRESS'
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {stressIndex.status}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900">{stressIndex.value}</span>
            <span className="text-[10px] text-slate-500">SI</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Optimal: 50 – 150
          </div>
        </div>
      </div>

      {/* Visual Chart Area */}
      <div className="w-full h-48 bg-slate-50/70 rounded-xl border border-slate-200 p-3 relative flex items-center justify-center shadow-inner">
        {activeTab === 'tachogram' ? (
          // SVG Tachogram
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex justify-between text-[10px] text-slate-600 pb-1 border-b border-slate-200">
              <span>Beat Index (1 – {rrIntervals.length})</span>
              <span>
                Mean RR: <strong className="text-slate-900">{avgRR} ms</strong> · Range: {minRR} – {maxRR} ms
              </span>
            </div>

            <svg className="w-full flex-1 overflow-visible" viewBox="0 0 800 130" preserveAspectRatio="none">
              {/* Reference Grid lines */}
              <line x1="0" y1="20" x2="800" y2="20" stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />
              <line x1="0" y1="65" x2="800" y2="65" stroke="rgba(13,148,136,0.2)" />
              <line x1="0" y1="110" x2="800" y2="110" stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />

              {/* Mean Line Annotation */}
              <text x="8" y="60" fill="#0D9488" fontSize="9" fontFamily="monospace">
                Mean RR: {avgRR} ms
              </text>

              {/* Tachogram Polyline */}
              <polyline
                fill="none"
                stroke="#0D9488"
                strokeWidth="2"
                strokeLinejoin="round"
                points={rrIntervals
                  .map((r, i) => {
                    const x = (i / (rrIntervals.length - 1 || 1)) * 790 + 5;
                    const norm = (r.rr_ms - (minRR - 50)) / ((maxRR + 50) - (minRR - 50) || 1);
                    const y = 120 - norm * 105;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Individual beat dots */}
              {rrIntervals.map((r, i) => {
                const x = (i / (rrIntervals.length - 1 || 1)) * 790 + 5;
                const norm = (r.rr_ms - (minRR - 50)) / ((maxRR + 50) - (minRR - 50) || 1);
                const y = 120 - norm * 105;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="2.5"
                    fill="#4F46E5"
                    className="hover:r-4 transition-all cursor-pointer"
                  >
                    <title>{`Beat #${r.index}: ${r.rr_ms} ms`}</title>
                  </circle>
                );
              })}
            </svg>

            <div className="flex justify-between text-[9px] text-slate-500 pt-1">
              <span>Beat #1</span>
              <span>Beat #{Math.round(rrIntervals.length / 2)}</span>
              <span>Beat #{rrIntervals.length} (Latest)</span>
            </div>
          </div>
        ) : (
          // SVG Poincaré Scatter Plot
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex justify-between text-[10px] text-slate-600 pb-1 border-b border-slate-200">
              <span>Poincaré Scatter: RR[n] (abscissa) vs RR[n+1] (ordinate)</span>
              <span>
                Dispersion along Identity Line = Autonomic Flexibility
              </span>
            </div>

            <div className="flex-1 relative flex items-center justify-center">
              <svg className="w-64 h-36 overflow-visible" viewBox="0 0 200 120">
                {/* Axis lines */}
                <line x1="20" y1="100" x2="190" y2="100" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                <line x1="20" y1="10" x2="20" y2="100" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />

                {/* Line of identity (y = x) */}
                <line x1="20" y1="100" x2="180" y2="15" stroke="rgba(79,70,229,0.3)" strokeDasharray="3 3" />
                <text x="140" y="30" fill="#4F46E5" fontSize="7" opacity="0.6">
                  Identity (y=x)
                </text>

                {/* Scatter Points */}
                {poincareData.map((pt, i) => {
                  const x = 20 + ((pt.x - 600) / 450) * 160;
                  const y = 100 - ((pt.y - 600) / 450) * 85;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="2"
                      fill="#0D9488"
                      opacity="0.85"
                    />
                  );
                })}
              </svg>
            </div>

            <div className="flex justify-between text-[9px] text-slate-500">
              <span>SD1 (Short-term parasympathetic): ~{Math.round(hrvRMSSD.value * 0.707)} ms</span>
              <span>SD2 (Long-term sympathetic/total): ~{Math.round(hrvSDNN.value * 1.35)} ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Baseline Comparison & Provenance explanation */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900">Baseline Comparison & Trend: </span>
            <span>{baselineComparison.clinicalVerdict}</span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500">
          <div>
            Algorithm: <span className="text-slate-700 font-mono">{hrvRMSSD.provenance.derivationFormula}</span>
          </div>
          <div>
            Pre-Flight Median: {baselineComparison.medianResting} bpm ± {baselineComparison.mad} (MAD)
          </div>
        </div>
      </div>
    </div>
  );
};
