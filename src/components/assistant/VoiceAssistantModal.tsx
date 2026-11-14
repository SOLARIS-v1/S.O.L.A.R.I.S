import React, { useState, useEffect, useRef } from 'react';
import { useAstraStore } from '../../api/mockClient';
import { localVoiceEngine, VERBAL_ASSESSMENT_STEPS } from '../../services/voiceAssistant';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Bot,
  BrainCircuit,
  CornerDownLeft,
  CheckCircle2,
  ChevronRight,
  Shield,
  Activity,
  Radio,
  FileCheck,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    activeSubjectId,
    crew,
    records,
    findings,
    voiceMessages,
    addVoiceMessage,
  } = useAstraStore();

  const activeAstronaut = crew.find(c => c.id === activeSubjectId) || crew[1];

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');

  // Verbal Assessment Mode State
  const [verbalModeActive, setVerbalModeActive] = useState(false);
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});
  const [assessmentFinished, setAssessmentFinished] = useState(false);

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

      const multiplier = isSpeaking ? 0.75 : isListening ? 0.5 : isProcessing ? 0.35 : 0.2;
      const barCount = 48;
      const barWidth = width / barCount - 1.5;

      ctx.fillStyle = isSpeaking ? '#0284C7' : isListening ? '#10B981' : isProcessing ? '#F59E0B' : '#0EA5E9';

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
  }, [isOpen, isSpeaking, isListening, isProcessing]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [voiceMessages, isProcessing]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    addVoiceMessage({ sender: 'astronaut', text: query });
    setInputText('');
    setIsProcessing(true);
    setIsListening(false);

    if (verbalModeActive && !assessmentFinished) {
      setTimeout(() => {
        const currentQ = VERBAL_ASSESSMENT_STEPS[assessmentStep];
        const newAnswers = { ...assessmentAnswers, [currentQ.field]: query };
        setAssessmentAnswers(newAnswers);

        if (assessmentStep + 1 < VERBAL_ASSESSMENT_STEPS.length) {
          const nextStep = assessmentStep + 1;
          setAssessmentStep(nextStep);
          const nextQ = VERBAL_ASSESSMENT_STEPS[nextStep];
          const responseText = `Recorded: "${query}". Next question: ${nextQ.prompt}`;
          addVoiceMessage({ sender: 'astra', text: responseText });
          setIsProcessing(false);
          setIsSpeaking(true);
          localVoiceEngine.speak(responseText, () => setIsSpeaking(false));
        } else {
          setAssessmentFinished(true);
          const finishText = `All 5 verbal telemetry indicators recorded for ${activeAstronaut.name}. Ready to commit to autonomous health log.`;
          addVoiceMessage({ sender: 'astra', text: finishText });
          setIsProcessing(false);
          setIsSpeaking(true);
          localVoiceEngine.speak(finishText, () => setIsSpeaking(false));
        }
      }, 700);
      return;
    }

    setTimeout(() => {
      const response = localVoiceEngine.processCommand(query, activeAstronaut, records, findings);
      addVoiceMessage({ sender: 'astra', text: response.spokenText });
      setIsProcessing(false);
      setIsSpeaking(true);

      if (response.action === 'navigate_body') {
        navigate('/body');
        onClose();
      } else if (response.action === 'navigate_monitoring') {
        navigate('/monitoring');
        onClose();
      } else if (response.action === 'navigate_assessment') {
        setVerbalModeActive(true);
        setAssessmentStep(0);
        setAssessmentAnswers({});
        setAssessmentFinished(false);
      } else if (response.action === 'navigate_findings') {
        navigate('/intelligence');
        onClose();
      } else if (response.action === 'sleep') {
        setTimeout(onClose, 1500);
      }

      localVoiceEngine.speak(response.spokenText, () => {
        setIsSpeaking(false);
      });
    }, 600);
  };

  const handleStartVerbalAssessment = () => {
    setVerbalModeActive(true);
    setAssessmentStep(0);
    setAssessmentAnswers({});
    setAssessmentFinished(false);
    const firstQ = VERBAL_ASSESSMENT_STEPS[0];
    const initialPrompt = `Starting verbal assessment for ${activeAstronaut.callsign}. ${firstQ.prompt}`;
    addVoiceMessage({ sender: 'astra', text: initialPrompt });
    setIsSpeaking(true);
    localVoiceEngine.speak(initialPrompt, () => setIsSpeaking(false));
  };

  const handleCommitVerbalAssessment = () => {
    setVerbalModeActive(false);
    setAssessmentFinished(false);
    const confirmText = `Verbal assessment successfully committed to your telemetry timeline. Baseline updated.`;
    addVoiceMessage({ sender: 'astra', text: confirmText });
    localVoiceEngine.speak(confirmText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-[#FFFFFF] border border-[#CBD5E1] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header Strip */}
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0EA5E9] flex items-center justify-center text-white shadow-glowCyan">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-[#0F172A] font-mono">
                  ASTRA NEURAL CORE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0284C7] border border-[#0EA5E9]/30 font-bold">
                  OFFLINE LOCAL VAD / QWEN 2.5
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#64748B]">
                Active Profile: <strong className="text-[#0F172A]">{activeAstronaut.name}</strong> ({activeAstronaut.callsign})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localVoiceEngine.stopSpeaking();
                setIsSpeaking(false);
              }}
              className="p-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] text-xs font-mono transition-colors"
              title="Stop speech output"
            >
              {isSpeaking ? <VolumeX className="w-4 h-4 text-[#EF4444]" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                localVoiceEngine.stopSpeaking();
                onClose();
              }}
              className="p-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Real-time Audio Waveform */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col items-center justify-center gap-2">
          <div className="w-full flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-[#0284C7] animate-ping' : isListening ? 'bg-[#10B981] animate-pulse' : 'bg-[#0EA5E9]'}`} />
              <span className="text-[#334155] font-semibold text-[11px]">
                {isSpeaking ? 'ASTRA Speaking (Neural TTS)' : isListening ? 'Listening (Silero VAD / Whisper)' : isProcessing ? 'Processing Telemetry (Qwen 2.5)' : 'Continuous Telemetry Monitoring Active'}
              </span>
            </div>
            <span className="text-[10px] text-[#94A3B8]">16 kHz MONO</span>
          </div>

          {/* Dynamic Waveform Visualizer Canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={44}
            className="w-full h-11 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] shadow-inner"
          />
        </div>

        {/* Conversation Stream */}
        <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[360px] font-mono text-xs">
          {voiceMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'astronaut' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'astra' && (
                <div className="w-7 h-7 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0284C7] shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'astronaut'
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-[#94A3B8]">
                  <span className={msg.sender === 'astronaut' ? 'text-white/80' : 'text-[#64748B]'}>
                    {msg.sender === 'astronaut' ? `${activeAstronaut.callsign}` : 'ASTRA Core'}
                  </span>
                  <span className={msg.sender === 'astronaut' ? 'text-white/70' : 'text-[#94A3B8]'}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-2 items-center text-xs font-mono text-[#0284C7] animate-pulse">
              <Bot className="w-4 h-4" />
              <span>Querying local telemetry tensors...</span>
            </div>
          )}

          {/* Verbal Assessment Wizard */}
          {verbalModeActive && !assessmentFinished && (
            <div className="p-4 rounded-xl bg-[#F0F9FF] border border-[#0EA5E9]/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#0284C7] font-bold">
                  STEP {assessmentStep + 1} OF {VERBAL_ASSESSMENT_STEPS.length}: {VERBAL_ASSESSMENT_STEPS[assessmentStep].title}
                </span>
                <span className="text-[#64748B]">Verbal Protocol</span>
              </div>
              <p className="text-xs font-bold text-[#0F172A]">
                "{VERBAL_ASSESSMENT_STEPS[assessmentStep].prompt}"
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {VERBAL_ASSESSMENT_STEPS[assessmentStep].options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSendMessage(opt)}
                    className="p-2 text-left rounded-lg bg-[#FFFFFF] hover:bg-[#E0F2FE] border border-[#CBD5E1] text-xs text-[#334155] hover:text-[#0284C7] transition-all"
                  >
                    • {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Verbal Assessment Finished Review */}
          {verbalModeActive && assessmentFinished && (
            <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#10B981]/40 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs text-[#059669] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>VERBAL HEALTH ASSESSMENT READY TO COMMIT</span>
              </div>
              <div className="space-y-1 text-xs">
                {VERBAL_ASSESSMENT_STEPS.map(step => (
                  <div key={step.field} className="flex justify-between p-2 rounded bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B]">{step.title}:</span>
                    <strong className="text-[#0F172A]">{assessmentAnswers[step.field] || 'Nominal'}</strong>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setVerbalModeActive(false)}
                  className="px-3 py-1.5 rounded bg-white border border-[#E2E8F0] text-xs text-[#64748B]"
                >
                  Discard
                </button>
                <button
                  onClick={handleCommitVerbalAssessment}
                  className="px-4 py-1.5 rounded bg-[#10B981] text-white font-bold text-xs hover:bg-[#059669] transition-colors"
                >
                  Commit to Health Timeline
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Voice Command Pills */}
        <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px] font-mono">
          <span className="text-[#94A3B8] shrink-0 uppercase">Commands:</span>
          <button
            onClick={() => handleSendMessage('Read my health')}
            className="px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#E0F2FE] text-[#334155] hover:text-[#0284C7] border border-[#CBD5E1] whitespace-nowrap transition-colors"
          >
            "Read my health"
          </button>
          <button
            onClick={() => handleSendMessage('Check my heart')}
            className="px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#E0F2FE] text-[#334155] hover:text-[#0284C7] border border-[#CBD5E1] whitespace-nowrap transition-colors"
          >
            "Check my heart"
          </button>
          <button
            onClick={() => handleSendMessage('Show my body')}
            className="px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#E0F2FE] text-[#334155] hover:text-[#0284C7] border border-[#CBD5E1] whitespace-nowrap transition-colors"
          >
            "Show my body"
          </button>
          <button
            onClick={handleStartVerbalAssessment}
            className="px-2.5 py-1 rounded-full bg-[#0EA5E9]/15 text-[#0284C7] border border-[#0EA5E9]/40 whitespace-nowrap transition-colors flex items-center gap-1 font-bold"
          >
            <Sparkles className="w-3 h-3" />
            <span>"Start assessment"</span>
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#FFFFFF] flex items-center gap-2">
          <button
            onClick={() => {
              if (isListening) {
                setIsListening(false);
              } else {
                setIsListening(true);
                setTimeout(() => {
                  handleSendMessage('Read my health');
                  setIsListening(false);
                }, 2200);
              }
            }}
            className={`p-2.5 rounded-full border transition-all ${
              isListening
                ? 'bg-[#10B981] text-white border-[#10B981] animate-pulse font-bold'
                : 'bg-[#F8FAFC] hover:bg-[#E0F2FE] text-[#0284C7] border-[#0EA5E9]/30'
            }`}
            title="Toggle Push-to-Talk"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Type or speak command (e.g. 'Read my health', 'Check my heart')..."
            className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0EA5E9] font-mono"
          />

          <button
            onClick={() => handleSendMessage()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#38BDF8] text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm"
          >
            <span>Transmit</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
