import React, { useState } from 'react';
import { useAstraStore } from '../api/mockClient';
import {
  Settings,
  BrainCircuit,
  Volume2,
  Mic,
  Database,
  HardDriveDownload,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Server,
  Sliders,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { resetAll } = useAstraStore();
  const [llamaEndpoint, setLlamaEndpoint] = useState('http://127.0.0.1:8080/v1');
  const [modelName, setModelName] = useState('Qwen/Qwen2.5-7B-Instruct-GGUF');
  const [ttsVoice, setTtsVoice] = useState('en_US-lessac-medium');
  const [vadSensitivity, setVadSensitivity] = useState(0.5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-[1720px] mx-auto space-y-6 font-mono text-slate-800 text-xs">
      {/* Header */}
      <div className="clinical-card p-4 px-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0EA5E9] flex items-center justify-center text-white shadow-glowCyan">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
              ASTRA System Settings & Neural Core Configuration
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Offline Inference Server • Speech Activity Tuning • Local Data Storage
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#059669] font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Local AI Engine (Qwen 2.5 via llama.cpp) */}
        <div className="clinical-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-[#0EA5E9]" />
              <span className="font-bold text-[#0F172A] uppercase">
                Local Conversational AI Engine (llama.cpp)
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#059669] font-bold">
              STANDALONE OFFLINE
            </span>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] text-[#64748B] uppercase font-bold">Local Inference Endpoint (OpenAI API Compatible)</label>
              <input
                type="text"
                value={llamaEndpoint}
                onChange={e => setLlamaEndpoint(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-[#64748B] uppercase font-bold">Quantized Model Identifier</label>
              <input
                type="text"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              ASTRA executes 100% locally on spacecraft hardware without external cloud APIs. When llama.cpp is not connected locally, the built-in deterministic browser neural engine handles all telemetry intents.
            </p>
          </div>
        </div>

        {/* Voice Architecture (Piper TTS & Silero VAD) */}
        <div className="clinical-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#0EA5E9]" />
              <span className="font-bold text-[#0F172A] uppercase">
                Neural Speech Synthesis & VAD Tuning
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0284C7] font-bold">
              PIPER ONNX
            </span>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] text-[#64748B] uppercase font-bold">Piper Offline Voice Profile</label>
              <select
                value={ttsVoice}
                onChange={e => setTtsVoice(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              >
                <option value="en_US-lessac-medium">en_US-lessac-medium (Calm Aerospace Operator)</option>
                <option value="en_US-amy-medium">en_US-amy-medium (Clear Analytical)</option>
                <option value="en_GB-alan-low">en_GB-alan-low (Deep Resonant Technical)</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-[#64748B] uppercase font-bold">Silero VAD Speech Trigger Sensitivity</label>
                <span className="text-[#0284C7] font-bold">{vadSensitivity}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={vadSensitivity}
                onChange={e => setVadSensitivity(parseFloat(e.target.value))}
                className="w-full accent-[#0284C7]"
              />
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Speech activity detection (Silero VAD) runs zero-latency chunking on microphone input to prevent accidental activations from background habitat ECLSS ventilation hum.
            </p>
          </div>
        </div>
      </div>

      {/* Local Storage & Reset Section */}
      <div className="clinical-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#0F172A] uppercase flex items-center gap-2">
            <Database className="w-4 h-4 text-[#F59E0B]" />
            <span>Local Storage & Deterministic Telemetry Database</span>
          </span>
          <p className="text-xs text-[#64748B] mt-0.5">
            Reset 30-day simulated records, findings status cache, and restore default mission seeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] border border-[#FCA5A5] font-bold text-xs uppercase transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset To Default Seeds</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs uppercase transition-colors shadow-sm shadow-glowCyan"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
