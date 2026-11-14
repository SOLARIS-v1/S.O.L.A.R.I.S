import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export type OrbState = 'asleep' | 'idle' | 'listening' | 'thinking' | 'speaking';

interface AstraOrbProps {
  state?: OrbState;
  caption?: string;
  subcaption?: string;
  onActivate?: () => void;
}

export const AstraOrb: React.FC<AstraOrbProps> = ({
  state = 'idle',
  caption = 'ASTRA READY // CREW TWIN SYNCHRONIZED',
  subcaption = 'Tap orb or press Space to converse',
  onActivate,
}) => {
  const [internalState, setInternalState] = useState<OrbState>(state);

  useEffect(() => {
    setInternalState(state);
  }, [state]);

  // Handle Space key shortcut to wake / activate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        onActivate?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onActivate]);

  const isAsleep = internalState === 'asleep';
  const isListening = internalState === 'listening';
  const isThinking = internalState === 'thinking';
  const isSpeaking = internalState === 'speaking';
  const isIdle = internalState === 'idle';

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* 1-2 Line Captions above Orb */}
      <div className="mb-2.5 text-center max-w-md px-3 py-1 rounded-full bg-[#06080C]/70 backdrop-blur-sm border border-white/5 transition-opacity duration-300">
        <p className="text-xs font-mono tracking-[0.08em] text-[#ECE8E1] truncate">
          {caption}
        </p>
        {subcaption && (
          <p className="text-[10px] text-[#8D97A6] font-mono tracking-wider mt-0.5 truncate">
            {subcaption}
          </p>
        )}
      </div>

      {/* Interactive Orb Container */}
      <button
        onClick={onActivate}
        className="relative flex items-center justify-center w-16 h-16 rounded-full cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[#B8CCE6]/40 transition-transform active:scale-95"
        aria-label="Astra Voice Orb"
      >
        {/* State: Asleep -> Dim Hollow Ring */}
        {isAsleep && (
          <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition-all duration-500 group-hover:border-white/40">
            <MicOff className="w-4 h-4 text-[#5B6573] group-hover:text-[#8D97A6] transition-colors" strokeWidth={1.25} />
          </div>
        )}

        {/* State: Active (Idle / Listening / Thinking / Speaking) */}
        {!isAsleep && (
          <div className="relative flex items-center justify-center w-14 h-14">
            {/* Outer Acoustic Pulse Waves for Listening / Speaking */}
            {isListening && (
              <div className="absolute inset-0 rounded-full border border-[#B8CCE6]/40 animate-ping" />
            )}

            {/* Ambient Aura Ring */}
            <div
              className={`absolute inset-[-4px] rounded-full blur-md transition-opacity duration-700 ${
                isListening
                  ? 'bg-[#B8CCE6]/30'
                  : isSpeaking
                  ? 'bg-[#A5C8E4]/25'
                  : 'bg-[#B8CCE6]/15'
              }`}
            />

            {/* Luminous Pearl Sphere with Blue-Violet Iridescence */}
            <div
              className={`w-12 h-12 rounded-full transition-all duration-700 relative overflow-hidden ${
                isListening
                  ? 'orb-listening'
                  : isIdle
                  ? 'orb-breathe'
                  : ''
              }`}
              style={{
                background:
                  'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #E6EDF5 30%, #C4D7ED 65%, #9BB4D4 100%)',
                boxShadow:
                  '0 0 24px rgba(184, 204, 230, 0.4), 0 0 50px rgba(142, 138, 184, 0.25), inset -2px -2px 6px rgba(142, 138, 184, 0.4), inset 2px 2px 6px rgba(255, 255, 255, 0.9)',
              }}
            >
              {/* Internal Specular Highlight & Iridescent Shimmer */}
              <div
                className={`absolute inset-0 rounded-full mix-blend-overlay opacity-60 ${
                  isThinking ? 'animate-spin' : ''
                }`}
                style={{
                  background:
                    'conic-gradient(from 45deg, transparent 0%, rgba(184, 204, 230, 0.8) 25%, transparent 50%, rgba(165, 140, 240, 0.6) 75%, transparent 100%)',
                }}
              />

              {/* Faint Core Mic / Audio Glyphs on Hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-70 transition-opacity">
                {isListening ? (
                  <Mic className="w-3.5 h-3.5 text-[#0B1017]" strokeWidth={1.5} />
                ) : isSpeaking ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#0B1017]" strokeWidth={1.5} />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-[#0B1017]" strokeWidth={1.5} />
                )}
              </div>
            </div>
          </div>
        )}
      </button>
    </div>
  );
};
