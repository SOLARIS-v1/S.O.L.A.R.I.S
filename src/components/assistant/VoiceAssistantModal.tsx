import React, { useState, useEffect, useRef } from 'react';
import { useAstraStore } from '../../api/mockClient';
import { useSolarisVoice } from '../../context/SolarisVoiceContext';
import {
  solarisVoiceService,
  CLINICAL_ASSESSMENT_QUESTIONS,
} from '../../services/solarisVoiceService';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Bot,
  BrainCircuit,
  CornerDownLeft,
  CheckCircle2,
  Activity,
  Heart,
  Moon,
  Radio,
  FileCheck,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    voiceState,
    isListening,
    isSpeaking,
    isManualMode,
    currentUtterance,
    interimTranscript,
    transcript,
    assessmentFlow,
    activeAstronaut,
    wakeSolaris,
    sleepSolaris,
    toggleManualMode,
    sendInput,
    stopSpeaking,
    startHealthAssessment,
    cancelHealthAssessment,
    confirmHealthAssessment,
  } = useSolarisVoice();

  const [inputText, setInputText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Audio Waveform animation loop
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      const multiplier = isSpeaking ? 0.75 : isListening ? 0.5 : voiceState === 'processing' ? 0.35 : 0.2;
      const barCount = 48;
      const barWidth = width / barCount - 1.5;

      ctx.fillStyle = isSpeaking ? '#4F46E5' : isListening ? '#10B981' : voiceState === 'processing' ? '#F59E0B' : '#6366F1';

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + 1.5);
        const wave = Math.sin(phase + i * 0.3) * Math.cos(phase * 0.5 + i * 0.15);
        const barH = Math.max(4, Math.abs(wave) * mid * multiplier * (0.8 + Math.random() * 0.4));
        ctx.fillRect(x, mid - barH / 2, barWidth, barH);
      }

      phase += isSpeaking ? 0.12 : isListening ? 0.08 : 0.04;
      animId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isSpeaking, isListening, voiceState]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;
    sendInput(query.trim());
    setInputText('');
  };

  const getStatusBadge = () => {
    switch (voiceState) {
      case 'speaking':
        return { label: 'SPEAKING', bg: 'bg-indigo-50 border-indigo-200 text-indigo-700' };
      case 'listening':
        return { label: 'LISTENING', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
      case 'processing':
        return { label: 'PROCESSING', bg: 'bg-amber-50 border-amber-200 text-amber-700' };
      case 'manual_mode':
        return { label: 'MANUAL MODE', bg: 'bg-slate-100 border-slate-200 text-slate-700' };
      case 'sleeping':
        return { label: 'SLEEPING', bg: 'bg-slate-50 border-slate-200 text-slate-600' };
      case 'unavailable':
      case 'error':
        return { label: 'OFFLINE / FALLBACK', bg: 'bg-rose-50 border-rose-200 text-rose-700' };
      default:
        return { label: 'ONLINE', bg: 'bg-indigo-50/70 border-indigo-200 text-indigo-700' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200/90 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-[#0F172A]">
        {/* Header Strip */}
        <div className="p-4 border-b border-slate-200/70 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide font-mono text-[#0F172A]">
                  SOLARIS VOICE INTELLIGENCE
                </span>
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500">
                Astronaut: <strong className="text-[#0F172A]">{activeAstronaut?.name || 'Astronaut'}</strong> ({activeAstronaut?.callsign || 'CREW'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleManualMode()}
              className={`p-2 rounded-lg border text-xs font-mono transition-colors ${
                isManualMode
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
              title={isManualMode ? 'Resume Voice Mode' : 'Switch to Manual Mode'}
            >
              {isManualMode ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Real-time Audio Waveform */}
        <div className="px-6 py-3.5 bg-slate-50/60 border-b border-slate-200/70 flex flex-col items-center justify-center gap-2">
          <div className="w-full flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-indigo-600 animate-ping' : isListening ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-[#0F172A] font-semibold text-[11px]">
                {isSpeaking ? 'SOLARIS Speaking (Neural Voice Synthesis)' : isListening ? 'SOLARIS Listening (Speech Recognition)' : voiceState === 'manual_mode' ? 'Manual Mode (Silent Inspection)' : 'SOLARIS Standby — Grounded Mission Telemetry'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">16 kHz AEROSPACE AUDIO</span>
          </div>

          {/* Dynamic Waveform Visualizer Canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={44}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 shadow-inner"
          />
        </div>

        {/* Conversation Stream */}
        <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[360px] font-mono text-xs bg-slate-50/30">
          {transcript.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'astronaut' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'solaris' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'astronaut'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-[#0F172A] border border-slate-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[10px]">
                  <span className={msg.sender === 'astronaut' ? 'text-indigo-100 font-semibold' : 'text-indigo-600 font-semibold'}>
                    {msg.sender === 'astronaut' ? `${activeAstronaut?.callsign || 'ASTRONAUT'}` : 'SOLARIS // AI'}
                  </span>
                  <span className={msg.sender === 'astronaut' ? 'text-indigo-200' : 'text-slate-400'}>
                    {msg.timestamp}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {/* Interim Real-time Speech Transcription */}
          {interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed bg-indigo-50 border border-indigo-200 text-indigo-800 italic">
                <span>Listening: "{interimTranscript}..."</span>
              </div>
            </div>
          )}

          {/* Conversational Assessment Interactive Box */}
          {assessmentFlow.isActive && (
            <div className="p-4 rounded-xl bg-white border border-indigo-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-700 font-bold">
                  CONVERSATIONAL HEALTH ASSESSMENT — STEP {assessmentFlow.currentStepIndex + 1} OF {CLINICAL_ASSESSMENT_QUESTIONS.length}
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase font-bold tracking-wider">
                  {assessmentFlow.stage}
                </span>
              </div>

              {assessmentFlow.currentQuestion && (
                <p className="text-xs font-semibold text-[#0F172A]">
                  "{assessmentFlow.currentQuestion.question}"
                </p>
              )}

              {assessmentFlow.stage === 'awaiting_confirmation' && (
                <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-[#0F172A] space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Summary Prepared: Ready to Save to Medical Record</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{assessmentFlow.summaryText}</p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={cancelHealthAssessment}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmHealthAssessment}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      Confirm & Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Voice Command Pills */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px] font-mono">
          <span className="text-slate-500 shrink-0 uppercase text-[10px] font-bold">Directives:</span>
          <button
            onClick={() => handleSendMessage('Wake up, SOLARIS')}
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium whitespace-nowrap transition-colors"
          >
            "Wake up, SOLARIS"
          </button>
          <button
            onClick={() => handleSendMessage('Read my health')}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap transition-colors"
          >
            "Read my health"
          </button>
          <button
            onClick={() => handleSendMessage('Read my heart rate')}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap transition-colors"
          >
            "Read my heart rate"
          </button>
          <button
            onClick={() => handleSendMessage('Read my blood pressure')}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap transition-colors"
          >
            "Read my blood pressure"
          </button>
          <button
            onClick={() => handleSendMessage('Read my sleep report')}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap transition-colors"
          >
            "Read my sleep report"
          </button>
          <button
            onClick={() => handleSendMessage('Show radiation exposure')}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap transition-colors"
          >
            "Show radiation exposure"
          </button>
          <button
            onClick={() => handleSendMessage('Explain this finding')}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap transition-colors"
          >
            "Explain this finding"
          </button>
          <button
            onClick={() => handleSendMessage('Start eye test')}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium whitespace-nowrap transition-colors flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            <span>"Start eye test"</span>
          </button>
          <button
            onClick={startHealthAssessment}
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold whitespace-nowrap transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>"Start health assessment"</span>
          </button>
          <button
            onClick={() => handleSendMessage('Sleep SOLARIS')}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium whitespace-nowrap transition-colors"
          >
            "Sleep SOLARIS"
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <button
            onClick={() => {
              if (isListening) {
                solarisVoiceService.stopListening();
              } else {
                solarisVoiceService.startListening();
              }
            }}
            className={`p-2.5 rounded-full border transition-all ${
              isListening
                ? 'bg-emerald-600 text-white border-emerald-600 animate-pulse font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Toggle Continuous Microphone"
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Speak or type command (e.g. 'Read my health', 'Wake up, SOLARIS')..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono transition-colors"
          />

          <button
            onClick={() => handleSendMessage()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs"
          >
            <span>Transmit</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
