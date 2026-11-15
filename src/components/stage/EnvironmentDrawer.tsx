import React from 'react';
import { useAstraStore } from '../../api/mockClient';
import { MissionEnvironment } from '../../api/types';
import { X, Gauge, Wind, Thermometer, ShieldCheck, Activity } from 'lucide-react';

interface EnvironmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnvironmentDrawer: React.FC<EnvironmentDrawerProps> = ({ isOpen, onClose }) => {
  const { environment, setEnvironment, environmentMetrics } = useAstraStore();

  if (!isOpen) return null;

  const envOptions: Array<{ id: MissionEnvironment; label: string }> = [
    { id: 'mars_habitat', label: 'MARS HABITAT' },
    { id: 'station', label: 'ORBITAL STATION' },
    { id: 'lunar', label: 'LUNAR GATEWAY' },
    { id: 'rover', label: 'PRESSURIZED ROVER' },
    { id: 'satellite', label: 'DEEP SPACE TRANSIT' },
  ];

  const m = environmentMetrics || {
    cabinPressure_kPa: 101.3,
    ppO2_kPa: 21.0,
    ppCO2_mmHg: 2.1,
    cabinTemp_C: 21.5,
    relativeHumidity_pct: 45.0,
    acousticNoise_dB: 54.0,
    radiationDoseRate_uSv_h: 18.5,
    cumulativeRadiationDose_mSv: 48.2,
    exerciseCompliance_pct: 92.0,
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white/95 backdrop-blur-xl border-l border-slate-200/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 font-mono text-slate-800 select-none"
      aria-label="Habitat Environment Drawer"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
          <h2 className="text-xs font-mono tracking-wider uppercase font-bold text-slate-900">
            HABITAT ENVIRONMENT
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Environment Mode Switch */}
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5 font-semibold">
            MISSION OPERATIONAL ENVIRONMENT
          </span>
          <div className="grid grid-cols-1 gap-1">
            {envOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setEnvironment(opt.id)}
                className={`px-3 py-2 rounded-lg text-left text-[11px] border transition-colors flex items-center justify-between shadow-sm ${
                  environment === opt.id
                    ? 'border-indigo-400 bg-indigo-50/70 text-indigo-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{opt.label}</span>
                {environment === opt.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Life Support Telemetry Gauges */}
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-semibold">
            ECLSS ATMOSPHERIC TELEMETRY
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-sm">
              <span className="text-[9px] text-slate-500 font-semibold uppercase block">TOTAL PRESSURE</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-slate-900">{m.cabinPressure_kPa.toFixed(1)}</span>
                <span className="text-[9px] text-slate-500">kPa</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-sm">
              <span className="text-[9px] text-slate-500 font-semibold uppercase block">O2 PARTIAL PRES.</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-slate-900">{m.ppO2_kPa.toFixed(1)}</span>
                <span className="text-[9px] text-slate-500">kPa</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-sm">
              <span className="text-[9px] text-slate-500 font-semibold uppercase block">CO2 CONCENTRATION</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-slate-900">{m.ppCO2_mmHg.toFixed(1)}</span>
                <span className="text-[9px] text-slate-500">mmHg</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-sm">
              <span className="text-[9px] text-slate-500 font-semibold uppercase block">CABIN TEMP</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-slate-900">{m.cabinTemp_C.toFixed(1)}</span>
                <span className="text-[9px] text-slate-500">°C</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-sm">
              <span className="text-[9px] text-slate-500 font-semibold uppercase block">REL. HUMIDITY</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-slate-900">{m.relativeHumidity_pct.toFixed(0)}</span>
                <span className="text-[9px] text-slate-500">%</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-sm">
              <span className="text-[9px] text-slate-500 font-semibold uppercase block">RADIATION RATE</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-slate-900">{m.radiationDoseRate_uSv_h.toFixed(1)}</span>
                <span className="text-[9px] text-slate-500">µSv/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Countermeasures & Exercise */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold mb-1">
            <span>ARED & CEVIS PROTOCOL COMPLIANCE</span>
            <span className="text-emerald-600 font-bold">{m.exerciseCompliance_pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${m.exerciseCompliance_pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200/80 text-[10px] font-mono text-slate-500">
        Prototype decision support, not a medical device.
      </div>
    </aside>
  );
};
