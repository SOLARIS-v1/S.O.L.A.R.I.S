// SOLARIS Medical Intelligence — Blood Pressure & Derived MAP Monitor
// Displays Systolic, Diastolic, Derived Mean Arterial Pressure (MAP), Pulse Pressure, and 24h/7d Trends

import React, { useState } from 'react';
import { BloodPressureTelemetry } from '../../data/healthData';
import { Heart, Activity, ShieldCheck, HelpCircle, TrendingUp } from 'lucide-react';

interface BloodPressureCardProps {
  bp: BloodPressureTelemetry;
}

export const BloodPressureCard: React.FC<BloodPressureCardProps> = ({ bp }) => {
  const [timeframe, setTimeframe] = useState<'24h' | '7d'>('24h');
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(false);

  const { systolic, diastolic, map, pulsePressure, classification, qualityInfo, history24h, history7d } = bp;
  const historyData = timeframe === '24h' ? history24h : history7d;

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/80 p-5 font-mono text-slate-800 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-slate-900">
                Arterial Hemodynamics & Blood Pressure
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {classification}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                PROVENANCE: {systolic.provenance.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              AstroSkin Inflatable Brachial Cuff · Cephalad Hydrostatic Equalization
            </p>
          </div>
        </div>

        {/* Timeframe switch */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setTimeframe('24h')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              timeframe === '24h'
                ? 'bg-white text-indigo-700 font-bold border border-indigo-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            24-HOUR PROFILE
          </button>
          <button
            onClick={() => setTimeframe('7d')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              timeframe === '7d'
                ? 'bg-white text-indigo-700 font-bold border border-indigo-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7-SOL TREND
          </button>
        </div>
      </div>

      {/* Main 4 Hemodynamic Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Systolic */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 relative">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>SYSTOLIC (SP)</span>
            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-semibold border border-indigo-100">
              MEASURED
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{systolic.value}</span>
            <span className="text-xs text-slate-500">mmHg</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5">
            Normal: 100 – 125 mmHg
          </div>
        </div>

        {/* Diastolic */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 relative">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>DIASTOLIC (DP)</span>
            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-semibold border border-indigo-100">
              MEASURED
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{diastolic.value}</span>
            <span className="text-xs text-slate-500">mmHg</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5">
            Normal: 65 – 82 mmHg
          </div>
        </div>

        {/* Derived MAP */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 relative shadow-xs">
          <div className="flex items-center justify-between text-[10px] text-indigo-700 mb-1">
            <div className="flex items-center gap-1">
              <span className="font-bold">DERIVED MAP</span>
              <button
                onClick={() => setShowFormulaInfo(!showFormulaInfo)}
                className="hover:text-indigo-900"
                title="Explain MAP Derivation"
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </div>
            <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold">
              DERIVED
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-indigo-700">{map.value}</span>
            <span className="text-xs text-indigo-600">mmHg</span>
          </div>
          <div className="text-[10px] text-indigo-600 mt-1.5">
            Target: 70 – 100 mmHg
          </div>
        </div>

        {/* Pulse Pressure */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 relative">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>PULSE PRESSURE (PP)</span>
            <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 text-[9px] font-semibold border border-teal-100">
              DERIVED
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{pulsePressure.value}</span>
            <span className="text-xs text-slate-500">mmHg</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5">
            Arterial Compliance: Normal (40–50)
          </div>
        </div>
      </div>

      {/* Formula Explainer Callout (Conditional) */}
      {showFormulaInfo && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-slate-800 space-y-1">
          <div className="font-bold text-indigo-700">Mean Arterial Pressure (MAP) Derivation:</div>
          <div className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded border border-indigo-100 shadow-xs">
            {map.formula}
            <br />
            Calculation: {diastolic.value} + ⅓({systolic.value} − {diastolic.value}) = {map.value} mmHg
          </div>
          <p className="text-[11px] text-slate-600">
            In microgravity, absence of the 1G hydrostatic gradient removes the normal ~25 mmHg blood pressure differential between the lower limbs and head. Thus, brachial MAP reflects the true cranial perfusion pressure directly impacting cerebral vasculature and optic nerve sheath pressure (SANS risk).
          </p>
        </div>
      )}

      {/* Trend Chart (SVG) */}
      <div className="w-full h-44 bg-slate-50/70 rounded-xl border border-slate-200 p-3 flex flex-col justify-between shadow-inner">
        <div className="flex justify-between text-[10px] text-slate-600 pb-1 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-rose-500" /> Systolic (SP)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-teal-600" /> Mean Arterial (MAP)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-indigo-600" /> Diastolic (DP)
            </span>
          </div>
          <span>Continuous Pressure Track (mmHg)</span>
        </div>

        {/* SVG Chart */}
        <div className="w-full flex-1 relative flex items-center">
          <svg className="w-full h-28 overflow-visible" viewBox="0 0 700 100" preserveAspectRatio="none">
            {/* Guide lines: 140, 100, 70 */}
            <line x1="0" y1="10" x2="700" y2="10" stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="700" y2="50" stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
            <line x1="0" y1="85" x2="700" y2="85" stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />

            {/* Systolic Line */}
            <polyline
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2"
              points={historyData
                .map((d, i) => {
                  const x = (i / (historyData.length - 1 || 1)) * 690 + 5;
                  const y = 95 - ((d.systolic - 60) / 90) * 85;
                  return `${x},${y}`;
                })
                .join(' ')}
            />

            {/* MAP Line (Dashed) */}
            <polyline
              fill="none"
              stroke="#0D9488"
              strokeWidth="1.8"
              strokeDasharray="4 2"
              points={historyData
                .map((d, i) => {
                  const x = (i / (historyData.length - 1 || 1)) * 690 + 5;
                  const y = 95 - ((d.map - 60) / 90) * 85;
                  return `${x},${y}`;
                })
                .join(' ')}
            />

            {/* Diastolic Line */}
            <polyline
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2"
              points={historyData
                .map((d, i) => {
                  const x = (i / (historyData.length - 1 || 1)) * 690 + 5;
                  const y = 95 - ((d.diastolic - 60) / 90) * 85;
                  return `${x},${y}`;
                })
                .join(' ')}
            />

            {/* Data Dots */}
            {historyData.map((d, i) => {
              const x = (i / (historyData.length - 1 || 1)) * 690 + 5;
              const ySys = 95 - ((d.systolic - 60) / 90) * 85;
              const yDia = 95 - ((d.diastolic - 60) / 90) * 85;
              return (
                <g key={i}>
                  <circle cx={x} cy={ySys} r="2.5" fill="#F43F5E" />
                  <circle cx={x} cy={yDia} r="2.5" fill="#4F46E5" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* X Axis Labels */}
        <div className="flex justify-between text-[9px] text-slate-500">
          {historyData.map((d, i) => (
            <span key={i}>{(d as any).time || (d as any).day}</span>
          ))}
        </div>
      </div>

      {/* Hardware Sensor Quality & Hydrostatic Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Pneumatics: <strong className="text-slate-900">{qualityInfo.pneumaticSeal}</strong> · {qualityInfo.cuffLocation}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Gravity Offset: <strong className="text-slate-900">{qualityInfo.hydrostaticOffset}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
