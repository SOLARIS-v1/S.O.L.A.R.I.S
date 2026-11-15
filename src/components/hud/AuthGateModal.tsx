import React, { useState } from 'react';
import { useAstra } from '../../context/AstraContext';
import { Lock, Mic, ArrowRight, UserCheck } from 'lucide-react';

export const AuthGateModal: React.FC = () => {
  const { activeCrew, selectCrew, sendInput, isMicActive } = useAstra();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md select-none animate-in fade-in duration-300 font-sans">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200/90 shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-7 sm:p-9 flex flex-col items-center text-center text-slate-800 relative overflow-hidden">
        {/* Subtle Top Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-[#5850EC] to-indigo-400" />

        {/* Solaris Official Mission Logo */}
        <div className="relative mb-4">
          <img
            src="/solaris-logo.png"
            alt="SOLARIS Mission Logo"
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-md"
          />
          {isMicActive && (
            <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500 animate-ping opacity-60 pointer-events-none" />
          )}
        </div>

        {/* Title */}
        <span className="text-[10px] font-mono tracking-wider text-indigo-600 uppercase font-bold mb-1">
          BIOMETRIC AUTHENTICATION GATE
        </span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
          SOLARIS Clinical Console
        </h1>

        {/* Spoken Prompt */}
        <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
          Please select or state your astronaut profile to unlock real-time physiological telemetry.
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
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!typedName.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#5850EC] hover:bg-[#4F46E5] text-white disabled:opacity-30 transition-all shadow-sm"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Quick Crew Selection Roster */}
        <div className="w-full">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-2.5">
            EXPEDITION CREW PROFILES
          </span>
          <div className="grid grid-cols-3 gap-2.5 text-left">
            {/* Vance */}
            <button
              onClick={() => selectCrew('vance')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 transition-all group shadow-2xs"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Cmdr. Vance
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Commander</div>
              <div className="text-[9px] text-amber-600 font-medium mt-1 font-mono">Ectopic HR</div>
            </button>

            {/* Patel */}
            <button
              onClick={() => selectCrew('patel')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 transition-all group shadow-2xs"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Spec. Patel
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">EVA Specialist</div>
              <div className="text-[9px] text-emerald-600 font-medium mt-1 font-mono">Nominal</div>
            </button>

            {/* Chen */}
            <button
              onClick={() => selectCrew('chen')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 transition-all group shadow-2xs"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Eng. Chen
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Flight Engineer</div>
              <div className="text-[9px] text-rose-600 font-medium mt-1 font-mono">Sleep Deficit</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthGateModal;
