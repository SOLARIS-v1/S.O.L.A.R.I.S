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
    <div className="fixed bottom-14 right-4 z-50 w-full max-w-sm rounded-xl bg-[#0B1017]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col font-mono text-[#ECE8E1] select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="p-3 hairline-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-[#B8CCE6]" strokeWidth={1.25} />
          <span className="text-[11px] font-medium tracking-instrument uppercase text-[#ECE8E1]">
            SIMULATOR & FAULTS
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#8E8AB8]/15 border border-[#8E8AB8]/40 text-[#8E8AB8]">
            SIM
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 transition-colors"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.25} />
        </button>
      </div>

      <div className="p-3.5 space-y-3.5 max-h-[80vh] overflow-y-auto">
        {/* Crew Selector */}
        <div>
          <label className="text-[10px] text-[#5B6573] uppercase tracking-wider block mb-1">
            TARGET ASTRONAUT
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {crew.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveSubject(c.id)}
                className={`p-2 rounded text-left border transition-colors ${
                  activeSubjectId === c.id
                    ? 'border-[#B8CCE6]/50 bg-white/10 text-[#ECE8E1]'
                    : 'border-white/5 text-[#8D97A6] hover:bg-white/5'
                }`}
              >
                <div className="text-[11px] font-medium truncate">{c.name}</div>
                <div className="text-[9px] text-[#5B6573]">{c.callsign}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Engine Controls */}
        <div>
          <label className="text-[10px] text-[#5B6573] uppercase tracking-wider block mb-1">
            TELEMETRY STREAM ENGINE
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => toggleSimulator()}
              className={`flex-1 py-1.5 px-3 rounded text-[11px] flex items-center justify-center gap-1.5 border transition-colors ${
                isSimulating
                  ? 'border-[#E0BE6A]/50 bg-[#E0BE6A]/15 text-[#E0BE6A]'
                  : 'border-white/10 text-[#ECE8E1] hover:bg-white/5'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3 h-3" strokeWidth={1.25} />
                  <span>PAUSE STREAM</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" strokeWidth={1.25} />
                  <span>START STREAM</span>
                </>
              )}
            </button>
            <button
              onClick={() => stepSimulation()}
              disabled={isSimulating}
              className="px-2.5 py-1.5 rounded text-[11px] border border-white/10 text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 disabled:opacity-30"
              title="Step single tick"
            >
              STEP
            </button>
          </div>
        </div>

        {/* Fault Injection */}
        <div>
          <label className="text-[10px] text-[#5B6573] uppercase tracking-wider block mb-1">
            FAULT INJECTION TRIGGERS
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => injectFault('fever', activeSubjectId)}
              className="p-2 rounded border border-white/5 hover:border-white/15 bg-white/[0.02] text-left transition-colors flex items-center gap-2 group"
            >
              <Flame className="w-3.5 h-3.5 text-[#DE6A64]" strokeWidth={1.25} />
              <div>
                <div className="text-[10px] font-medium text-[#ECE8E1]">CORE FEVER</div>
                <div className="text-[8px] text-[#5B6573]">38.8°C Spike</div>
              </div>
            </button>

            <button
              onClick={() => injectFault('bad_sleep', activeSubjectId)}
              className="p-2 rounded border border-white/5 hover:border-white/15 bg-white/[0.02] text-left transition-colors flex items-center gap-2 group"
            >
              <Moon className="w-3.5 h-3.5 text-[#E0BE6A]" strokeWidth={1.25} />
              <div>
                <div className="text-[10px] font-medium text-[#ECE8E1]">SLEEP LOSS</div>
                <div className="text-[8px] text-[#5B6573]">3.8h Disruption</div>
              </div>
            </button>

            <button
              onClick={() => injectFault('raised_bp', activeSubjectId)}
              className="p-2 rounded border border-white/5 hover:border-white/15 bg-white/[0.02] text-left transition-colors flex items-center gap-2 group"
            >
              <HeartPulse className="w-3.5 h-3.5 text-[#E58F55]" strokeWidth={1.25} />
              <div>
                <div className="text-[10px] font-medium text-[#ECE8E1]">HYPERTENSION</div>
                <div className="text-[8px] text-[#5B6573]">148/96 mmHg</div>
              </div>
            </button>

            <button
              onClick={() => injectFault('link_down')}
              className="p-2 rounded border border-white/5 hover:border-white/15 bg-white/[0.02] text-left transition-colors flex items-center gap-2 group"
            >
              <WifiOff className="w-3.5 h-3.5 text-[#8E8AB8]" strokeWidth={1.25} />
              <div>
                <div className="text-[10px] font-medium text-[#ECE8E1]">LINK DROPOUT</div>
                <div className="text-[8px] text-[#5B6573]">Deep Blackout</div>
              </div>
            </button>
          </div>
        </div>

        {/* Reset State */}
        <div className="pt-2 hairline-t flex items-center justify-between">
          <span className="text-[10px] text-[#5B6573]">RESTORE INITIAL DEMO</span>
          <button
            onClick={() => resetAll()}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 border border-white/5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={1.25} />
            <span>RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};
