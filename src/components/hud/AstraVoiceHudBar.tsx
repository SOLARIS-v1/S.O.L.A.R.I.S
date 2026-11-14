import React, { useState } from 'react';
import { useAstra } from '../../context/AstraContext';
import { Mic, MicOff, Send, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export const AstraVoiceHudBar: React.FC = () => {
  const {
    activeCrew,
    astraMode,
    currentUtterance,
    transcript,
    isMicActive,
    toggleMic,
    sendInput,
    lockDashboard,
  } = useAstra();

  const [inputVal, setInputVal] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputVal.trim()) return;
    sendInput(inputVal.trim());
    setInputVal('');
  };

  const getModeBadge = () => {
    switch (astraMode) {
      case 'NARRATING':
        return {
          label: 'NARRATING',
          color: 'text-[#B8CCE6] border-[#B8CCE6]/40 bg-[#B8CCE6]/10',
          dot: 'bg-[#B8CCE6] animate-ping',
        };
      case 'LISTENING':
        return {
          label: 'LISTENING',
          color: 'text-[#6FBF9B] border-[#6FBF9B]/40 bg-[#6FBF9B]/10',
          dot: 'bg-[#6FBF9B] animate-pulse',
        };
      case 'MANUAL_MODE':
        return {
          label: 'MANUAL MODE',
          color: 'text-[#E0BE6A] border-[#E0BE6A]/40 bg-[#E0BE6A]/10',
          dot: 'bg-[#E0BE6A]',
        };
      case 'SLEEPING':
        return {
          label: 'SLEEPING',
          color: 'text-[#8D97A6] border-white/10 bg-white/[0.02]',
          dot: 'bg-[#5B6573]',
        };
      default:
        return {
          label: 'AUTH GATE',
          color: 'text-[#ECE8E1] border-white/20 bg-white/5',
          dot: 'bg-[#ECE8E1]',
        };
    }
  };

  const badge = getModeBadge();
  const lastMsg = transcript.length > 0 ? transcript[transcript.length - 1] : null;

  return (
    <div className="fixed bottom-2 right-4 z-40 w-96 max-w-[calc(100vw-2rem)] select-none font-mono text-[#ECE8E1]">
      <div className="rounded-xl border border-white/10 bg-[#0B1017]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300">
        {/* Top Floating Strip Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono border ${badge.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <span className="font-medium tracking-instrument">{badge.label}</span>
            </div>

            {/* Astronaut Callout if authenticated */}
            {activeCrew ? (
              <span className="text-[9px] text-[#8D97A6] truncate max-w-[120px]">
                {activeCrew.callsign}
              </span>
            ) : (
              <span className="text-[9px] text-[#5B6573]">LOCKED</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mic Toggle Button */}
            <button
              onClick={toggleMic}
              title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
              className={`p-1 rounded-md border transition-colors ${
                isMicActive
                  ? 'border-white/20 bg-white/10 text-[#6FBF9B] hover:bg-white/20'
                  : 'border-white/10 bg-white/[0.02] text-[#5B6573] hover:text-[#ECE8E1]'
              }`}
            >
              {isMicActive ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            </button>

            {/* Lock / Switch Crew */}
            {activeCrew && (
              <button
                onClick={lockDashboard}
                className="px-1.5 py-0.5 rounded text-[8px] border border-white/10 hover:border-white/25 text-[#8D97A6] hover:text-[#ECE8E1] transition-colors"
              >
                LOCK
              </button>
            )}

            {/* Expand / Minimize Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md hover:bg-white/10 text-[#8D97A6] hover:text-[#ECE8E1] transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content Area */}
        {isExpanded && (
          <div className="p-3 space-y-2.5">
            {/* Live Utterance / Transcript snippet */}
            <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10.5px] leading-relaxed">
              <div className="flex items-center justify-between text-[8px] text-[#5B6573] mb-0.5">
                <span className="uppercase tracking-wider text-[#8D97A6]">
                  {lastMsg?.sender === 'astra' ? 'ASTRA // AI' : 'CREW // VOICE'}
                </span>
                <span>{lastMsg?.timestamp || 'SYNC'}</span>
              </div>
              <p className="text-[#ECE8E1] line-clamp-2">
                {currentUtterance || lastMsg?.text || 'Awaiting crew command...'}
              </p>
            </div>

            {/* Quick Demo Action Chips (Single-click triggers for live demo) */}
            <div className="space-y-1">
              <span className="text-[8px] text-[#5B6573] uppercase tracking-wider block">
                QUICK DEMO COMMANDS
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  onClick={() => sendInput('Commander Vance')}
                  className="px-2 py-0.5 rounded text-[8.5px] border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.08] text-[#8D97A6] hover:text-[#ECE8E1] transition-colors whitespace-nowrap"
                >
                  "Commander Vance"
                </button>
                <button
                  onClick={() => sendInput("My back hurts & I couldn't sleep")}
                  className="px-2 py-0.5 rounded text-[8.5px] border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.08] text-[#8D97A6] hover:text-[#ECE8E1] transition-colors whitespace-nowrap"
                >
                  "My back hurts & I couldn't sleep"
                </button>
                <button
                  onClick={() => sendInput('Read manually')}
                  className="px-2 py-0.5 rounded text-[8.5px] border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.08] text-[#8D97A6] hover:text-[#ECE8E1] transition-colors whitespace-nowrap"
                >
                  "Read manually"
                </button>
                <button
                  onClick={() => sendInput('Sleep ASTRA')}
                  className="px-2 py-0.5 rounded text-[8.5px] border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.08] text-[#8D97A6] hover:text-[#ECE8E1] transition-colors whitespace-nowrap"
                >
                  "Sleep ASTRA"
                </button>
              </div>
            </div>

            {/* Text Input Fallback Bar */}
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5 pt-0.5">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="State or type command..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-[10.5px] text-[#ECE8E1] placeholder:text-[#5B6573] focus:outline-none focus:border-[#B8CCE6] transition-colors"
              />
              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="p-1.5 rounded-lg bg-[#B8CCE6]/20 hover:bg-[#B8CCE6]/30 text-[#ECE8E1] disabled:opacity-20 transition-colors border border-[#B8CCE6]/30"
              >
                <Send className="w-3 h-3" strokeWidth={1.25} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
