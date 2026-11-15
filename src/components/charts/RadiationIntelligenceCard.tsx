// SOLARIS Medical Intelligence — Radiation Exposure Intelligence Card
// Strictly distinguishes Absorbed Dose (Gy/mGy) vs Equivalent Dose (Sv/mSv), Sol 1-142 Cumulative Chart, and ALARA Clinical Protocols

import React, { useState } from 'react';
import { RadiationIntelligenceTelemetry } from '../../data/healthData';
import { ShieldAlert, AlertTriangle, Info, Zap, Flame, CheckCircle2, ChevronRight } from 'lucide-react';

interface RadiationIntelligenceCardProps {
  radiation: RadiationIntelligenceTelemetry;
  isSimulatedScenario?: boolean;
  onToggleScenario?: (isSimulated: boolean) => void;
}

export const RadiationIntelligenceCard: React.FC<RadiationIntelligenceCardProps> = ({
  radiation,
  isSimulatedScenario = false,
  onToggleScenario,
}) => {
  const [activeTab, setActiveTab] = useState<'cumulative' | 'history' | 'guide'>('cumulative');
  const [showUnitDistinction, setShowUnitDistinction] = useState<boolean>(true);

  const {
    realTimeDoseRate,
    currentDailyDose,
    cumulativeMissionDose,
    speEventStatus,
    clinicalGuidance,
    dailyHistory,
  } = radiation;

  // Recent 5 Sols for quick preview table
  const recentHistory = dailyHistory.slice(-5);

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/80 p-5 font-mono text-slate-800 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-slate-900">
                Radiation Exposure Intelligence & Dosimetry
              </span>
              {/* SPE Alert Status */}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  speEventStatus.level === 'NOMINAL_GCR'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                }`}
              >
                STATUS: {speEventStatus.level}
              </span>

              {/* Training / Simulated Scenario Pill */}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isSimulatedScenario
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {isSimulatedScenario ? 'SIMULATED TRAINING INJECTION' : 'CALIBRATED TELEMETRY'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              NASA Crew Active Dosimeter (CAD Silicon Semiconductor) · Sol 1 to Sol 142 Integration
            </p>
          </div>
        </div>

        {/* Tab switch and simulation toggle */}
        <div className="flex items-center gap-2">
          {onToggleScenario && (
            <button
              onClick={() => onToggleScenario(!isSimulatedScenario)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                isSimulatedScenario
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {isSimulatedScenario ? 'RESTORE NOMINAL GCR' : 'SIMULATE SPE EVENT'}
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('cumulative')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cumulative'
                  ? 'bg-white text-indigo-700 font-bold border border-indigo-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MISSION CURVE
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-700 font-bold border border-indigo-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DAILY SOL LOG
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'guide'
                  ? 'bg-white text-indigo-700 font-bold border border-indigo-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gy vs Sv GUIDE
            </button>
          </div>
        </div>
      </div>

      {/* Critical Scientific Callout: Gy vs Sv Distinction */}
      {showUnitDistinction && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1 w-full">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                FUNDAMENTAL DOSIMETRY DISTINCTION
              </span>
              <span className="text-slate-900 font-semibold">Strict Distinction: Gray (Gy) vs. Sievert (Sv)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700 mt-1.5">
              <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-xs">
                <strong className="text-slate-900">Absorbed Dose (Gray, Gy = 1 J/kg):</strong>{' '}
                Measures raw physical energy absorbed per kg of tissue. Free from biological assumptions.
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-xs">
                <strong className="text-slate-900">Equivalent Dose (Sievert, Sv = Gy × W_R):</strong>{' '}
                Measures biological cancer/stochastic risk using weighting factors (GCR heavy nuclei ⁵⁶Fe W_R ≈ 20).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Dosimetry Gauges (4 Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Real-Time Dose Rate */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>REAL-TIME RATE</span>
            <span className="text-[9px] text-indigo-700 font-semibold">MEASURED</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900">
              {realTimeDoseRate.equivalent_uSv_h}
            </span>
            <span className="text-[10px] text-slate-500">µSv/h</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Absorbed: <strong className="text-slate-800">{realTimeDoseRate.absorbed_uGy_h}</strong> µGy/h
          </div>
        </div>

        {/* Current Daily Sol Dose */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>DAILY SOL 142 DOSE</span>
            <span className="text-[9px] text-teal-700 font-semibold">DERIVED</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-amber-600">
              {currentDailyDose.equivalent_mSv}
            </span>
            <span className="text-[10px] text-slate-500">mSv/day</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Absorbed: <strong className="text-slate-800">{currentDailyDose.absorbed_mGy}</strong> mGy/day
          </div>
        </div>

        {/* Cumulative Mission Dose */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center justify-between text-[10px] text-amber-700 mb-1">
            <span>CUMULATIVE MISSION DOSE</span>
            <span className="text-[9px] font-bold">SOL 1–142</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900">
              {cumulativeMissionDose.equivalent_mSv}
            </span>
            <span className="text-[10px] text-slate-500">mSv</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Absorbed: <strong className="text-slate-800">{cumulativeMissionDose.absorbed_mGy}</strong> mGy
          </div>
        </div>

        {/* Career PEL Limit % */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>CAREER PEL LIMIT (600 mSv)</span>
            <span className="text-[9px] text-emerald-700 font-bold">NASA REID</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-emerald-600">
              {cumulativeMissionDose.careerDosePercentage}%
            </span>
            <span className="text-[10px] text-slate-500">used</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Annual: {cumulativeMissionDose.annualLimit_mSv} mSv cap
          </div>
        </div>
      </div>

      {/* Main Tab View */}
      {activeTab === 'cumulative' && (
        <div className="w-full bg-slate-50/70 rounded-xl border border-slate-200 p-3 flex flex-col gap-3 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600 pb-2 border-b border-slate-200">
            <span className="font-semibold text-slate-900">Cumulative Mission Radiation Curve (Sol 1 through Sol 142)</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-amber-500" /> Equivalent Dose H (mSv)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-teal-600" /> Absorbed Dose D (mGy)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t border-dashed border-rose-500" /> 30-Day Limit (50 mSv)
              </span>
            </div>
          </div>

          {/* SVG Chart of Sol 1-142 Cumulative Accumulation */}
          <div className="w-full h-40 relative flex items-center">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 120" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="20" x2="800" y2="20" stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="800" y2="60" stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />

              {/* Equivalent Dose (Sv / mSv) accumulation curve */}
              <polyline
                fill="none"
                stroke="#D97706"
                strokeWidth="2.5"
                points={dailyHistory
                  .map((d, i) => {
                    const x = (i / (dailyHistory.length - 1 || 1)) * 790 + 5;
                    const runningEq = dailyHistory.slice(0, i + 1).reduce((acc, cur) => acc + cur.equivalentDose_mSv, 0);
                    const y = 115 - (runningEq / 120) * 105;
                    return `${x},${Math.max(5, y)}`;
                  })
                  .join(' ')}
              />

              {/* Absorbed Dose (Gy / mGy) accumulation curve */}
              <polyline
                fill="none"
                stroke="#0D9488"
                strokeWidth="1.8"
                strokeDasharray="4 2"
                points={dailyHistory
                  .map((d, i) => {
                    const x = (i / (dailyHistory.length - 1 || 1)) * 790 + 5;
                    const runningAbs = dailyHistory.slice(0, i + 1).reduce((acc, cur) => acc + cur.absorbedDose_mGy, 0);
                    const y = 115 - (runningAbs / 120) * 105;
                    return `${x},${Math.max(5, y)}`;
                  })
                  .join(' ')}
              />
            </svg>
          </div>

          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Sol 1 (Launch / Trans-Mars Injection)</span>
            <span>Sol 70 (Mid-Course Navigation)</span>
            <span>Sol 142 (Current Station) · Projected Sol 210 Mars Orbit Arrival</span>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="w-full bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-2 shadow-xs">
          <div className="text-[10px] text-slate-900 font-semibold border-b border-slate-200 pb-1">
            Recent Sols Active Dosimetry Log
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 text-[10px]">
                  <th className="py-1">MISSION SOL</th>
                  <th className="py-1">ABSORBED DOSE (mGy)</th>
                  <th className="py-1">WEIGHTING FACTOR (W_R)</th>
                  <th className="py-1">EQUIVALENT DOSE (mSv)</th>
                  <th className="py-1">GCR COMPONENT</th>
                  <th className="py-1">SPE COMPONENT</th>
                  <th className="py-1">CLASSIFICATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {recentHistory.map((rec) => (
                  <tr key={rec.sol} className="hover:bg-slate-50">
                    <td className="py-1.5 font-bold text-slate-900">Sol {rec.sol}</td>
                    <td className="py-1.5 text-teal-700">{rec.absorbedDose_mGy} mGy</td>
                    <td className="py-1.5 text-slate-600">{rec.effectiveQualityFactor_WR}</td>
                    <td className="py-1.5 font-bold text-amber-700">{rec.equivalentDose_mSv} mSv</td>
                    <td className="py-1.5 text-slate-600">{rec.gcrComponent_mSv} mSv</td>
                    <td className="py-1.5 text-slate-600">{rec.speComponent_mSv} mSv</td>
                    <td className="py-1.5">
                      {rec.isSimulatedScenario ? (
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[9px] font-bold border border-purple-200">
                          SIMULATED SPE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-semibold border border-emerald-200">
                          MEASURED GCR
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'guide' && (
        <div className="w-full bg-slate-50/70 rounded-xl border border-slate-200 p-3 space-y-2 text-xs shadow-inner">
          <div className="font-bold text-slate-900 text-sm">Clinical & Physics Radiation Guide (NASA-STD-3001)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-600">
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-xs">
              <span className="text-teal-700 font-bold block">ABSORBED DOSE: GRAY (Gy)</span>
              <p>
                1 Gray = 1 Joule of ionizing energy absorbed per 1 kilogram of tissue (1 Gy = 1 J/kg = 100 rads).
                It is a purely physical metric, completely independent of the radiation source type or target tissue biological sensitivity.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-xs">
              <span className="text-amber-700 font-bold block">EQUIVALENT DOSE: SIEVERT (Sv)</span>
              <p>
                Calculated as H = D × W_R. Sievert reflects stochastic biological damage (e.g. lifetime radiation-induced fatal cancer risk).
                Relativistic galactic cosmic ray (GCR) iron nuclei (⁵⁶Fe) generate dense ionization tracks with a Radiation Weighting Factor (W_R) of up to 20, whereas solar protons have W_R ≈ 1 to 2.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Guidance & Countermeasure Protocols */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900">ALARA Countermeasure Status: </span>
            <span>{clinicalGuidance.currentStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 border-t border-slate-200 text-[10px]">
          {clinicalGuidance.countermeasures.map((cm, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{cm}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
