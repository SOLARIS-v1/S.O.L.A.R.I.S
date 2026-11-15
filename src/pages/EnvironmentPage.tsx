// SOLARIS Orbital Medical Intelligence — Mission Environment & Habitat Telemetry
// Implements Atmospheric Pressure, O2/CO2 Partial Pressures, Thermal/Acoustic Noise, Gravitational Profile & Deep Space Earth Comm Link Delay

import React, { useState } from 'react';
import { getHabitatEnvironment, HabitatEnvironmentDataset } from '../data/environmentData';
import {
  Globe,
  Gauge,
  Wind,
  Thermometer,
  Volume2,
  Radio,
  Compass,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  Clock,
  Wifi,
  Cpu,
  RefreshCw,
  Info,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export const EnvironmentPage: React.FC = () => {
  const [isElevatedCO2, setIsElevatedCO2] = useState<boolean>(false);
  const [activeRegime, setActiveRegime] = useState<'TRANSIT_0G' | 'LUNAR_0166G' | 'MARS_038G'>('TRANSIT_0G');
  const [activeTab, setActiveTab] = useState<'all' | 'atmosphere' | 'thermal' | 'gravity' | 'comm' | 'trace'>('all');

  const envData: HabitatEnvironmentDataset = getHabitatEnvironment(isElevatedCO2);
  const { atmospheric, thermalAcoustic, gravitational, earthLink, traceContaminants } = envData;

  // Dynamic g-value based on regime selector
  const currentGVal = activeRegime === 'TRANSIT_0G' ? 0.00 : activeRegime === 'LUNAR_0166G' ? 0.166 : 0.38;
  const currentGLabel = activeRegime === 'TRANSIT_0G' ? 'Deep Space Transit (0.00g Microgravity)' : activeRegime === 'LUNAR_0166G' ? 'Lunar Surface (0.166g)' : 'Mars Surface (0.38g)';

  return (
    <div className="w-full min-h-screen bg-[#F4F7FC] text-slate-800 font-sans p-4 lg:p-6 select-none space-y-6">
      {/* Top Header & Telemetry Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 font-semibold mb-1">
            <span>MISSION SOL 142 / 500</span>
            <span>·</span>
            <span>HABITAT MODULE ALPHA</span>
            <span>·</span>
            <span className="text-emerald-600 font-bold">ECLSS LIFE SUPPORT ONLINE</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Mission Environmental Intelligence & Life Support
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Atmospheric Integrity · Cephalad CO2 Thresholds · Acoustic Spectrum · Deep Space Link Latency
          </p>
        </div>

        {/* Right Action Bar: Simulated Scenario Toggle & Regime */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Gravitational Regime Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-inner">
            <button
              onClick={() => setActiveRegime('TRANSIT_0G')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeRegime === 'TRANSIT_0G'
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              0.00g TRANSIT
            </button>
            <button
              onClick={() => setActiveRegime('LUNAR_0166G')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeRegime === 'LUNAR_0166G'
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              0.166g LUNAR
            </button>
            <button
              onClick={() => setActiveRegime('MARS_038G')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeRegime === 'MARS_038G'
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              0.38g MARS
            </button>
          </div>

          {/* Elevated CO2 Scenario Ingestion Toggle */}
          <button
            onClick={() => setIsElevatedCO2(!isElevatedCO2)}
            className={`px-3 py-1.5 rounded-xl border font-semibold transition-all shadow-sm ${
              isElevatedCO2
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
            }`}
          >
            {isElevatedCO2 ? 'RESTORE NOMINAL CO2' : 'SIMULATE CDRA STRAIN (3.8 mmHg)'}
          </button>
        </div>
      </div>

      {/* Provenance & Methodology Banner */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
            <span className="text-slate-600">
              <strong className="text-slate-800">MEASURED:</strong> ECLSS Barometer, Zirconia O2, NDIR CO2, DSN Ka-Band Receiver
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" />
            <span className="text-slate-600">
              <strong className="text-slate-800">DERIVED:</strong> Relativistic Light Time (OWLT = r/c), Dalton ppN2, Psychrometric Dew Point
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>DSN Telemetry Lock: <strong className="text-slate-800">DSS-14 Goldstone</strong></span>
        </div>
      </div>

      {/* Tab Navigation Filter */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs border-b border-slate-200/80 pb-3">
        {[
          { id: 'all', label: 'ALL PARAMETERS', icon: Layers },
          { id: 'atmosphere', label: 'ATMOSPHERE & ECLSS', icon: Wind },
          { id: 'thermal', label: 'THERMAL & NOISE SPECTRUM', icon: Volume2 },
          { id: 'gravity', label: 'GRAVITATIONAL DYNAMICS', icon: Compass },
          { id: 'comm', label: 'EARTH LINK & OWLT DELAY', icon: Radio },
          { id: 'trace', label: 'TRACE GASES & HEPA', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm'
              }`}
            >
              <Icon className="w-4 h-4 text-indigo-600" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Environmental Content Modules */}
      <div className="space-y-6">
        {/* SECTION 1: ATMOSPHERE & ECLSS LIFE SUPPORT */}
        {(activeTab === 'all' || activeTab === 'atmosphere') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide text-slate-900 flex items-center gap-2 font-mono">
                <Wind className="w-4 h-4 text-indigo-600" />
                <span>1. ATMOSPHERIC ENVELOPE & ECLSS LIFE SUPPORT SYSTEMS</span>
              </h2>
              <span className="text-xs font-mono text-slate-500">
                NASA-STD-3001 Pressurized Cabin Volume Envelope
              </span>
            </div>

            {/* 4 Primary Atmospheric Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Pressure */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between font-mono">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>CABIN TOTAL PRESSURE</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px]">
                      {atmospheric.totalPressure_kPa.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">
                      {atmospheric.totalPressure_kPa.value}
                    </span>
                    <span className="text-xs text-slate-500">kPa</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {atmospheric.totalPressure_kPa.psiEquivalent} psi · {atmospheric.totalPressure_kPa.mmHgEquivalent} mmHg
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
                  <span>Setpoint: {atmospheric.totalPressure_kPa.setpoint} kPa</span>
                  <span className="text-indigo-600 font-semibold">MEASURED</span>
                </div>
              </div>

              {/* Partial Pressure O2 */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between font-mono">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>PARTIAL PRESSURE O₂</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px]">
                      {atmospheric.ppO2_kPa.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-indigo-600">
                      {atmospheric.ppO2_kPa.value}
                    </span>
                    <span className="text-xs text-slate-500">kPa</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {atmospheric.ppO2_kPa.percentage}% Concentration (Nominal: 21.0%)
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
                  <span>Range: 19.5 – 23.5 kPa</span>
                  <span className="text-indigo-600 font-semibold">MEASURED</span>
                </div>
              </div>

              {/* Partial Pressure CO2 with spaceflight alert */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between font-mono">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>PARTIAL PRESSURE CO₂</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                        atmospheric.ppCO2_mmHg.status === 'NOMINAL'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                      }`}
                    >
                      {atmospheric.ppCO2_mmHg.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-bold ${
                        atmospheric.ppCO2_mmHg.value > 3.0 ? 'text-amber-600' : 'text-slate-900'
                      }`}
                    >
                      {atmospheric.ppCO2_mmHg.value}
                    </span>
                    <span className="text-xs text-slate-500">mmHg</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {atmospheric.ppCO2_mmHg.kPaEquivalent} kPa · Space Limit: &lt; 3.0 mmHg
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
                  <span>Action Limit: 4.0 mmHg</span>
                  <span className="text-indigo-600 font-semibold">{atmospheric.ppCO2_mmHg.provenance.type}</span>
                </div>
              </div>

              {/* Leak Rate */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between font-mono">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>HULL HERMETIC SEAL</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px]">
                      {atmospheric.leakRate_kPa_per_day.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">
                      {atmospheric.leakRate_kPa_per_day.value}
                    </span>
                    <span className="text-xs text-slate-500">kPa/day</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Limit: &lt; {atmospheric.leakRate_kPa_per_day.nominalLimit} kPa/day (Optimal)
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
                  <span>Dalton Balance ppN2: {atmospheric.ppN2_kPa.value} kPa</span>
                  <span className="text-teal-600 font-semibold">DERIVED</span>
                </div>
              </div>
            </div>

            {/* ECLSS Mechanical Assembly Status Grid */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-mono space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-900 font-bold border-b border-slate-100 pb-2">
                <span>Environmental Control & Life Support Subsystem Status</span>
                <span className="text-[11px] text-teal-600 font-semibold">Active Continuous Scrubbing & Recycling</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                {/* CDRA */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold">CDRA CO2 SCRUBBER</div>
                  <div className="text-sm font-bold text-slate-900">
                    {atmospheric.eclssSystems.cdra.efficiencyPct}% Efficiency
                  </div>
                  <div className="text-[10px] text-indigo-600 font-medium">
                    Mode: {atmospheric.eclssSystems.cdra.mode}
                  </div>
                </div>

                {/* OGS */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold">OGS ELECTROLYSIS</div>
                  <div className="text-sm font-bold text-slate-900">
                    {atmospheric.eclssSystems.ogs.o2ProducedRate_kg_day} kg/day O₂
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    Electrolyzing: {atmospheric.eclssSystems.ogs.h2oElectrolyzedRate_L_day} L/day H₂O
                  </div>
                </div>

                {/* TCCS */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold">TCCS CATALYTIC OXIDIZER</div>
                  <div className="text-sm font-bold text-slate-900">
                    {atmospheric.eclssSystems.tccs.catalyticOxidizerTemp_C} °C
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Charcoal ΔP: {atmospheric.eclssSystems.tccs.charcoalBedDeltaP_kPa} kPa
                  </div>
                </div>

                {/* Water Recovery */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold">WATER RECYCLING LOOP</div>
                  <div className="text-sm font-bold text-slate-900">
                    {atmospheric.eclssSystems.waterRecovery.efficiencyPct}% Recovery
                  </div>
                  <div className="text-[10px] text-teal-600 font-medium">
                    Potable Reserve: {atmospheric.eclssSystems.waterRecovery.potableWaterStorage_pct}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: THERMAL & ACOUSTIC SPECTRUM */}
        {(activeTab === 'all' || activeTab === 'thermal') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide text-slate-900 flex items-center gap-2 font-mono">
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span>2. THERMAL CLIMATE & CABIN ACOUSTIC NOISE SPECTRUM</span>
              </h2>
              <span className="text-xs font-mono text-slate-500">
                NASA NC-52 Work Area & NC-40 Sleep Quarter Compliance
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thermal Dynamics */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-mono space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900">Thermal & HVAC Ventilation</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">MEASURED (ZONE 4 RTD)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">TEMPERATURE</span>
                    <span className="text-lg font-bold text-slate-900">
                      {thermalAcoustic.cabinTemperature.value_c} °C
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({thermalAcoustic.cabinTemperature.value_f} °F)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">HUMIDITY</span>
                    <span className="text-lg font-bold text-slate-900">
                      {thermalAcoustic.relativeHumidity.value_pct}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">Target: 40–55%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">DEW POINT</span>
                    <span className="text-lg font-bold text-slate-900">
                      {thermalAcoustic.dewPoint_C.value} °C
                    </span>
                    <span className="text-[10px] text-teal-600 font-semibold block">DERIVED</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">VENT AIRSPEED</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {thermalAcoustic.ventilationAirspeed_mps.value} m/s
                    </span>
                    <span className="text-[10px] text-slate-500 block">Min: 0.08 m/s</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div className="text-slate-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ventilation Airflow Integrity:</span>
                  </div>
                  <p>
                    {thermalAcoustic.ventilationAirspeed_mps.provenance.note}
                  </p>
                </div>
              </div>

              {/* Acoustic Octave Band Spectrum */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-mono space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900">
                    Acoustic Noise (Ambient: {thermalAcoustic.ambientNoise_dBA.value} dBA · Sleep: {thermalAcoustic.sleepCompartmentNoise_dBA.value} dBA)
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">NC-52 COMPLIANT</span>
                </div>

                {/* Octave Bands Spectrum Chart (SVG) */}
                <div className="w-full h-32 relative bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 90" preserveAspectRatio="none">
                    {/* NC-52 Criterion Curve (red dashed line) */}
                    <polyline
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      points={thermalAcoustic.octaveBands_dB
                        .map((b, i) => {
                          const x = (i / (thermalAcoustic.octaveBands_dB.length - 1)) * 360 + 20;
                          const y = 85 - (b.nc52Limit_dB / 80) * 80;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Measured dB Bars */}
                    {thermalAcoustic.octaveBands_dB.map((b, i) => {
                      const x = (i / (thermalAcoustic.octaveBands_dB.length - 1)) * 360 + 10;
                      const barH = (b.measured_dB / 80) * 80;
                      const y = 85 - barH;
                      return (
                        <g key={i}>
                          <rect
                            x={x}
                            y={y}
                            width="20"
                            height={barH}
                            rx="3"
                            fill="#4F46E5"
                            opacity="0.85"
                          />
                          <text
                            x={x + 10}
                            y="88"
                            fill="#64748B"
                            fontSize="6"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {b.frequencyHz >= 1000 ? `${b.frequencyHz / 1000}k` : b.frequencyHz}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2 rounded bg-indigo-600" /> Measured Octave Band
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 border-t border-dashed border-rose-500" /> NASA NC-52 Upper Limit
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: GRAVITATIONAL PROFILE & DYNAMICS */}
        {(activeTab === 'all' || activeTab === 'gravity') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide text-slate-900 flex items-center gap-2 font-mono">
                <Compass className="w-4 h-4 text-purple-600" />
                <span>3. GRAVITATIONAL PROFILE, MICRO-VIBRATION & FLUID REDISTRIBUTION</span>
              </h2>
              <span className="text-xs font-mono text-slate-500">
                Triaxial Accelerometer Vector · Vestibular Status
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Current G Status */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-mono space-y-2">
                <div className="text-[10px] text-slate-500 font-semibold">GRAVITATIONAL ACCELERATION</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">{currentGVal.toFixed(3)}</span>
                  <span className="text-xs text-slate-500">g</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold">{currentGLabel}</div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  Sensor: Honeywell Ring Laser IMU · 100 Hz Raw
                </div>
              </div>

              {/* 3-Axis Micro-Vibration */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-mono space-y-2">
                <div className="text-[10px] text-slate-500 font-semibold">HABITAT MICRO-VIBRATION JITTER</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-teal-600">
                    {gravitational.microVibration_ug.vectorMagnitude_ug}
                  </span>
                  <span className="text-xs text-slate-500">µg (Vector Net)</span>
                </div>
                <div className="text-[11px] text-slate-700">
                  X: {gravitational.microVibration_ug.axisX} µg · Y: {gravitational.microVibration_ug.axisY} µg · Z: {gravitational.microVibration_ug.axisZ} µg
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  Source: {gravitational.microVibration_ug.primarySource}
                </div>
              </div>

              {/* Cephalad Fluid Shift */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-mono space-y-2">
                <div className="text-[10px] text-slate-500 font-semibold">CEPHALIC FLUID TRANSLOCATION</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-amber-600">
                    +{gravitational.fluidShiftVector.intracranialTranslocationPct}%
                  </span>
                  <span className="text-xs text-slate-500">cranial shift</span>
                </div>
                <div className="text-[11px] text-slate-700">
                  Jugular Pressure Est: {gravitational.fluidShiftVector.jugularPressureEst_mmHg} mmHg
                </div>
                <div className="text-[10px] text-emerald-600 font-medium pt-1 border-t border-slate-100">
                  {gravitational.fluidShiftVector.countermeasureActive}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: EARTH COMMUNICATION LINK & LIGHT TIME DELAY */}
        {(activeTab === 'all' || activeTab === 'comm') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide text-slate-900 flex items-center gap-2 font-mono">
                <Radio className="w-4 h-4 text-indigo-600" />
                <span>4. EARTH DEEP SPACE NETWORK LINK & RELATIVISTIC DELAY</span>
              </h2>
              <span className="text-xs font-mono text-slate-500">
                JPL DE440 Ephemeris Vector · Ka-Band 32 GHz & DSOC Optical Laser
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Distance to Earth */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-mono space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>DISTANCE TO EARTH</span>
                  <span className="text-teal-600 font-semibold">DERIVED</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {earthLink.distance.millionKm}
                </div>
                <div className="text-[11px] text-slate-500">
                  Million Kilometers ({earthLink.distance.astronomicalUnits_AU} AU)
                </div>
              </div>

              {/* One-Way Light Time (OWLT) */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-200/80 shadow-sm font-mono space-y-1">
                <div className="flex justify-between text-[10px] text-indigo-700 font-semibold">
                  <span>ONE-WAY LIGHT TIME (OWLT)</span>
                  <span className="font-bold">c = 299,792 km/s</span>
                </div>
                <div className="text-2xl font-bold text-indigo-700">
                  {earthLink.oneWayLightTime.formattedMinutes}
                </div>
                <div className="text-[11px] text-slate-500">
                  {earthLink.oneWayLightTime.seconds} seconds elapsed latency
                </div>
              </div>

              {/* Round-Trip Time (RTT) */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50/50 to-white border border-teal-200/80 shadow-sm font-mono space-y-1">
                <div className="flex justify-between text-[10px] text-teal-700 font-semibold">
                  <span>ROUND-TRIP TIME (RTT)</span>
                  <span className="font-bold">2 × OWLT</span>
                </div>
                <div className="text-2xl font-bold text-teal-700">
                  {earthLink.roundTripTime.formattedMinutes}
                </div>
                <div className="text-[11px] text-slate-500">
                  Full query-response delay: {earthLink.roundTripTime.seconds}s
                </div>
              </div>

              {/* Link Health & Ground Station */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-mono space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>DSN TRACKING STATION</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px]">
                    CONNECTED
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  Goldstone DSS-14 (70m)
                </div>
                <div className="text-[11px] text-slate-500">
                  Downlink: {earthLink.bandwidthAndQuality.downlinkRate_Mbps} Mbps · BER: {earthLink.bandwidthAndQuality.bitErrorRate}
                </div>
              </div>
            </div>

            {/* Comm Relay Callout */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {earthLink.oneWayLightTime.provenance.derivationFormula}
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                DSOC Optical Laser Lock: Verified · Pointing Error: 0.002°
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: TRACE GASES & HEPA CLEANLINESS */}
        {(activeTab === 'all' || activeTab === 'trace') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide text-slate-900 flex items-center gap-2 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>5. TRACE CONTAMINANT DETECTOR & HEPA FILTRATION</span>
              </h2>
              <span className="text-xs font-mono text-slate-500">
                Spacecraft Maximum Allowable Concentrations (SMAC 24-Hour Limits)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
              {/* Carbon Monoxide */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                <div className="text-[10px] text-slate-500 font-semibold">CARBON MONOXIDE (CO)</div>
                <div className="text-xl font-bold text-slate-900">
                  {traceContaminants.carbonMonoxide_ppm.value} <span className="text-xs font-normal text-slate-500">ppm</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  Limit: &lt; {traceContaminants.carbonMonoxide_ppm.smac24h_limit} ppm (Optimal)
                </div>
              </div>

              {/* Ammonia */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                <div className="text-[10px] text-slate-500 font-semibold">AMMONIA (NH₃)</div>
                <div className="text-xl font-bold text-slate-900">
                  {traceContaminants.ammonia_ppm.value} <span className="text-xs font-normal text-slate-500">ppm</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  Limit: &lt; {traceContaminants.ammonia_ppm.smac24h_limit} ppm (Optimal)
                </div>
              </div>

              {/* Total VOC */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                <div className="text-[10px] text-slate-500 font-semibold">VOLATILE ORGANICS (VOC)</div>
                <div className="text-xl font-bold text-slate-900">
                  {traceContaminants.vocTotal_mg_m3.value} <span className="text-xs font-normal text-slate-500">mg/m³</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  Limit: &lt; {traceContaminants.vocTotal_mg_m3.limit} mg/m³
                </div>
              </div>

              {/* HEPA Particulates */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                <div className="text-[10px] text-slate-500 font-semibold">AIRBORNE DUST PARTICLES</div>
                <div className="text-xl font-bold text-slate-900">
                  {traceContaminants.particulateHEPA_ug_m3.value} <span className="text-xs font-normal text-slate-500">µg/m³</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  Limit: &lt; {traceContaminants.particulateHEPA_ug_m3.limit} µg/m³ (HEPA Active)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
        <div>
          SOLARIS Habitat Environmental Telemetry · NASA-STD-3001 Pressurized Volume Operations
        </div>
        <div className="flex items-center gap-3">
          <span>Continuous Life Support Supervision</span>
          <span>·</span>
          <span>ECLSS Autonomous Redundancy Active</span>
        </div>
      </footer>
    </div>
  );
};

export default EnvironmentPage;
