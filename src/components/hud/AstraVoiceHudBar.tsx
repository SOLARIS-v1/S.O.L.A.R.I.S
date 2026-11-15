import React, { useState, useRef, useEffect } from 'react';
import { useSolaris } from '../../context/SolarisContext';
import { useSolarisVoice } from '../../context/SolarisVoiceContext';
import {
  Mic,
  MicOff,
  Send,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Volume2,
  Minus,
  Maximize2,
  Minimize2,
  Trash2,
  User,
  HeartPulse,
  Dna,
  Compass,
  Users,
  MessageSquare,
  Activity,
} from 'lucide-react';

interface CommandChip {
  label: string;
  command: string;
  icon?: React.ReactNode;
}

const COMMAND_CATEGORIES: Record<string, { label: string; icon: React.ReactNode; chips: CommandChip[] }> = {
  quick: {
    label: '⭐ Quick Commands',
    icon: <Sparkles className="w-3 h-3 text-amber-500" />,
    chips: [
      { label: 'Read my vitals', command: 'Read my readings' },
      { label: 'What is my blood pressure?', command: "What's my blood pressure?" },
      { label: 'How did I sleep?', command: 'How was my sleep?' },
      { label: 'Show heart in 3D', command: 'Show my heart' },
      { label: 'Start daily check-in', command: 'Start daily check-in' },
      { label: 'Compare sleep & HR', command: 'Compare sleep and heart rate' },
    ],
  },
  telemetry: {
    label: '❤️ Telemetry',
    icon: <HeartPulse className="w-3 h-3 text-rose-500" />,
    chips: [
      { label: "What's my heart rate?", command: "What's my heart rate?" },
      { label: 'Explain ectopic jumps', command: 'Explain ectopic heart beats' },
      { label: 'Check radiation exposure', command: 'Is radiation level safe?' },
      { label: 'What is my oxygen level?', command: 'What is my SpO2?' },
      { label: 'Check core temperature', command: 'What is my temperature?' },
      { label: 'Log BP 120/80', command: 'My blood pressure is 120 over 80' },
    ],
  },
  body: {
    label: '🧬 3D Digital Twin',
    icon: <Dna className="w-3 h-3 text-indigo-500" />,
    chips: [
      { label: 'Show heart', command: 'Show my heart' },
      { label: 'Show lungs', command: 'Show my lungs' },
      { label: 'Inspect spine', command: 'Show my spine' },
      { label: 'Rotate left', command: 'Rotate left' },
      { label: 'Zoom in', command: 'Zoom in' },
      { label: 'Reset camera view', command: 'Reset view' },
      { label: 'X-Ray view', command: 'x ray view' },
    ],
  },
  navigation: {
    label: '🧭 Navigation',
    icon: <Compass className="w-3 h-3 text-emerald-500" />,
    chips: [
      { label: 'Mission Stage', command: 'Go to stage' },
      { label: '3D Body Explorer', command: 'Show body explorer' },
      { label: 'Analytics & Trends', command: 'Open health analytics' },
      { label: 'Daily Check-in', command: 'Start check-in' },
      { label: 'SANS Eye Test', command: 'Start eye test' },
      { label: 'Exercise Countermeasures', command: 'Open exercise' },
      { label: 'Medical Review', command: 'Open medical review' },
    ],
  },
  crew: {
    label: '👨‍🚀 Crew & Sim',
    icon: <Users className="w-3 h-3 text-sky-500" />,
    chips: [
      { label: 'Switch to Chen', command: 'Switch to Chen' },
      { label: 'Switch to Vance', command: 'Switch to Vance' },
      { label: 'Switch to Patel', command: 'Switch to Patel' },
      { label: 'How is Chen doing?', command: 'How is Chen?' },
      { label: 'How is Vance doing?', command: 'How is Vance?' },
      { label: 'Open kinematics simulator', command: 'Open simulator' },
      { label: 'Open mission tasks', command: 'Open tasks' },
    ],
  },
};

