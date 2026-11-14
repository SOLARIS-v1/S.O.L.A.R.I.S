import React, { useState } from 'react';
import { useAstraStore } from '../../api/mockClient';
import { X, User, Bell, Volume2, RotateCcw, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { crew, activeSubjectId, setActiveSubject, resetAll } = useAstraStore();
  const [autoBriefing, setAutoBriefing] = useState<boolean>(() => {
    return localStorage.getItem('astra_auto_briefing') !== 'false';
  });

  if (!isOpen) return null;

  const handleToggleAutoBriefing = () => {
    const nextVal = !autoBriefing;
    setAutoBriefing(nextVal);
    localStorage.setItem('astra_auto_briefing', nextVal ? 'true' : 'false');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-sm rounded-xl bg-[#0B1017] border border-white/10 shadow-2xl overflow-hidden font-mono text-[#ECE8E1] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 hairline-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#B8CCE6]" strokeWidth={1.25} />
            <h2 className="text-xs font-mono tracking-instrument uppercase font-medium">
              SETTINGS & PROFILE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.25} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Active Profile */}
          <div>
            <span className="text-[10px] text-[#5B6573] uppercase tracking-wider block mb-1.5">
              ACTIVE ASTRONAUT PROFILE
            </span>
            <div className="space-y-1">
              {crew.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveSubject(c.id);
                  }}
                  className={`w-full px-3 py-2 rounded text-left border transition-colors flex items-center justify-between ${
                    activeSubjectId === c.id
                      ? 'border-[#B8CCE6]/40 bg-white/10 text-[#ECE8E1]'
                      : 'border-white/5 text-[#8D97A6] hover:bg-white/5'
                  }`}
                >
                  <div>
                    <div className="text-xs font-medium">{c.name}</div>
                    <div className="text-[10px] text-[#5B6573]">{c.role} · {c.callsign}</div>
                  </div>
                  {activeSubjectId === c.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6FBF9B]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Assistant Preferences */}
          <div className="pt-2 hairline-t">
            <span className="text-[10px] text-[#5B6573] uppercase tracking-wider block mb-2">
              VOICE ASSISTANT PREFERENCES
            </span>
            <div className="flex items-center justify-between p-2.5 rounded bg-white/[0.02] border border-white/5">
              <div>
                <div className="text-xs text-[#ECE8E1]">Auto-Briefing on Wake</div>
                <div className="text-[10px] text-[#5B6573]">Summarize status on identification</div>
              </div>
              <button
                onClick={handleToggleAutoBriefing}
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  autoBriefing ? 'bg-[#6FBF9B]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    autoBriefing ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Reset Engine */}
          <div className="pt-2 hairline-t flex items-center justify-between">
            <span className="text-[10px] text-[#5B6573]">RESET SIMULATION DATA</span>
            <button
              onClick={() => {
                resetAll();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 border border-white/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.25} />
              <span>RESTORE DEFAULT</span>
            </button>
          </div>
        </div>

        <div className="p-3 hairline-t text-[10px] text-[#5B6573] text-center">
          Prototype decision support, not a medical device.
        </div>
      </div>
    </div>
  );
};
