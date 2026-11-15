// SOLARIS Medical Intelligence — Metabolic, Biochemical & Respiratory Telemetry Card
// Includes Respiration (RIP), SpO2, Blood Glucose, Core Temperature, PetCO2, Hydration BIS & Lactate

import React from 'react';
import { MetabolicRespiratoryTelemetry } from '../../data/healthData';
import { Wind, Droplets, Thermometer, Flame, TestTube, CheckCircle2, AlertCircle } from 'lucide-react';

interface MetabolicTelemetryCardProps {
  metabolic: MetabolicRespiratoryTelemetry;
}

export const MetabolicTelemetryCard: React.FC<MetabolicTelemetryCardProps> = ({ metabolic }) => {
  const {
    respiratoryRate,
    spo2,
    bloodGlucose,
    coreTemperature,
    endTidalCO2,
    hydrationBioimpedance,
    capillaryLactate,
  } = metabolic;

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/80 p-5 font-mono text-slate-800 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-slate-900">
                Metabolic, Biochemical & Respiratory Telemetry
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                MULTI-CHANNEL TELEMETRY
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                PROVENANCE: {respiratoryRate.provenance.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              AstroSkin Dual-Band RIP · Bio-Monitor Optical PPG · Heat-Flux Thermistor · Microfluidic Cartridge
            </p>
          </div>
        </div>
      </div>

      {/* Grid of 6 Key Metabolic Parameters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. Respiratory Rate */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>RESPIRATION</span>
              <span className="text-[9px] text-teal-700 font-semibold">RIP BANDS</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{respiratoryRate.value}</span>
              <span className="text-[10px] text-slate-500">{respiratoryRate.unit}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-200">
            Range: 12 – 18 br/m
          </div>
        </div>

        {/* 2. SpO2 Oxygen Saturation */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>SpO2 OXYGEN</span>
              <span className="text-[9px] text-indigo-700 font-semibold">OPTICAL PPG</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-indigo-600">{spo2.value}</span>
              <span className="text-[10px] text-slate-500">{spo2.unit}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-200">
            PI: {spo2.perfusionIndex_pct}% (Normal &gt; 3.0%)
          </div>
        </div>

        {/* 3. Core Body Temperature */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>CORE TEMP</span>
              <span className="text-[9px] text-amber-700 font-semibold">HEAT-FLUX</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{coreTemperature.value_c}</span>
              <span className="text-[10px] text-slate-500">°C</span>
              <span className="text-[10px] text-slate-400 ml-1">({coreTemperature.value_f}°F)</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-200">
            Normal: 36.5 – 37.5 °C
          </div>
        </div>

        {/* 4. Blood Glucose */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>BLOOD GLUCOSE</span>
              <span className="text-[9px] text-emerald-700 font-semibold">CAPILLARY</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{bloodGlucose.value_mg_dl}</span>
              <span className="text-[10px] text-slate-500">mg/dL</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-200">
            {bloodGlucose.value_mmol_l} mmol/L · Fasting
          </div>
        </div>

        {/* 5. End-Tidal CO2 */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>END-TIDAL CO2</span>
              <span className="text-[9px] text-slate-700 font-semibold">CAPNOGRAPHY</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{endTidalCO2.value}</span>
              <span className="text-[10px] text-slate-500">mmHg</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-200">
            Normal: 35 – 45 mmHg
          </div>
        </div>

        {/* 6. Total Body Water / Hydration */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>HYDRATION (TBW)</span>
              <span className="text-[9px] text-teal-700 font-semibold">DERIVED BIS</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{hydrationBioimpedance.totalBodyWater_L}</span>
              <span className="text-[10px] text-slate-500">L</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-200">
            Status: {hydrationBioimpedance.hydrationStatus}
          </div>
        </div>
      </div>

      {/* Respiratory Plethysmography Waveform Visualizer */}
      <div className="w-full bg-slate-50/70 rounded-xl border border-slate-200 p-3 flex flex-col gap-2 shadow-inner">
        <div className="flex justify-between items-center text-[10px] text-slate-600 pb-1 border-b border-slate-200">
          <span className="font-semibold text-slate-900">Dual-Band Inductive Plethysmography (RIP) Respiratory Trace</span>
          <span className="text-teal-700 font-semibold">50 Hz Real-Time Waveform</span>
        </div>

        {/* SVG Respiration Waveform */}
        <div className="w-full h-16 relative flex items-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 600 50" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#0D9488"
              strokeWidth="2"
              strokeLinejoin="round"
              points={[
                [0, 25], [30, 10], [60, 5], [90, 15], [120, 35], [150, 42], [180, 25],
                [210, 8], [240, 4], [270, 14], [300, 36], [330, 44], [360, 25],
                [390, 9], [420, 5], [450, 16], [480, 35], [510, 43], [540, 25],
                [570, 10], [600, 25]
              ].map(([x, y]) => `${x},${y}`).join(' ')}
            />
          </svg>
        </div>

        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Thoracic Inhalation (+0.8L)</span>
          <span>Diaphragmatic Exhalation (-0.8L)</span>
          <span>14.2 Breaths/Minute Steady Sinus Cadence</span>
        </div>
      </div>

      {/* Spaceflight Physiological Notes */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
        <Thermometer className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Spaceflight Thermoregulation Notice: </span>
          <span>{coreTemperature.spaceflightHyperthermiaNote}</span>
        </div>
      </div>
    </div>
  );
};
