import React, { useState, useEffect } from 'react';
import { useAstra } from '../context/AstraContext';
import { Heart, Thermometer, Activity, Info, Plus, Minus, ArrowRight, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CheckInPage: React.FC = () => {
  const { activeCrew, verbalSymptoms } = useAstra();

  const [step, setStep] = useState<number>(1);
  const [showHowToMeasure, setShowHowToMeasure] = useState<boolean>(false);

  // Vitals State pre-filled from activeCrew or verbal report
  const [heartRate, setHeartRate] = useState<number>(activeCrew?.vitals.heartRate || 78);
  const [coreTemp, setCoreTemp] = useState<number>(activeCrew?.vitals.coreTemp || 37.1);
  const [bpSys, setBpSys] = useState<number>(118);
  const [bpDia, setBpDia] = useState<number>(76);

  // Step 2-4 States
  const [sleepHours, setSleepHours] = useState<number>(
    verbalSymptoms.sleepIssue ? 4.6 : activeCrew?.vitals.sleepHours || 6.8
  );
  const [fatigueLevel, setFatigueLevel] = useState<number>(verbalSymptoms.sleepIssue ? 4 : 2);
  const [moodLevel, setMoodLevel] = useState<number>(verbalSymptoms.spineIssue ? 2 : 4);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Sync state whenever activeCrew or verbalSymptoms update in real time
  useEffect(() => {
    if (activeCrew) {
      setHeartRate(activeCrew.vitals.heartRate);
      setCoreTemp(activeCrew.vitals.coreTemp);
      setSleepHours(verbalSymptoms.sleepIssue ? 4.6 : activeCrew.vitals.sleepHours);
    }
    if (verbalSymptoms.sleepIssue) {
      setFatigueLevel(4);
    }
  }, [activeCrew, verbalSymptoms]);

  const handleNext = () => {
    if (step < 4) {
      setStep((prev) => prev + 1);
    } else {
      setSubmitted(true);
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#6FBF9B', '#B8CCE6', '#E0BE6A'],
      });
    }
  };

  return (
    <div className="w-full h-full max-w-5xl mx-auto flex flex-col justify-between p-3 lg:p-6 select-none font-mono text-[#ECE8E1]">
      {/* Subheader */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium tracking-wide text-[#ECE8E1] uppercase">
              DAILY HEALTH CHECK-IN
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border"
              style={{
                borderColor: activeCrew ? activeCrew.badgeColor : 'rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: activeCrew ? activeCrew.badgeColor : '#ECE8E1',
              }}
            >
              {activeCrew ? activeCrew.name : 'AUTHENTICATION REQUIRED'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#8D97A6]">
            <button
              onClick={() => setShowHowToMeasure(!showHowToMeasure)}
              className="flex items-center gap-1 hover:text-[#ECE8E1] transition-colors"
            >
              <Info className="w-3.5 h-3.5" strokeWidth={1.25} />
              <span>How to Measure</span>
            </button>
            <span className="text-[#ECE8E1]">Step {step} of 4</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Real-time ASTRA Verbal AI Integration Banner */}
        {(verbalSymptoms.sleepIssue || verbalSymptoms.spineIssue || verbalSymptoms.skinIssue) && (
          <div className="p-3 mb-4 rounded-xl border border-[#E0BE6A]/40 bg-[#E0BE6A]/10 text-xs text-[#ECE8E1] flex items-center justify-between shadow-[0_0_20px_rgba(224,190,106,0.15)] animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#E0BE6A] flex-shrink-0 animate-pulse" />
              <div>
                <span className="text-[10px] font-bold text-[#E0BE6A] uppercase tracking-wider block">
                  REAL-TIME ASTRA VERBAL SYMPTOM LOGGED
                </span>
                <p className="text-[11px] text-[#ECE8E1] mt-0.5">
                  "{verbalSymptoms.lastTranscript}" — Causal link established to telemetry.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] border border-[#E0BE6A]/40 bg-[#E0BE6A]/20 text-[#E0BE6A]">
              AUTONOMOUS SYNC
            </span>
          </div>
        )}

        {/* How to Measure Drawer */}
        {showHowToMeasure && (
          <div className="p-3 mb-4 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-[#8D97A6] flex justify-between items-center animate-in fade-in duration-200">
            <span>
              Rest seated for 5 minutes. Astroskin sensors sync automatically. Verbal symptom reports cross-correlate with bio-telemetry.
            </span>
            <button
              onClick={() => setShowHowToMeasure(false)}
              className="text-[#ECE8E1] hover:underline text-[10px] ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step Title & Subtitle */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold tracking-wider text-[#ECE8E1] uppercase">
            {step === 1
              ? 'PHYSIOLOGICAL VITALS'
              : step === 2
              ? 'SLEEP & CIRCADIAN ARCHITECTURE'
              : step === 3
              ? 'SUBJECTIVE FATIGUE & MOOD'
              : 'CAUSAL COUNTERMEASURE CONFIRMATION'}
          </h2>
          <p className="text-xs text-[#8D97A6] mt-0.5">
            {step === 1
              ? 'Astroskin 3-lead thoracic ECG & dual-band respiration'
              : step === 2
              ? 'NASA Archer wristband sleep actigraphy & circadian alignment'
              : step === 3
              ? 'Perceived cognitive stamina, spinal elongation ache & dermal status'
              : 'Prescribed NASA exercise & circadian countermeasures verified by ASTRA'}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col justify-center my-2">
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
            {/* 1. HEART RATE */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#ECE8E1]" strokeWidth={1.25} />
                  <span className="text-[11px] text-[#8D97A6] tracking-wider uppercase">
                    HEART RATE
                  </span>
                </div>
                <span className="text-[9px] text-[#8D97A6]">[ASTROSKIN ECG]</span>
              </div>

              <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => setHeartRate((h) => Math.max(40, h - 1))}
                  className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#ECE8E1] transition-colors"
                >
                  <Minus className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-light text-[#ECE8E1]">{heartRate}</span>
                  <span className="text-xs text-[#8D97A6]">bpm</span>
                </div>

                <button
                  onClick={() => setHeartRate((h) => Math.min(180, h + 1))}
                  className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#ECE8E1] transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* 2. CORE TEMPERATURE */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-[#ECE8E1]" strokeWidth={1.25} />
                  <span className="text-[11px] text-[#8D97A6] tracking-wider uppercase">
                    CORE TEMPERATURE
                  </span>
                </div>
                <span className="text-[9px] text-[#8D97A6]">[DUAL-BAND RIP]</span>
              </div>

              <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => setCoreTemp((t) => parseFloat((t - 0.1).toFixed(1)))}
                  className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#ECE8E1] transition-colors"
                >
                  <Minus className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-light text-[#ECE8E1]">{coreTemp.toFixed(1)}</span>
                  <span className="text-xs text-[#8D97A6]">°C</span>
                </div>

                <button
                  onClick={() => setCoreTemp((t) => parseFloat((t + 0.1).toFixed(1)))}
                  className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#ECE8E1] transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* 3. BLOOD PRESSURE (SYS) */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#ECE8E1]" strokeWidth={1.25} />
                  <span className="text-[11px] text-[#8D97A6] tracking-wider uppercase">
                    BLOOD PRESSURE (SYS)
                  </span>
                </div>
                <span className="text-[9px] text-[#8D97A6]">[BRACHIAL CUFF]</span>
              </div>

              <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => setBpSys((s) => Math.max(80, s - 1))}
                  className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#ECE8E1] transition-colors"
                >
                  <Minus className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-light text-[#ECE8E1]">{bpSys}</span>
                  <span className="text-xs text-[#8D97A6]">mmHg</span>
                </div>

                <button
                  onClick={() => setBpSys((s) => Math.min(200, s + 1))}
                  className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#ECE8E1] transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* 4. BLOOD PRESSURE (DIA) */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#ECE8E1]" strokeWidth={1.25} />
                  <span className="text-[11px] text-[#8D97A6] tracking-wider uppercase">
                    BLOOD PRESSURE (DIA)
                  </span>
                </div>
                <span className="text-[9px] text-[#8D97A6]">[BRACHIAL CUFF]</span>
              </div>

              <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => setBpDia((d) => Math.max(40, d - 1))}
                  className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#ECE8E1] transition-colors"
                >
                  <Minus className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-light text-[#ECE8E1]">{bpDia}</span>
                  <span className="text-xs text-[#8D97A6]">mmHg</span>
                </div>

                <button
                  onClick={() => setBpDia((d) => Math.min(130, d + 1))}
                  className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#ECE8E1] transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-md mx-auto w-full p-6 rounded-xl border border-white/10 bg-white/[0.02] text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8D97A6] uppercase tracking-wider block">
                TOTAL SLEEP RECORDED
              </span>
              <span className="text-[9px] text-[#8D97A6]">[NASA ARCHER WRISTBAND]</span>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setSleepHours((h) => Math.max(2, parseFloat((h - 0.5).toFixed(1))))}
                className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-light">{sleepHours.toFixed(1)}</span>
                <span className="text-sm text-[#8D97A6]">hours</span>
              </div>
              <button
                onClick={() => setSleepHours((h) => Math.min(12, parseFloat((h + 0.5).toFixed(1))))}
                className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {verbalSymptoms.sleepIssue && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-[#E0BE6A]">
                Sleep deficit flagged from verbal check-in ("{verbalSymptoms.lastTranscript}")
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg mx-auto w-full p-6 rounded-xl border border-white/10 bg-white/[0.02] space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#8D97A6]">SUBJECTIVE FATIGUE</span>
                <span className="text-[#ECE8E1]">{fatigueLevel} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={fatigueLevel}
                onChange={(e) => setFatigueLevel(parseInt(e.target.value, 10))}
                className="w-full accent-white"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#8D97A6]">SUBJECTIVE MOOD & WELLBEING</span>
                <span className="text-[#ECE8E1]">{moodLevel} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={moodLevel}
                onChange={(e) => setMoodLevel(parseInt(e.target.value, 10))}
                className="w-full accent-white"
              />
            </div>

            {verbalSymptoms.spineIssue && (
              <div className="p-3 rounded-lg border border-[#E0BE6A]/30 bg-[#E0BE6A]/5 text-[10.5px] text-[#E0BE6A] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Microgravity lumbar spine elongation & ache recorded in verbal assessment.</span>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="max-w-lg mx-auto w-full p-6 rounded-xl border border-white/10 bg-white/[0.02] text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-[#6FBF9B] mx-auto" strokeWidth={1.25} />
            <h3 className="text-sm font-medium text-[#ECE8E1]">Telemetry Packet Ready for Ingestion</h3>
            <p className="text-xs text-[#8D97A6]">
              Resting HR: {heartRate} bpm · Core Temp: {coreTemp}°C · BP: {bpSys}/{bpDia} mmHg · Sleep: {sleepHours}h
            </p>

            {/* Prescribed Countermeasure */}
            <div className="p-3 rounded-lg border border-white/15 bg-white/[0.03] text-left">
              <span className="text-[9px] font-bold text-[#B8CCE6] uppercase tracking-wider block mb-1">
                PRESCRIBED NASA COUNTERMEASURE PROTOCOL
              </span>
              <p className="text-[10.5px] text-[#ECE8E1] leading-relaxed">
                {verbalSymptoms.astraAdvice ||
                  '20 minutes ARED resistive axial load + 45 minutes circadian light session.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button Row */}
      <div className="flex items-center justify-between pt-4 hairline-t">
        {step > 1 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 rounded-lg text-xs font-mono border border-white/15 bg-white/[0.02] text-[#8D97A6] hover:text-[#ECE8E1] transition-colors"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-medium tracking-instrument border border-white/20 bg-white/10 hover:bg-white/20 text-[#ECE8E1] transition-all shadow-sm"
        >
          <span>{step === 4 ? (submitted ? 'Telemetry Ingested ✓' : 'Submit Telemetry') : 'Continue'}</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