export const SolarisVoiceHudBar: React.FC = () => {
  const { activeCrew, lockDashboard } = useSolaris();

  const {
    voiceState,
    providerMode,
    isListening,
    isSpeaking,
    isManualMode,
    speechLoudness,
    currentUtterance,
    transcript,
    sendInput,
    wakeSolaris,
    sleepSolaris,
    toggleListening,
    speak,
  } = useSolarisVoice();

  const [inputVal, setInputVal] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLarge, setIsLarge] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('quick');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat messages to bottom
  useEffect(() => {
    if (isExpanded && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, currentUtterance, isExpanded, isMinimized]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputVal.trim()) return;
    sendInput(inputVal.trim());
    setInputVal('');
  };

  const handleChipClick = (cmd: string) => {
    sendInput(cmd);
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
          label: 'THINKING',
          color: 'text-amber-700 border-amber-200 bg-amber-50',
          dot: 'bg-amber-500',
        };
      case 'sleeping':
        return {
          label: 'STANDBY',
          color: 'text-slate-600 border-slate-200 bg-slate-50',
          dot: 'bg-slate-400',
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

  // If minimized into a floating bottom-right capsule pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40 select-none font-sans animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
          <img
            src="/solaris-logo.png"
            alt="SOLARIS Logo"
            className="w-5 h-5 rounded-lg object-cover border border-slate-200"
          />
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${badge.dot}`} />
            <span className="text-xs font-bold text-slate-800 font-mono tracking-tight">SOLARIS</span>
          </div>

          <button
            onClick={() => toggleListening()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isListening
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 animate-pulse'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
            title={isListening ? 'Stop Speaking / Transcribe' : 'Start Speaking'}
          >
            {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Open Chat</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-3 right-3 sm:right-5 z-40 select-none font-sans text-slate-800 transition-all duration-300 ease-in-out ${
        isExpanded
          ? isLarge
            ? 'w-[96vw] sm:w-[600px] h-[640px] max-h-[90vh]'
            : 'w-[94vw] sm:w-[480px] h-[550px] max-h-[82vh]'
          : 'w-[92vw] sm:w-[380px] h-auto'
      }`}
    >
      <div className="w-full h-full rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(15,23,42,0.16)] flex flex-col overflow-hidden transition-all duration-300 relative">
        {/* Top Accent Gradient Header */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-[#5850EC] to-indigo-400" />

        {/* 1. Header Bar */}
        <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/70 gap-2 shrink-0">
          {/* Left: Identity & State Badge */}
          <div
            className="flex items-center gap-2 min-w-0 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Click to toggle expanded chat console"
          >
            <img
              src="/solaris-logo.png"
              alt="SOLARIS"
              className="w-6 h-6 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate tracking-tight">
                  SOLARIS AI
                </span>
                <span className={`px-2 py-0.2 rounded-full text-[8.5px] font-mono border font-bold ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                {activeCrew ? `${activeCrew.name} (${activeCrew.callsign})` : 'Awaiting Login'}
              </span>
            </div>
          </div>

          {/* Right: Controls (Mic, Large, Minimize, Collapse) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Mic Toggle Button */}
            <button
              onClick={() => {
                if (isListening) sleepSolaris();
                else wakeSolaris();
              }}
              title={isListening ? "Say 'Sleep Solaris' or click to mute" : 'Click or tap Space to speak'}
              className={`p-1.5 rounded-xl border transition-all ${
                isListening
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm animate-pulse'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {isListening ? <Mic className="w-3.5 h-3.5 text-emerald-600" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>

            {/* Lock Console / Logout */}
            {activeCrew && (
              <button
                onClick={lockDashboard}
                className="px-2 py-1 rounded-lg text-[9px] font-mono font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                title="Lock Console / Return to Login"
              >
                LOCK
              </button>
            )}

            {/* Size Toggle (if expanded) */}
            {isExpanded && (
              <button
                onClick={() => setIsLarge(!isLarge)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors hidden sm:inline-flex"
                title={isLarge ? 'Normal Size' : 'Enlarge Chat'}
              >
                {isLarge ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Expand / Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {/* Minimize to Pill */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Minimize to floating pill"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Chat Conversation History Area (when expanded) */}
        {isExpanded && (
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-gradient-to-b from-slate-50/50 to-white scrollbar-thin">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <img
                  src="/solaris-logo.png"
                  alt="SOLARIS"
                  className="w-12 h-12 rounded-2xl opacity-60 border border-slate-200 mb-1"
                />
                <h4 className="text-xs font-bold text-slate-700">SOLARIS Medical Intelligence</h4>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Ask anything about your vital signs, 3D anatomical twin, mission telemetry, or clinical guidance.
                </p>
              </div>
            ) : (
              transcript.map((msg) => {
                const isSolaris = msg.sender === 'solaris';
                const isSystem = msg.sender === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600 flex items-center gap-1 shadow-2xs">
                        <Activity className="w-3 h-3 text-indigo-500" />
                        <span>{msg.text}</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isSolaris ? 'justify-start' : 'justify-end'}`}
                  >
                    {isSolaris && (
                      <div className="w-7 h-7 rounded-full bg-white border border-slate-200 p-0.5 shadow-2xs shrink-0 flex items-center justify-center mt-0.5">
                        <img
                          src="/solaris-logo.png"
                          alt="AI"
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm transition-all ${
                        isSolaris
                          ? 'bg-white border border-slate-200/90 text-slate-800'
                          : 'bg-[#5850EC] text-white shadow-indigo-500/10'
                      }`}
                    >
                      {/* Sender Tag & Timestamp */}
                      <div
                        className={`flex items-center justify-between text-[9px] font-mono mb-1 gap-2 ${
                          isSolaris ? 'text-indigo-600' : 'text-indigo-200'
                        }`}
                      >
                        <span className="font-bold uppercase tracking-wider">
                          {isSolaris ? 'SOLARIS' : activeCrew?.callsign || 'ASTRONAUT'}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Message Content */}
                      <div className="whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed">
                        {msg.text}
                      </div>

                      {/* Re-speak Action for Solaris Messages */}
                      {isSolaris && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                          <button
                            onClick={() => speak(msg.text)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-mono font-medium flex items-center gap-1 transition-colors"
                            title="Replay spoken audio"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Replay Audio</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {!isSolaris && (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Current Active Utterance Banner */}
            {currentUtterance && isSpeaking && (
              <div className="p-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2 animate-pulse">
                <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-medium truncate">{currentUtterance}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 3. Interactive Command Chips Drawer (The user requested: "show some commands on the chat") */}
        {isExpanded && (
          <div className="border-t border-slate-200/70 bg-slate-50/95 p-2 sm:p-2.5 space-y-2 shrink-0">
            {/* Category Selector Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
              {Object.entries(COMMAND_CATEGORIES).map(([catKey, cat]) => (
                <button
                  key={catKey}
                  onClick={() => setActiveCategory(catKey)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
                    activeCategory === catKey
                      ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200 font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Active Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {COMMAND_CATEGORIES[activeCategory]?.chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip.command)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-medium bg-white hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition-all shadow-2xs whitespace-nowrap active:scale-95 cursor-pointer"
                  title={`Speak or execute: "${chip.command}"`}
                >
                  "{chip.label}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Bottom Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-2 sm:p-2.5 bg-white border-t border-slate-200/80 flex items-center gap-2 shrink-0"
        >
          {/* Main Action Microphone */}
          <button
            type="button"
            onClick={() => toggleListening()}
            title={isListening ? 'Stop Speaking & Transcribe' : 'Start Speaking (Microphone)'}
            className={`p-2.5 rounded-2xl transition-all cursor-pointer relative ${
              isListening
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300 animate-pulse'
                : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600'
            }`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Live Soundwave Loudness Meter (Visible when Listening) */}
          {isListening && (
            <div className="flex items-center gap-0.5 px-1 py-1" title="Microphone Level">
              {[0.6, 1.2, 0.9, 1.4].map((multiplier, idx) => {
                const height = Math.max(4, Math.min(20, Math.round(speechLoudness * 24 * multiplier)));
                return (
                  <div
                    key={idx}
                    style={{ height: `${height}px` }}
                    className="w-1 bg-emerald-500 rounded-full transition-all duration-75"
                  />
                );
              })}
            </div>
          )}

          {/* Text Input */}
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={
              isListening
                ? 'Listening to your voice... Speak now or click mic to submit'
                : voiceState === 'processing'
                ? 'Solaris is processing...'
                : 'Ask Solaris anything (or speak with microphone)...'
            }
            className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2.5 rounded-2xl bg-[#5850EC] hover:bg-[#4F46E5] text-white disabled:opacity-30 transition-all shadow-sm shadow-indigo-500/20 cursor-pointer disabled:cursor-not-allowed"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export const AstraVoiceHudBar = SolarisVoiceHudBar;
export default SolarisVoiceHudBar;
