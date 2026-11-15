import React, { useState } from 'react';
import { useSolaris } from '../../context/SolarisContext';
import { useSolarisVoice } from '../../context/SolarisVoiceContext';
import { Mic, MicOff, Send, ChevronDown, ChevronUp, Sparkles, Volume2 } from 'lucide-react';

export const AstraVoiceHudBar: React.FC = () => {
  const {
    activeCrew,
    lockDashboard,
  } = useSolaris();

  const {
    voiceState,
    providerMode,
    isListening,
    isSpeaking,
    isManualMode,
    currentUtterance,
    transcript,
    sendInput,
    wakeSolaris,
    sleepSolaris,
    toggleManualMode,
  } = useSolarisVoice();

  const [inputVal, setInputVal] = useState('');
  const [isExpanded, setIsExpanded] = useState(false); // Unobtrusive default collapsed

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputVal.trim()) return;
    sendInput(inputVal.trim());
    setInputVal('');
  };

  const getModeBadge = () => {
    if (isManualMode) {
      return {
        label: 'MANUAL MODE',
        color: 'text-amber-800 border-amber-300 bg-amber-50',
        dot: 'bg-amber-500',
      };
    }

    switch (voiceState) {
      case 'speaking':
        return {
          label: 'SPEAKING',
          color: 'text-indigo-700 border-indigo-200 bg-indigo-50 shadow-xs',
          dot: 'bg-indigo-600 animate-pulse',
        };
      case 'listening':
        return {
          label: 'LISTENING',
          color: 'text-emerald-700 border-emerald-200 bg-emerald-50 shadow-xs',
          dot: 'bg-emerald-500 animate-ping',
        };
      case 'processing':
        return {
          label: 'PROCESSING',
          color: 'text-amber-700 border-amber-200 bg-amber-50',
          dot: 'bg-amber-500',
        };
      case 'sleeping':
        return {
          label: 'STANDBY',
          color: 'text-slate-600 border-slate-200 bg-slate-50',
          dot: 'bg-slate-400',
        };
      case 'unavailable':
      case 'error':
        return {
          label: 'OFFLINE',
          color: 'text-rose-700 border-rose-200 bg-rose-50',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: 'ONLINE',
          color: 'text-indigo-700 border-indigo-200 bg-indigo-50/70',
          dot: 'bg-indigo-500',
        };
    }
  };

  const badge = getModeBadge();
  const lastMsg = transcript.length > 0 ? transcript[transcript.length - 1] : null;

  return (
    <div
      className="fixed bottom-3 right-4 z-40 max-w-[calc(100vw-2rem)] select-none font-mono text-[#0F172A] transition-all duration-300"
      style={{ width: isExpanded ? '26rem' : '22rem' }}
    >
      <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-[0_10px_35px_rgba(15,23,42,0.12)] overflow-hidden transition-all duration-300">
        {/* Floating Strip Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50/90 border-b border-slate-200/60 gap-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Click to expand/collapse voice assistant console"
          >
            {/* Status indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono border ${badge.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <span className="font-semibold tracking-instrument">SOLARIS: {badge.label}</span>
            </div>

            {/* Provider Badge */}
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-mono border bg-white border-slate-200 text-slate-600 shadow-2xs">
              <span className={`w-1 h-1 rounded-full ${providerMode === 'local' ? 'bg-indigo-500' : providerMode === 'browser' ? 'bg-amber-500' : 'bg-slate-400'}`} />
              <span>{providerMode === 'local' ? 'Voice: local' : providerMode === 'browser' ? 'Voice: browser (online)' : 'Voice: typed'}</span>
            </span>

            {/* Astronaut Callout if authenticated */}
            {activeCrew ? (
              <span className="text-[10px] font-medium text-slate-700 truncate max-w-[110px] hidden sm:inline">
                {activeCrew.callsign}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold">LOCKED</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mic Toggle Button */}
            <button
              onClick={() => {
                if (isListening) {
                  sleepSolaris();
                } else {
                  wakeSolaris();
                }
              }}
              title={isListening ? 'Stop Listening (Sleep SOLARIS)' : 'Activate Microphone (Wake up, SOLARIS)'}
              className={`p-1.5 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isListening
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>

            {/* Lock / Switch Crew */}
            {activeCrew && (
              <button
                onClick={lockDashboard}
                className="px-2 py-0.5 rounded text-[9px] border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-medium"
                title="Lock Telemetry Console"
              >
                LOCK
              </button>
            )}

            {/* Expand / Minimize Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title={isExpanded ? 'Minimize' : 'Expand Voice Console'}
              aria-label={isExpanded ? 'Minimize Voice Console' : 'Expand Voice Console'}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content Area */}
        {isExpanded && (
          <div className="p-3 space-y-2.5 bg-white">
            {/* Live Utterance / Transcript snippet */}
            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-[11px] leading-relaxed">
              <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                <span className="uppercase tracking-wider font-semibold text-indigo-700 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-indigo-600" />
                  <span>{lastMsg?.sender === 'solaris' ? 'SOLARIS // VOICE AI' : 'CREW // AUDIO'}</span>
                </span>
                <span>{lastMsg?.timestamp || 'LIVE'}</span>
              </div>
              <p className="text-[#0F172A] font-medium line-clamp-2">
                {currentUtterance || lastMsg?.text || 'Awaiting crew command... ("Hey SOLARIS")'}
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">
                VOICE DIRECTIVES
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  onClick={() => sendInput('Wake up, SOLARIS')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-semibold border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 transition-colors whitespace-nowrap"
                >
                  "Wake up, SOLARIS"
                </button>
                <button
                  onClick={() => sendInput('Read my health')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  "Read health"
                </button>
                <button
                  onClick={() => sendInput('Read my heart rate')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  "Heart rate"
                </button>
                <button
                  onClick={() => sendInput('Read my blood pressure')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  "Blood pressure"
                </button>
                <button
                  onClick={() => sendInput('Read my sleep report')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  "Sleep report"
                </button>
                <button
                  onClick={() => sendInput('Show radiation exposure')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  "Radiation report"
                </button>
                <button
                  onClick={() => sendInput('Explain this finding')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  "Explain finding"
                </button>
                <button
                  onClick={() => sendInput('Start health assessment')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-semibold border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                  <span>"Start assessment"</span>
                </button>
                <button
                  onClick={() => sendInput('Start eye test')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                >
                  "Start eye test"
                </button>
                <button
                  onClick={() => sendInput('Open health analytics')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  "Analytics"
                </button>
                <button
                  onClick={() => sendInput('Open medical review')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  "Medical review"
                </button>
                <button
                  onClick={() => toggleManualMode()}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap"
                >
                  {isManualMode ? '"Resume voice"' : '"Manual mode"'}
                </button>
                <button
                  onClick={() => sendInput('Sleep SOLARIS')}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  "Sleep SOLARIS"
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Text Input Fallback Bar — Always Visible so noisy rooms never block demo */}
        <form onSubmit={handleSubmit} className="px-2.5 py-2 bg-white flex items-center gap-1.5 border-t border-slate-100">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="State or type command..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            title="Send command"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AstraVoiceHudBar;
