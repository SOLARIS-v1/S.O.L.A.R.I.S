import React, { useState, useEffect } from 'react';
import { useAstraStore } from '../../api/mockClient';
import {
  Play,
  Pause,
  RotateCcw,
  Flame,
  Moon,
  HeartPulse,
  WifiOff,
  AlertCircle,
  X,
  Sliders,
} from 'lucide-react';

interface SimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulatorDrawer: React.FC<SimulatorDrawerProps> = ({ isOpen, onClose }) => {
  const {
    crew,
    activeSubjectId,
    setActiveSubject,
    isSimulating,
    toggleSimulator,
    stepSimulation,
    injectFault,
    resetAll,
    records,
  } = useAstraStore();

  const [simSpeed, setSimSpeed] = useState<number>(3000);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      stepSimulation();
    }, simSpeed);
    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, stepSimulation]);

  if (!isOpen) return null;

  const latestSimRecords = records
    .filter((r) => r.subject_id === activeSubjectId)
    .slice(-6)
    .reverse();

  return (
    <div className="fixed bottom-14 right-4 z-50 w-full max-w-sm rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col font-mono text-slate-800 select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="p-3 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-900">
            SIMULATOR & FAULTS
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
            SIM
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-3.5 space-y-3.5 max-h-[80vh] overflow-y-auto">
        {/* Crew Selector */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1 font-semibold">
            TARGET ASTRONAUT
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {crew.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveSubject(c.id)}
                className={`p-2 rounded text-left border transition-colors ${
                  activeSubjectId === c.id
                    ? 'border-indigo-400 bg-indigo-50/70 text-indigo-900 shadow-sm font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-[11px] font-medium truncate">{c.name}</div>
                <div className="text-[9px] text-slate-400">{c.callsign}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Engine Controls */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1 font-semibold">
            TELEMETRY STREAM ENGINE
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => toggleSimulator()}
              className={`flex-1 py-1.5 px-3 rounded text-[11px] flex items-center justify-center gap-1.5 border transition-colors shadow-sm font-semibold ${
                isSimulating
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3 h-3 text-amber-600" strokeWidth={1.5} />
                  <span>PAUSE STREAM</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-indigo-600" strokeWidth={1.5} />
                  <span>START STREAM</span>
                </>
              )}
            </button>
            <button
              onClick={() => stepSimulation()}
              disabled={isSimulating}
              className="px-2.5 py-1.5 rounded text-[11px] border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 shadow-sm font-semibold"
              title="Step single tick"
            >
              STEP
            </button>
          </div>
        </div>

        {/* Fault Injection */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1 font-semibold">
            FAULT INJECTION TRIGGERS
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => injectFault('fever', activeSubjectId)}
              className="p-2 rounded border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors flex items-center gap-2 group shadow-sm"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.5} />
              <div>
                <div className="text-[10px] font-semibold text-slate-800">CORE FEVER</div>
                <div className="text-[8px] text-slate-500">38.8°C Spike</div>
              </div>
            </button>

            <button
              onClick={() => injectFault('bad_sleep', activeSubjectId)}
              className="p-2 rounded border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors flex items-center gap-2 group shadow-sm"
            >
              <Moon className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
              <div>
                <div className="text-[10px] font-semibold text-slate-800">SLEEP LOSS</div>
                <div className="text-[8px] text-slate-500">3.8h Disruption</div>
              </div>
            </button>

            <button
              onClick={() => injectFault('raised_bp', activeSubjectId)}
              className="p-2 rounded border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors flex items-center gap-2 group shadow-sm"
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.5} />
              <div>
                <div className="text-[10px] font-semibold text-slate-800">HYPERTENSION</div>
                <div className="text-[8px] text-slate-500">148/96 mmHg</div>
              </div>
            </button>

            <button
              onClick={() => injectFault('link_down')}
              className="p-2 rounded border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors flex items-center gap-2 group shadow-sm"
            >
              <WifiOff className="w-3.5 h-3.5 text-indigo-500" strokeWidth={1.5} />
              <div>
                <div className="text-[10px] font-semibold text-slate-800">LINK DROPOUT</div>
                <div className="text-[8px] text-slate-500">Deep Blackout</div>
              </div>
            </button>
          </div>
        </div>

        {/* Reset State */}
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-medium">RESTORE INITIAL DEMO</span>
          <button
            onClick={() => resetAll()}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors font-semibold"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
            <span>RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};
