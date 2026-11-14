import React, { useState } from 'react';
import { useAstra } from '../../context/AstraContext';
import { Lock, Mic, ArrowRight } from 'lucide-react';

export const AuthGateModal: React.FC = () => {
  const { activeCrew, selectCrew, sendInput, astraMode, isMicActive, speakText } = useAstra();
  const [typedName, setTypedName] = useState('');

  // Only display if no astronaut is authenticated
  if (activeCrew !== null) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!typedName.trim()) return;
    sendInput(typedName.trim());
    setTypedName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06080C]/90 backdrop-blur-xl select-none animate-in fade-in duration-300">
      <div className="w-full max-w-lg rounded-2xl bg-[#0B1017] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-6 lg:p-8 flex flex-col items-center text-center font-mono text-[#ECE8E1] relative overflow-hidden">
        {/* Subtle Top Accent Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#B8CCE6] to-transparent" />

        {/* Security Shield Lock Mark */}
        <div className="w-14 h-14 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center mb-4 relative">
          <Lock className="w-6 h-6 text-[#B8CCE6]" strokeWidth={1.25} />
          {isMicActive && (
            <div className="absolute inset-0 rounded-full border border-[#6FBF9B] animate-ping opacity-60" />
          )}
        </div>

        {/* Title */}
        <span className="text-[10px] font-mono tracking-instrument text-[#8D97A6] uppercase mb-1">
          BIOMETRIC AUTHENTICATION GATE
        </span>
        <h1 className="text-lg lg:text-xl font-light tracking-wide text-[#ECE8E1] mb-2">
          ASTRA Medical Interface Online
        </h1>

        {/* Spoken Prompt */}
        <p className="text-xs text-[#8D97A6] max-w-sm mb-6 leading-relaxed">
          Please state or type your crew name to decrypt and unlock telemetry.
        </p>

        {/* Form: Type or Speak Name */}
        <form onSubmit={handleSubmit} className="w-full space-y-3 mb-6">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder='Speak or type: "Vance", "Patel", or "Chen"...'
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/15 text-xs font-mono text-[#ECE8E1] placeholder:text-[#5B6573] focus:outline-none focus:border-[#B8CCE6] transition-colors"
            />
            <button
              type="submit"
              disabled={!typedName.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-[#B8CCE6]/20 hover:bg-[#B8CCE6]/30 text-[#ECE8E1] disabled:opacity-20 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.25} />
            </button>
          </div>
        </form>

        {/* Quick Crew Selection Roster */}
        <div className="w-full">
          <span className="text-[9px] text-[#5B6573] uppercase tracking-wider block mb-2">
            ACTIVE EXPEDITION CREW PROFILES
          </span>
          <div className="grid grid-cols-3 gap-2 text-left">
            {/* Vance */}
            <button
              onClick={() => selectCrew('vance')}
              className="p-3 rounded-lg border border-white/10 hover:border-[#E0BE6A]/50 bg-white/[0.02] hover:bg-[#E0BE6A]/10 transition-all group"
            >
              <div className="text-xs font-medium text-[#ECE8E1] group-hover:text-[#E0BE6A] transition-colors">
                CMDR. A. VANCE
              </div>
              <div className="text-[9px] text-[#8D97A6] mt-0.5">Commander</div>
              <div className="text-[8px] text-[#E0BE6A] mt-1">Caution: Ectopic HR</div>
            </button>

            {/* Patel */}
            <button
              onClick={() => selectCrew('patel')}
              className="p-3 rounded-lg border border-white/10 hover:border-[#6FBF9B]/50 bg-white/[0.02] hover:bg-[#6FBF9B]/10 transition-all group"
            >
              <div className="text-xs font-medium text-[#ECE8E1] group-hover:text-[#6FBF9B] transition-colors">
                SPEC. R. PATEL
              </div>
              <div className="text-[9px] text-[#8D97A6] mt-0.5">EVA Specialist</div>
              <div className="text-[8px] text-[#6FBF9B] mt-1">Nominal: Optimal</div>
            </button>

            {/* Chen */}
            <button
              onClick={() => selectCrew('chen')}
              className="p-3 rounded-lg border border-white/10 hover:border-[#E58F55]/50 bg-white/[0.02] hover:bg-[#E58F55]/10 transition-all group"
            >
              <div className="text-xs font-medium text-[#ECE8E1] group-hover:text-[#E58F55] transition-colors">
                FLT. ENG. M. CHEN
              </div>
              <div className="text-[9px] text-[#8D97A6] mt-0.5">Science Officer</div>
              <div className="text-[8px] text-[#E58F55] mt-1">Warning: Spine/Sleep</div>
            </button>
          </div>
        </div>

        {/* Audio Autoplay Trigger Fallback */}
        <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-white/5 text-[10px] text-[#8D97A6]">
          <div className="flex items-center gap-1.5">
            <Mic className={`w-3 h-3 ${isMicActive ? 'text-[#6FBF9B] animate-pulse' : 'text-[#5B6573]'}`} strokeWidth={1.25} />
            <span>Speech Recognition Listening...</span>
          </div>
          <button
            onClick={() =>
              speakText('ASTRA Medical Interface online. Please state or type your crew name to unlock your telemetry.')
            }
            className="text-[9px] underline hover:text-[#ECE8E1] transition-colors"
          >
            Play ASTRA Audio Prompt
          </button>
        </div>
      </div>
    </div>
  );
};
