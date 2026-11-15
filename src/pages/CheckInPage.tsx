import React, { useState, useEffect } from 'react';
import { useSolaris } from '../context/SolarisContext';
import { useAstraStore } from '../api/mockClient';
import {
  Heart,
  Thermometer,
  Activity,
  Info,
  Plus,
  Minus,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Moon,
  Brain,
  ShieldAlert,
  ChevronRight,
  RotateCcw,
  Stethoscope,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const BACKEND_URL = 'http://localhost:8000';

export const CheckInPage: React.FC = () => {
  const { activeCrew, verbalSymptoms } = useSolaris();
  const { submitDailyAssessment, addTimelineEvent } = useAstraStore();

  const [step, setStep] = useState<number>(1);
  const [showHowToMeasure, setShowHowToMeasure] = useState<boolean>(false);

  // STEP 1: VITALS STATE
  const [heartRate, setHeartRate] = useState<number>(activeCrew?.vitals.heartRate || 78);
  const [coreTemp, setCoreTemp] = useState<number>(activeCrew?.vitals.coreTemp || 37.1);
  const [bpSys, setBpSys] = useState<number>(118);
  const [bpDia, setBpDia] = useState<number>(76);
  const [spo2, setSpo2] = useState<number>(activeCrew?.vitals.spo2 || 98.4);
  const [respRate, setRespRate] = useState<number>(activeCrew?.vitals.respRate || 14.2);
  const [hrv, setHrv] = useState<number>(activeCrew?.vitals.hrv || 42);
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});

  // STEP 2: SLEEP & CIRCADIAN STATE
  const [sleepHours, setSleepHours] = useState<number>(
    verbalSymptoms.sleepIssue ? 4.6 : activeCrew?.vitals.sleepHours || 6.8
  );
  const [sleepQuality, setSleepQuality] = useState<number>(verbalSymptoms.sleepIssue ? 2 : 4);
  const [sleepLatency, setSleepLatency] = useState<string>('< 15 min');
  const [sleepInterruptions, setSleepInterruptions] = useState<number>(verbalSymptoms.sleepIssue ? 3 : 0);
  const [interruptionCauses, setInterruptionCauses] = useState<string[]>(
    verbalSymptoms.sleepIssue ? ['Spine ache', 'Cabin temperature'] : []
  );
  const [morningFreshness, setMorningFreshness] = useState<'Refreshed' | 'Somewhat Tired' | 'Exhausted'>(
    verbalSymptoms.sleepIssue ? 'Somewhat Tired' : 'Refreshed'
  );

  // STEP 3: PHYSICAL WELLBEING & SPACEFLIGHT SYMPTOMS
  const [fatigueLevel, setFatigueLevel] = useState<number>(verbalSymptoms.sleepIssue ? 4 : 2);
  const [spineAcheScore, setSpineAcheScore] = useState<number>(verbalSymptoms.spineIssue ? 6 : 1);
  const [spaceMotionSickness, setSpaceMotionSickness] = useState<string>('None');
  const [cephalicFluidShift, setCephalicFluidShift] = useState<string[]>(['Facial puffiness']);
  const [dermalIrritation, setDermalIrritation] = useState<string>(
    verbalSymptoms.skinIssue ? 'Contact dermatitis' : 'Normal'
  );

  // STEP 4: PSYCHOLOGICAL & COGNITIVE WELLBEING
  const [moodLevel, setMoodLevel] = useState<number>(verbalSymptoms.spineIssue ? 3 : 4);
  const [stressLevel, setStressLevel] = useState<number>(verbalSymptoms.sleepIssue ? 3 : 2);
  const [cognitiveWorkload, setCognitiveWorkload] = useState<number>(3);
  const [missionTaskReadiness, setMissionTaskReadiness] = useState<number>(4);

  // STEP 5: SUBMITTED
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // Real-time synchronization when verbal symptom or active crew updates
  useEffect(() => {
    if (activeCrew) {
      setHeartRate(activeCrew.vitals.heartRate);
      setCoreTemp(activeCrew.vitals.coreTemp);
      setSpo2(activeCrew.vitals.spo2);
      setRespRate(activeCrew.vitals.respRate);
      setHrv(activeCrew.vitals.hrv);
      setSleepHours(verbalSymptoms.sleepIssue ? 4.6 : activeCrew.vitals.sleepHours);
    }
    if (verbalSymptoms.sleepIssue) {
      setFatigueLevel(4);
      setSleepQuality(2);
      setSleepInterruptions(3);
      setMorningFreshness('Somewhat Tired');
    }
    if (verbalSymptoms.spineIssue) {
      setSpineAcheScore(6);
    }
    if (verbalSymptoms.skinIssue) {
      setDermalIrritation('Contact dermatitis');
    }
  }, [activeCrew, verbalSymptoms]);

  const toggleInterruptionCause = (cause: string) => {
    setInterruptionCauses((prev) =>
      prev.includes(cause) ? prev.filter((c) => c !== cause) : [...prev, cause]
    );
  };

  const markManual = (metric: string) => {
    setManualOverrides((prev) => ({ ...prev, [metric]: true }));
  };

  const handleNext = async () => {
    if (step < 5) {
      setStep((s) => s + 1);
    } else {
      // Ingest complete payload
      const subId = `CHECKIN-${Date.now()}`;
      setSubmissionId(subId);

      const symptomsList: Array<{
        id: string;
        location: string;
        severity: number;
        onset: string;
        duration: string;
        notes?: string;
      }> = [];

      if (spineAcheScore > 4) {
        symptomsList.push({
          id: `symp-${Date.now()}-1`,
          location: 'Lumbar Spine',
          severity: spineAcheScore,
          onset: 'Mission Sol 142',
          duration: 'Persistent',
          notes: `Lumbar spine elongation ache (score ${spineAcheScore}/10)`,
        });
      }
      if (sleepHours < 5.5) {
        symptomsList.push({
          id: `symp-${Date.now()}-2`,
          location: 'Neuro/Sleep',
          severity: Math.round(10 - sleepHours * 1.5),
          onset: 'Last Sleep Cycle',
          duration: `${sleepHours}h`,
          notes: `Sleep deprivation (${sleepHours}h)`,
        });
      }
      if (dermalIrritation !== 'Normal') {
        symptomsList.push({
          id: `symp-${Date.now()}-3`,
          location: 'Integumentary',
          severity: 4,
          onset: 'Current Sol',
          duration: 'Ongoing',
          notes: `Dermal irritation: ${dermalIrritation}`,
        });
      }
      if (spaceMotionSickness !== 'None') {
        symptomsList.push({
          id: `symp-${Date.now()}-4`,
          location: 'Vestibular',
          severity: 5,
          onset: 'Post-Activity',
          duration: 'Acute',
          notes: `Space motion sickness: ${spaceMotionSickness}`,
        });
      }
      if (heartRate > 90) {
        symptomsList.push({
          id: `symp-${Date.now()}-5`,
          location: 'Cardiovascular',
          severity: 4,
          onset: 'Resting Telemetry',
          duration: 'Transient',
          notes: `Resting tachycardia (${heartRate} bpm)`,
        });
      }

      const assessmentRecord = {
        subject_id: activeCrew?.id ? `ASTRA-${activeCrew.id.toUpperCase()}` : 'ASTRA-001',
        mission_day: 142,
        timestamp: new Date().toISOString(),
        is_simulated: false,
        vitals: {
          heart_rate: heartRate,
          bp_sys: bpSys,
          bp_dia: bpDia,
          temperature: coreTemp,
          spo2: spo2,
          resp_rate: respRate,
          hrv: hrv,
          source: Object.keys(manualOverrides).length > 0 ? 'Manual + Sensor' : 'Astroskin Telemetry',
          quality: 'ok' as const,
        },
        sleep: {
          hours: sleepHours,
          quality: sleepQuality,
          difficulty_falling_asleep: sleepInterruptions > 1,
          interruptions: sleepInterruptions,
          feeling_rested: morningFreshness === 'Refreshed',
        },
        physical: {
          fatigue: fatigueLevel,
          muscle_discomfort: spineAcheScore > 3,
          joint_pain: false,
          spine_discomfort: spineAcheScore > 3,
          headache: false,
          dizziness: spaceMotionSickness !== 'None',
          exercise_recovery_score: 4,
        },
        psychological: {
          mood: moodLevel,
          stress_score: stressLevel,
          anxiety_score: 2,
          feeling_isolated: false,
          motivation_score: missionTaskReadiness,
          concentration_score: cognitiveWorkload,
        },
        symptoms: symptomsList,
        status: (heartRate > 95 || sleepHours < 5 || spineAcheScore > 5) ? ('review' as const) : ('normal' as const),
      };

      // 1. Submit to local Zustand state
      submitDailyAssessment(assessmentRecord);

      // 2. Add to Health Timeline
      addTimelineEvent({
        subject_id: assessmentRecord.subject_id,
        timestamp: new Date().toISOString(),
        category: 'assessment',
        title: `Daily Health Assessment Sol 142 Completed`,
        summary: `HR ${heartRate} bpm · BP ${bpSys}/${bpDia} · Sleep ${sleepHours}h · Spine Score ${spineAcheScore}/10`,
        detail: `Ingested via SOLARIS telemetry console. Flagged ${
          spineAcheScore > 5 ? 'Microgravity lumbar elongation' : 'Nominal physical readiness'
        }.`,
        severity: assessmentRecord.status,
        source: 'SOLARIS Daily Health Assessment Console',
        is_simulated: true,
        action_required: assessmentRecord.status === 'review',
      });

      // 3. Post to local FastAPI backend if reachable
      try {
        await fetch(`${BACKEND_URL}/api/assess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            crew_name: activeCrew?.id || 'chen',
            transcript: `Daily Health Assessment: HR ${heartRate}, Sleep ${sleepHours}h, Spine ${spineAcheScore}`,
            sleep_issue: sleepHours < 5.5,
            skin_issue: dermalIrritation !== 'Normal',
            spine_issue: spineAcheScore >= 5,
          }),
        });
      } catch (e) {
        console.warn('Backend server offline; saved locally to offline Zustand cache:', e);
      }

      setSubmitted(true);
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.65 },
        colors: ['#5850EC', '#10B981', '#38BDF8'],
      });
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] max-w-5xl mx-auto flex flex-col justify-between p-3 lg:p-6 pb-36 select-none font-sans text-slate-900">
      {/* Subheader */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#5850EC] shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 uppercase font-mono">
                Daily Health Assessment & Protocol Check-In
              </h1>
              <p className="text-xs text-slate-600 font-medium font-mono">
                Sol 142 Telemetry Verification & Operational Readiness
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-mono font-bold border shadow-sm"
              style={{
                borderColor: activeCrew ? activeCrew.badgeColor : '#E2E8F0',
                backgroundColor: '#FFFFFF',
                color: activeCrew ? (activeCrew.status === 'Caution' ? '#D97706' : '#059669') : '#475569',
              }}
            >
              {activeCrew ? `${activeCrew.name} (${activeCrew.callsign})` : 'AUTHENTICATION REQUIRED'}
            </span>
          </div>
        </div>

        {/* Step Counter & Info Header */}
        <div className="flex items-center justify-between text-xs text-slate-700 mb-2 font-mono">
          <button
            onClick={() => setShowHowToMeasure(!showHowToMeasure)}
            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>How to Measure</span>
          </button>
          <span className="font-extrabold text-slate-800">Step {step} of 5</span>
        </div>

        {/* 5-Step Progress Bar (Neumorphic) */}
        <div className="w-full h-2.5 bg-slate-200/90 rounded-full overflow-hidden mb-5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-[#5850EC] transition-all duration-300 rounded-full shadow-sm"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Real-time SOLARIS Verbal AI Integration Banner */}
        {(verbalSymptoms.sleepIssue || verbalSymptoms.spineIssue || verbalSymptoms.skinIssue) && (
          <div className="p-3.5 mb-5 rounded-2xl border border-amber-300 bg-amber-50/90 text-slate-800 flex items-center justify-between shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 animate-pulse" />
              <div>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-mono">
                  REAL-TIME SOLARIS VERBAL SYMPTOM LOGGED
                </span>
                <p className="text-xs text-slate-700 mt-0.5 font-medium">
                  "{verbalSymptoms.lastTranscript}" — Automatically synced into assessment records.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border border-amber-300 bg-white text-amber-800 shadow-sm">
              AI SYNC ACTIVE
            </span>
          </div>
        )}

        {/* How to Measure Drawer */}
        {showHowToMeasure && (
          <div className="p-4 mb-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs text-slate-600 flex justify-between items-center animate-in fade-in duration-200">
            <span>
              Rest seated for 5 minutes. Astroskin sensors sync telemetry automatically. Manual adjustments are tagged with [MANUAL ENTRY].
            </span>
            <button
              onClick={() => setShowHowToMeasure(false)}
              className="text-indigo-600 font-bold hover:underline text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step Title & Subtitle */}
        <div className="mb-4">
          <h2 className="text-sm font-bold tracking-wider text-slate-900 uppercase font-mono">
            {step === 1
              ? 'STAGE 1: PHYSIOLOGICAL VITALS'
              : step === 2
              ? 'STAGE 2: SLEEP & CIRCADIAN ARCHITECTURE'
              : step === 3
              ? 'STAGE 3: PHYSICAL WELLBEING & SPACEFLIGHT SYMPTOMS'
              : step === 4
              ? 'STAGE 4: PSYCHOLOGICAL & COGNITIVE WELLBEING'
              : 'STAGE 5: ASSESSMENT SUMMARY & INGESTION CONFIRMATION'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {step === 1
              ? 'Astroskin 3-lead thoracic ECG, dual-band RIP & optical PPG sensors'
              : step === 2
              ? 'NASA Archer actigraphy wristband, sleep latency & cabin disruption tracking'
              : step === 3
              ? 'Microgravity spinal elongation ache, space motion sickness & dermal status'
              : step === 4
              ? 'Perceived cognitive workload, operational stress & mission readiness'
              : 'Review clinical payload before transmitting to mission health telemetry archive'}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col justify-center my-2">
        {/* STEP 1: VITALS */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
            {/* Heart Rate */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">HEART RATE</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold">
                  {manualOverrides['hr'] ? 'MANUAL ENTRY' : 'ASTROSKIN ECG'}
                </span>
              </div>
              <div className="flex items-center justify-between px-2 my-2">
                <button
                  onClick={() => {
                    setHeartRate((h) => Math.max(40, h - 1));
                    markManual('hr');
                  }}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Decrease heart rate"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">{heartRate}</span>
                  <span className="text-xs text-slate-500 font-medium font-mono">bpm</span>
                </div>
                <button
                  onClick={() => {
                    setHeartRate((h) => Math.min(180, h + 1));
                    markManual('hr');
                  }}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Increase heart rate"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-100 font-mono">
                <span>Nominal: 60-100 bpm</span>
                <span className="font-semibold text-emerald-600">Baseline: 64 bpm</span>
              </div>
            </div>

            {/* Core Temp */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">CORE TEMP</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold">
                  {manualOverrides['temp'] ? 'MANUAL ENTRY' : 'THERMISTOR'}
                </span>
              </div>
              <div className="flex items-center justify-between px-2 my-2">
                <button
                  onClick={() => {
                    setCoreTemp((t) => parseFloat((t - 0.1).toFixed(1)));
                    markManual('temp');
                  }}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Decrease temperature"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">{coreTemp.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 font-medium font-mono">°C</span>
                </div>
                <button
                  onClick={() => {
                    setCoreTemp((t) => parseFloat((t + 0.1).toFixed(1)));
                    markManual('temp');
                  }}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Increase temperature"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-100 font-mono">
                <span>Nominal: 36.5-37.5 °C</span>
                <span className="font-semibold text-emerald-600">Baseline: 36.8 °C</span>
              </div>
            </div>

            {/* Blood Pressure SYS / DIA */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-500">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">BLOOD PRESSURE</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold">
                  BRACHIAL CUFF
                </span>
              </div>
              <div className="flex items-center justify-around my-2">
                <div className="text-center">
                  <span className="text-xs text-slate-500 font-bold block font-mono">SYS</span>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => setBpSys((s) => Math.max(80, s - 2))}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-xs font-bold text-slate-700"
                    >
                      -
                    </button>
                    <span className="text-2xl font-extrabold text-slate-900 font-mono px-1">{bpSys}</span>
                    <button
                      onClick={() => setBpSys((s) => Math.min(180, s + 2))}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-xs font-bold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
                <span className="text-2xl text-slate-300 font-thin">/</span>
                <div className="text-center">
                  <span className="text-xs text-slate-500 font-bold block font-mono">DIA</span>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => setBpDia((d) => Math.max(50, d - 2))}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-xs font-bold text-slate-700"
                    >
                      -
                    </button>
                    <span className="text-2xl font-extrabold text-slate-900 font-mono px-1">{bpDia}</span>
                    <button
                      onClick={() => setBpDia((d) => Math.min(120, d + 2))}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-xs font-bold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-100 font-mono">
                <span>Target: 120/80 mmHg</span>
                <span className="font-semibold text-emerald-600">Baseline: 118/76</span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">OXYGEN SAT (SPO2)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold">
                  FOREHEAD PPG
                </span>
              </div>
              <div className="flex items-center justify-between px-2 my-2">
                <button
                  onClick={() => setSpo2((s) => parseFloat(Math.max(88, s - 0.2).toFixed(1)))}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Decrease SpO2"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">{spo2.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 font-medium font-mono">%</span>
                </div>
                <button
                  onClick={() => setSpo2((s) => parseFloat(Math.min(100, s + 0.2).toFixed(1)))}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Increase SpO2"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-100 font-mono">
                <span>Threshold: &gt; 95%</span>
                <span className="font-semibold text-emerald-600">Nominal</span>
              </div>
            </div>

            {/* Respiration Rate */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">RESPIRATION RATE</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold">
                  RIP BAND
                </span>
              </div>
              <div className="flex items-center justify-between px-2 my-2">
                <button
                  onClick={() => setRespRate((r) => parseFloat(Math.max(8, r - 0.5).toFixed(1)))}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Decrease respiration rate"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">{respRate.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 font-medium font-mono">br/m</span>
                </div>
                <button
                  onClick={() => setRespRate((r) => parseFloat(Math.min(30, r + 0.5).toFixed(1)))}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Increase respiration rate"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-100 font-mono">
                <span>Normal: 12-18 br/m</span>
                <span className="font-semibold text-emerald-600">Resting Nominal</span>
              </div>
            </div>

            {/* HRV RMSSD */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">HRV (RMSSD)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold">
                  ASTROSKIN ECG
                </span>
              </div>
              <div className="flex items-center justify-between px-2 my-2">
                <button
                  onClick={() => setHrv((v) => Math.max(15, v - 1))}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Decrease HRV"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">{hrv}</span>
                  <span className="text-xs text-slate-500 font-medium font-mono">ms</span>
                </div>
                <button
                  onClick={() => setHrv((v) => Math.min(100, v + 1))}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Increase HRV"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-100 font-mono">
                <span>Baseline: 55 ms</span>
                <span className={`font-semibold ${hrv < 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {hrv < 40 ? 'Autonomic Strain' : 'Optimal'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SLEEP & CIRCADIAN ARCHITECTURE */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto w-full p-6 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#5850EC]">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 uppercase font-mono">SLEEP DURATION & QUALITY</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-semibold">[NASA ARCHER ACTIGRAPHY]</span>
            </div>

            {/* Sleep Hours Stepper */}
            <div className="flex items-center justify-between bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-inner">
              <span className="text-xs font-bold text-slate-700 font-mono uppercase">Total Sleep Recorded:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSleepHours((h) => Math.max(2, parseFloat((h - 0.5).toFixed(1))))}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Decrease sleep hours"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-3xl font-extrabold text-slate-900 font-mono px-2">{sleepHours.toFixed(1)} hrs</span>
                <button
                  onClick={() => setSleepHours((h) => Math.min(12, parseFloat((h + 0.5).toFixed(1))))}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                  aria-label="Increase sleep hours"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sleep Quality 1-5 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="font-bold text-slate-700">Subjective Sleep Quality:</span>
                <span className="font-extrabold text-indigo-600">{sleepQuality} / 5</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    onClick={() => setSleepQuality(q)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                      sleepQuality === q
                        ? 'bg-gradient-to-r from-indigo-600 to-[#5850EC] text-white border-indigo-600 shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {q} {q === 1 ? 'Poor' : q === 5 ? 'Optimal' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Interruption Causes */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block font-mono">Awakenings & Cabin Disruption Factors:</span>
              <div className="flex flex-wrap gap-2">
                {['Spine ache', 'Cabin temperature', 'Fan / pump noise', 'ppCO2 elevation', 'Urination'].map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleInterruptionCause(c)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all ${
                      interruptionCauses.includes(c)
                        ? 'bg-amber-50 border-amber-400 text-amber-800 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Morning Freshness */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block font-mono">Subjective Feeling Upon Waking:</span>
              <div className="grid grid-cols-3 gap-3">
                {(['Refreshed', 'Somewhat Tired', 'Exhausted'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMorningFreshness(f)}
                    className={`py-2.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                      morningFreshness === f
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PHYSICAL WELLBEING & SPACEFLIGHT SYMPTOMS */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto w-full p-6 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-6">
            {/* Fatigue Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-800">GENERAL PHYSICAL FATIGUE:</span>
                <span className="font-extrabold text-indigo-600">{fatigueLevel} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={fatigueLevel}
                onChange={(e) => setFatigueLevel(parseInt(e.target.value, 10))}
                className="w-full accent-[#5850EC]"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>1: Fully Energized</span>
                <span>5: Severe Exhaustion</span>
              </div>
            </div>

            {/* Microgravity Lumbar Spine Elongation Ache */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-amber-900 font-bold uppercase">MICROGRAVITY LUMBAR SPINE UNLOADING ACHE:</span>
                <span className="text-amber-900 font-extrabold text-sm">{spineAcheScore} / 10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={spineAcheScore}
                onChange={(e) => setSpineAcheScore(parseInt(e.target.value, 10))}
                className="w-full accent-amber-600"
              />
              <span className="text-[11px] text-amber-800 font-mono block">
                0 = No discomfort · 5 = Noticeable paraspinal strain · 10 = Severe radicular pain
              </span>
            </div>

            {/* Space Motion Sickness */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block font-mono">SPACE MOTION SICKNESS (SMS) / NEURO-VESTIBULAR:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['None', 'Stomach Awareness', 'Mild Dizziness', 'Nausea / Malaise'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpaceMotionSickness(s)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-mono font-medium border transition-all text-center ${
                      spaceMotionSickness === s
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Dermal Status */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block font-mono">DERMAL / SKIN INTEGRITY STATUS:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Normal', 'Dryness / Flaking', 'Suit Friction Rash', 'Contact Dermatitis'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDermalIrritation(d)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-mono font-medium border transition-all text-center ${
                      dermalIrritation === d
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PSYCHOLOGICAL & COGNITIVE WELLBEING */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto w-full p-6 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-6">
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-800">SUBJECTIVE MOOD & MORALE:</span>
                <span className="font-extrabold text-indigo-600">{moodLevel} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={moodLevel}
                onChange={(e) => setMoodLevel(parseInt(e.target.value, 10))}
                className="w-full accent-[#5850EC]"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>1: Subdued / Flat</span>
                <span>5: Optimistic & Positive</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-800">MISSION OPERATIONAL STRESS:</span>
                <span className="font-extrabold text-indigo-600">{stressLevel} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={stressLevel}
                onChange={(e) => setStressLevel(parseInt(e.target.value, 10))}
                className="w-full accent-[#5850EC]"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>1: Relaxed</span>
                <span>5: Extreme Tension</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-800">COGNITIVE WORKLOAD & FOCUS:</span>
                <span className="font-extrabold text-indigo-600">{cognitiveWorkload} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={cognitiveWorkload}
                onChange={(e) => setCognitiveWorkload(parseInt(e.target.value, 10))}
                className="w-full accent-[#5850EC]"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>1: Low Effort</span>
                <span>5: Mental Saturation</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-800">TASK READINESS FOR SCHEDULED SOL 142 OPS:</span>
                <span className="font-extrabold text-indigo-600">{missionTaskReadiness} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={missionTaskReadiness}
                onChange={(e) => setMissionTaskReadiness(parseInt(e.target.value, 10))}
                className="w-full accent-[#5850EC]"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>1: Impaired / Not Ready</span>
                <span>5: 100% Mission Ready</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SUMMARY & SUBMISSION */}
        {step === 5 && (
          <div className="max-w-xl mx-auto w-full p-6 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-5">
            <div className="text-center space-y-1.5">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                submitted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-[#5850EC]'
              }`}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-mono uppercase">
                {submitted ? 'Assessment Telemetry Ingested Successfully' : 'Review Daily Health Assessment Payload'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {submitted
                  ? `Archive ID: ${submissionId} · Signed into Clinical Mission Log`
                  : 'Verify captured biomedical values prior to ground station synchronization'}
              </p>
            </div>

            {/* Matrix Card */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/80 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500 font-bold block">RESTING VITALS:</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {heartRate} bpm · {bpSys}/{bpDia} mmHg · {coreTemp}°C
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">RESPIRATORY / O2:</span>
                  <span className="text-slate-900 font-bold text-sm">
                    SpO2 {spo2}% · Resp {respRate} br/m
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">SLEEP METRICS:</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {sleepHours}h ({morningFreshness})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">LUMBAR / SYMPTOMS:</span>
                  <span className={`font-bold text-sm ${spineAcheScore > 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                    Spine Ache {spineAcheScore}/10 · {dermalIrritation}
                  </span>
                </div>
              </div>

              {/* Prescribed Countermeasure */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1 font-mono">
                  PRESCRIBED NASA COUNTERMEASURE PROTOCOL
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {verbalSymptoms.astraAdvice ||
                    '20 minutes ARED resistive axial load + 45 minutes circadian light session.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button Row with Voice HUD clearance */}
      <div className="flex items-center justify-between pt-6 pb-12 mb-6 border-t border-slate-200 font-mono">
        {step > 1 && !submitted ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleNext}
          disabled={submitted}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-md active:scale-95 ${
            submitted
              ? 'bg-emerald-600 text-white cursor-default'
              : 'bg-gradient-to-r from-indigo-600 to-[#5850EC] hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-200 hover:shadow-lg'
          }`}
        >
          <span>{step === 5 ? (submitted ? 'Telemetry Ingested ✓' : 'Submit Telemetry') : 'Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CheckInPage;
