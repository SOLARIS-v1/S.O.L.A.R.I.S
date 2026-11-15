import React, { useState, useRef, useEffect } from 'react';
import { useAstra } from '../../context/AstraContext';
import { Send, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

export const AssistantTranscriptPanel: React.FC = () => {
  const {
    astraMode,
    activeCrew,
    transcript,
    sendInput,
    verbalSymptoms,
    setAstraMode,
  } = useAstra();

  const [inputText, setInputText] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    sendInput(inputText.trim());
    setInputText('');
  };

  return (
    <aside className="w-full h-full flex flex-col justify-between p-3 select-none font-mono bg-[#111827]">
      {/* Top Header: Mode + Crew */}
      <div className="flex items-center justify-between pb-2 mb-1.5 hairline-b">
        <div className="flex items-center gap-1.5">
          {/* Mode Indicator */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono tracking-instrument border border-white/20 bg-white/[0.04] text-[#F9FAFB]">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                astraMode === 'NARRATING'
                  ? 'bg-orange-400 animate-ping'
                  : astraMode === 'LISTENING'
                  ? 'bg-emerald-400 animate-pulse'
                  : astraMode === 'MANUAL_MODE'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span>{astraMode}</span>
          </div>

          <div className="px-2 py-0.5 rounded text-[9px] font-mono tracking-instrument border border-white/10 bg-white/[0.02] text-[#94A3B8]">
            {activeCrew ? activeCrew.name : 'UNAUTHENTICATED'}
          </div>
        </div>

        {/* Voice Mode Toggle */}
        <button
          onClick={() => {
            if (astraMode === 'MANUAL_MODE') {
              setAstraMode('LISTENING');
              sendInput('Wake SOLARIS');
            } else {
              sendInput('Read manually');
            }
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono tracking-instrument border border-white/15 bg-white/[0.04] text-[#F9FAFB] hover:bg-white/10 transition-colors"
        >
          {astraMode === 'MANUAL_MODE' ? (
            <>
              <VolumeX className="w-2.5 h-2.5" />
              <span>MANUAL</span>
            </>
          ) : (
            <>
              <Volume2 className="w-2.5 h-2.5" />
              <span>VOICE</span>
            </>
          )}
        </button>
      </div>

      {/* Live Transcript Message Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1 min-h-[140px] max-h-[36vh] scrollbar-thin">
        {transcript.map((item) => (
          <div
            key={item.id}
            className={`p-2.5 rounded-lg text-xs leading-relaxed border transition-all ${
              item.sender === 'astra'
                ? 'bg-[#172030]/60 border-white/[0.08] text-[#F9FAFB]'
                : 'bg-orange-500/10 border-orange-500/30 text-[#F9FAFB] ml-3'
            }`}
          >
            <div className="flex items-center justify-between text-[9px] font-mono text-[#64748B] mb-1">
              <span className={`uppercase font-semibold tracking-wider ${
                item.sender === 'astra' ? 'text-orange-400' : 'text-[#94A3B8]'
              }`}>
                {item.sender === 'astra' ? 'SOLARIS // AI' : 'CREW // VOICE'}
              </span>
              <span>{item.timestamp}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#F9FAFB]">{item.text}</p>
          </div>
        ))}

        <div ref={transcriptEndRef} />
      </div>

      {/* Recommended Countermeasures (Dynamic Causal AI Advice) */}
      <div className="pt-2 hairline-t my-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono tracking-instrument text-[#8D97A6] uppercase">
            RECOMMENDED COUNTERMEASURES
          </span>
          <span className="text-[8px] font-mono text-[#8D97A6] uppercase">
            {verbalSymptoms.spineIssue || verbalSymptoms.sleepIssue ? 'CAUSAL AI' : 'TARGETED'}
          </span>
        </div>

        <div
          className={`p-2.5 rounded-lg border transition-all ${
            verbalSymptoms.spineIssue || verbalSymptoms.sleepIssue
              ? 'border-[#E0BE6A]/50 bg-[#E0BE6A]/10 shadow-[0_0_15px_rgba(224,190,106,0.15)]'
              : 'border-white/[0.08] bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-mono font-medium ${
                verbalSymptoms.spineIssue ? 'text-[#E0BE6A]' : 'text-[#ECE8E1]'
              }`}
            >
              {verbalSymptoms.spineIssue
                ? 'ARED Axial Compression & Light Therapy'
                : 'ARED Bone & Cardiovascular Maintenance'}
            </span>
            <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border border-white/20 bg-white/[0.04] text-[#ECE8E1]">
              HIGH
            </span>
          </div>
          <p className="text-[9.5px] text-[#8D97A6] mt-1 leading-snug">
            {verbalSymptoms.astraAdvice ||
              '20-min ARED axial heel-drop set + 45-min circadian phase-shifting blue light session.'}
          </p>
        </div>
      </div>

      {/* Command Chips Shortcuts & Fallback Input */}
      <div className="pt-2 hairline-t">
        {/* Quick Command Chips */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => sendInput('Sleep SOLARIS')}
            className="px-2 py-0.5 rounded text-[8.5px] font-mono border border-white/10 hover:border-white/20 bg-white/[0.02] text-[#8D97A6] hover:text-[#ECE8E1] transition-colors whitespace-nowrap"
          >
            "Sleep SOLARIS"
          </button>
          <button
            onClick={() => sendInput('Read manually')}
            className="px-2 py-0.5 rounded text-[8.5px] font-mono border border-white/10 hover:border-white/20 bg-white/[0.02] text-[#8D97A6] hover:text-[#ECE8E1] transition-colors whitespace-nowrap"
          >
            "Read manually"
          </button>
          <button
            onClick={() => sendInput('Status')}
            className="px-2 py-0.5 rounded text-[8.5px] font-mono border border-white/10 hover:border-white/20 bg-white/[0.02] text-[#8D97A6] hover:text-[#ECE8E1] transition-colors whitespace-nowrap"
          >
            "Status"
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="flex items-center gap-1.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe symptoms or state command..."
            className="flex-1 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/10 text-[11px] font-mono text-[#ECE8E1] placeholder:text-[#5B6573] focus:outline-none focus:border-[#B8CCE6] transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-[#ECE8E1] disabled:opacity-30 transition-colors"
          >
            <Send className="w-3 h-3" strokeWidth={1.25} />
          </button>
        </form>
      </div>
    </aside>
  );
};
