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
      className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#0B1017]/95 backdrop-blur-xl border-l border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 font-mono text-[#ECE8E1] select-none"
      aria-label="Habitat Environment Drawer"
    >
      {/* Header */}
      <div className="p-4 hairline-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-[#B8CCE6]" strokeWidth={1.25} />
          <h2 className="text-xs font-mono tracking-instrument uppercase font-medium">
            HABITAT ENVIRONMENT
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Environment Mode Switch */}
        <div>
          <span className="text-[10px] text-[#5B6573] uppercase tracking-wider block mb-1.5">
            MISSION OPERATIONAL ENVIRONMENT
          </span>
          <div className="grid grid-cols-1 gap-1">
            {envOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setEnvironment(opt.id)}
                className={`px-3 py-2 rounded text-left text-[11px] border transition-colors flex items-center justify-between ${
                  environment === opt.id
                    ? 'border-[#B8CCE6]/40 bg-white/10 text-[#ECE8E1]'
                    : 'border-white/5 text-[#8D97A6] hover:bg-white/5'
                }`}
              >
                <span>{opt.label}</span>
                {environment === opt.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6FBF9B]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Life Support Telemetry Gauges */}
        <div>
          <span className="text-[10px] text-[#5B6573] uppercase tracking-wider block mb-2">
            ECLSS ATMOSPHERIC TELEMETRY
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-[9px] text-[#8D97A6] uppercase block">TOTAL PRESSURE</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-light">{m.cabinPressure_kPa.toFixed(1)}</span>
                <span className="text-[9px] text-[#5B6573]">kPa</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-[9px] text-[#8D97A6] uppercase block">O2 PARTIAL PRES.</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-light">{m.ppO2_kPa.toFixed(1)}</span>
                <span className="text-[9px] text-[#5B6573]">kPa</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-[9px] text-[#8D97A6] uppercase block">CO2 CONCENTRATION</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-light">{m.ppCO2_mmHg.toFixed(1)}</span>
                <span className="text-[9px] text-[#5B6573]">mmHg</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-[9px] text-[#8D97A6] uppercase block">CABIN TEMP</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-light">{m.cabinTemp_C.toFixed(1)}</span>
                <span className="text-[9px] text-[#5B6573]">°C</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-[9px] text-[#8D97A6] uppercase block">REL. HUMIDITY</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-light">{m.relativeHumidity_pct.toFixed(0)}</span>
                <span className="text-[9px] text-[#5B6573]">%</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-[9px] text-[#8D97A6] uppercase block">RADIATION RATE</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-light">{m.radiationDoseRate_uSv_h.toFixed(1)}</span>
                <span className="text-[9px] text-[#5B6573]">µSv/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Countermeasures & Exercise */}
        <div className="p-3 rounded bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between text-[10px] text-[#8D97A6] mb-1">
            <span>ARED & CEVIS PROTOCOL COMPLIANCE</span>
            <span className="text-[#6FBF9B]">{m.exerciseCompliance_pct}%</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6FBF9B]"
              style={{ width: `${m.exerciseCompliance_pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4 hairline-t text-[10px] text-[#5B6573]">
        Prototype decision support, not a medical device.
      </div>
    </aside>
  );
};
