import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  httpClient,
  onConnectionStatusChange,
} from '../api/httpClient';
import {
  isMockMode,
  setMockMode as apiSetMockMode,
  toggleMockMode as apiToggleMockMode,
  onModeChange,
} from '../api/client';
import { BackendConnectionStatus } from '../api/types';
import { solarisVoiceService } from '../services/solarisVoiceService';
import confetti from 'canvas-confetti';

export type AstraMode = 'AUTH_GATE' | 'NARRATING' | 'LISTENING' | 'MANUAL_MODE' | 'SLEEPING';
export type SolarisMode = AstraMode;

export type FlowStage = 'STAGE_AUTH' | 'STAGE_BRIEFING' | 'STAGE_ASSESSMENT' | 'STAGE_COMMAND';
export type VoiceState = 'sleeping' | 'awake' | 'listening' | 'speaking';

export interface CrewVitals {
  heartRate: number;
  hrv: number;
  spo2: number;
  respRate: number;
  coreTemp: number;
  radiation_mSv: number;
  sleepHours: number;
  bloodPressure?: string;
  sleepDuration?: number;
}

export interface HotspotNarration {
  hotspot: string;
  text: string;
}

export interface MLAnalysis {
  status: 'NOMINAL' | 'CAUTION' | 'CRITICAL';
  confidence_pct: number;
  is_anomaly: boolean;
  anomaly_score: number;
  top_contributing_factors?: Array<{ feature: string; value: number; impact_score: number }>;
  causal_explanation?: string;
  countermeasures?: string[];
}

export interface CrewProfile {
  id: 'vance' | 'patel' | 'chen' | string;
  name: string;
  callsign: string;
  role: string;
  status: 'Nominal' | 'Caution' | 'Warning' | 'normal' | 'watch' | 'review';
  badgeColor: string;
  vitals: CrewVitals;
  summaryVerdict: string;
  narrationScript: HotspotNarration[];
  mlAnalysis?: MLAnalysis;
}

export interface VerbalSymptoms {
  sleepIssue: boolean;
  skinIssue: boolean;
  spineIssue: boolean;
  lastTranscript: string;
  astraAdvice: string;
  mlAnalysis?: MLAnalysis;
}

export interface TranscriptMessage {
  id: string;
  sender: 'astra' | 'solaris' | 'crew' | 'astronaut' | 'system';
  text: string;
  timestamp: string;
}

export interface SolarisContextType {
  activeCrew: CrewProfile | null;
  astraMode: AstraMode;
  solarisMode: SolarisMode;
  stage: FlowStage;
  voiceState: VoiceState;
  activeHotspotId: string | null;
  verbalSymptoms: VerbalSymptoms;
  transcript: TranscriptMessage[];
  currentUtterance: string;
  isMicActive: boolean;
  backendOnline: boolean;
  connectionStatus: BackendConnectionStatus;
  isMockMode: boolean;
  selectCrew: (crewId: 'vance' | 'patel' | 'chen' | string) => Promise<void>;
  authenticateCrew: (name: string) => Promise<boolean>;
  lockDashboard: () => void;
  sendInput: (input: string) => Promise<void>;
  submitAssessment: (response: string) => Promise<void>;
  toggleMic: () => void;
  setAstraMode: (mode: AstraMode) => void;
  setSolarisMode: (mode: SolarisMode) => void;
  speakText: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  triggerAutoNarration: (profile?: CrewProfile) => void;
  wakeSolaris: () => void;
  sleepSolaris: () => void;
  wakeAstra: () => void;
  sleepAstra: () => void;
  toggleManualMode: (override?: boolean) => void;
  toggleMockMode: (enabled?: boolean) => void;
  restartFlow: () => void;
}

export const CREW_PROFILES: Record<string, CrewProfile> = {
  vance: {
    id: 'vance',
    name: 'Commander Vance',
    callsign: 'CMDR. A. VANCE',
    role: 'Mission Commander',
    status: 'Caution',
    badgeColor: '#E0BE6A',
    vitals: {
      spo2: 98.4,
      respRate: 14.2,
      heartRate: 96,
      hrv: 38,
      coreTemp: 37.1,
      radiation_mSv: 54.8,
      sleepHours: 5.4,
      bloodPressure: '128/84',
      sleepDuration: 5.4,
    },
    summaryVerdict:
      'All pulmonary and oxygen readings are looking fine, Commander Vance, but your heart rate has a little jump here and there at 96 BPM with a dip in HRV.',
    narrationScript: [
      {
        hotspot: 'headband',
        text: 'Forehead PPG on Astroskin headband shows oxygen saturation nominal at 98.4 percent, with stable cranial pulse transit time.',
      },
      {
        hotspot: 'heart',
        text: 'Cardiac 3-lead thoracic ECG indicates your heart rate has intermittent ectopic jumps up to 96 BPM, and HRV is dipping at 38 milliseconds.',
      },
      {
        hotspot: 'lungs',
        text: 'Dual-band thoracic respiration is steady at 14.2 breaths per minute, and core thermal regulation is nominal at 37.1 degrees.',
      },
      {
        hotspot: 'archer',
        text: 'NASA Archer wristband records sleep duration at 5.4 hours with moderate circadian phase stability.',
      },
      {
        hotspot: 'dosimeter',
        text: 'HERA active dosimeter reports daily radiation rate at 0.12 millisieverts, well within mission safety limits.',
      },
    ],
  },
  patel: {
    id: 'patel',
    name: 'Specialist Patel',
    callsign: 'SPEC. R. PATEL',
    role: 'EVA Specialist',
    status: 'Nominal',
    badgeColor: '#6FBF9B',
    vitals: {
      spo2: 99.1,
      respRate: 12.8,
      heartRate: 64,
      hrv: 62,
      coreTemp: 36.8,
      radiation_mSv: 48.2,
      sleepHours: 7.8,
      bloodPressure: '118/76',
      sleepDuration: 7.8,
    },
    summaryVerdict:
      'All biometric parameters are in optimal range, Specialist Patel. Physical readiness index is ninety-eight percent.',
    narrationScript: [
      {
        hotspot: 'headband',
        text: 'Astroskin headband confirms optimal cephalic hemodynamics and oxygen saturation at 99.1 percent.',
      },
      {
        hotspot: 'heart',
        text: 'Thoracic ECG detects a calm resting sinus rhythm of 64 BPM and robust HRV at 62 milliseconds.',
      },
      {
        hotspot: 'lungs',
        text: 'Dual-band respiration is smooth at 12.8 breaths per minute, core temperature optimal at 36.8 degrees.',
      },
      {
        hotspot: 'archer',
        text: 'Archer actigraphy confirms 7.8 hours of deep restful sleep and excellent circadian readiness.',
      },
      {
        hotspot: 'dosimeter',
        text: 'HERA dosimeter confirms nominal environmental shielding with cumulative dose nominal.',
      },
    ],
  },
  chen: {
    id: 'chen',
    name: 'Flight Engineer Chen',
    callsign: 'FLT. ENG. M. CHEN',
    role: 'Flight Engineer / Science Officer',
    status: 'Warning',
    badgeColor: '#E58F55',
    vitals: {
      spo2: 97.6,
      respRate: 15.6,
      heartRate: 88,
      hrv: 35,
      coreTemp: 37.3,
      radiation_mSv: 56.4,
      sleepHours: 4.5,
      bloodPressure: '132/88',
      sleepDuration: 4.5,
    },
    summaryVerdict:
      'Flight Engineer Chen, your telemetry shows significant microgravity spinal unloading strain and an acute sleep deficit of 4.5 hours, with elevated heart rate.',
    narrationScript: [
      {
        hotspot: 'headband',
        text: 'Astroskin headband notes slight cranial fluid shifting, with SpO2 maintaining at 97.6 percent.',
      },
      {
        hotspot: 'heart',
        text: 'Thoracic ECG shows an elevated resting heart rate of 88 BPM reflecting microgravity autonomic strain.',
      },
      {
        hotspot: 'lungs',
        text: 'Thoracic respiration rate is slightly elevated at 15.6 breaths per minute.',
      },
      {
        hotspot: 'archer',
        text: 'NASA Archer actigraphy flags a sleep deficit at only 4.5 hours, indicating acute circadian desynchrony.',
      },
      {
        hotspot: 'dosimeter',
        text: 'HERA active dosimeter telemetry confirms cumulative radiation within solar quiet thresholds.',
      },
    ],
  },
};

export const SolarisContext = createContext<SolarisContextType | undefined>(undefined);

export const SolarisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCrew, setActiveCrew] = useState<CrewProfile | null>(null);
  const [astraMode, setAstraModeState] = useState<AstraMode>('AUTH_GATE');
  const [stage, setStage] = useState<FlowStage>('STAGE_AUTH');
  const [voiceState, setVoiceState] = useState<VoiceState>('awake');
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<BackendConnectionStatus>(
    isMockMode() ? 'DEMO_MODE' : 'DISCONNECTED'
  );
  const [mockModeActive, setMockModeActive] = useState<boolean>(isMockMode());

  const [currentUtterance, setCurrentUtterance] = useState<string>(
    'SOLARIS Medical Interface online. Please state or select your crew profile to begin.'
  );
  const [isMicActive, setIsMicActive] = useState<boolean>(true);

  const [verbalSymptoms, setVerbalSymptoms] = useState<VerbalSymptoms>({
    sleepIssue: false,
    skinIssue: false,
    spineIssue: false,
    lastTranscript: '',
    astraAdvice: '',
  });

  const [transcript, setTranscript] = useState<TranscriptMessage[]>([
    {
      id: 'init-1',
      sender: 'solaris',
      text: 'SOLARIS Medical Intelligence online. Please state or select your crew profile to access telemetry.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  ]);

  const autoNarrationTimeoutRef = useRef<NodeJS.Timeout[]>([]);

  // Monitor backend connection health and mock mode changes
  useEffect(() => {
    // Initial health ping
    httpClient
      .checkHealth(1500)
      .then((res) => {
        setBackendOnline(res.online);
        if (!isMockMode()) {
          setConnectionStatus(res.status);
        }
      })
      .catch(() => {
        setBackendOnline(false);
        if (!isMockMode()) {
          setConnectionStatus('DISCONNECTED');
        }
      });

    // Listen for connection changes
    const unsubConn = onConnectionStatusChange((status) => {
      if (!isMockMode()) {
        setConnectionStatus(status);
        setBackendOnline(status === 'CONNECTED');
      }
    });

    const unsubMode = onModeChange((isMock, status) => {
      setMockModeActive(isMock);
      setConnectionStatus(status);
      if (!isMock) {
        httpClient.checkHealth(1000).then((h) => {
          setBackendOnline(h.online);
          setConnectionStatus(h.status);
        });
      }
    });

    // Recurring health check every 10 seconds
    const interval = setInterval(() => {
      if (!isMockMode()) {
        httpClient
          .checkHealth(1500)
          .then((res) => {
            setBackendOnline(res.online);
            setConnectionStatus(res.status);
          })
          .catch(() => {
            setBackendOnline(false);
            setConnectionStatus('DISCONNECTED');
          });
      }
    }, 10000);

    return () => {
      unsubConn();
      unsubMode();
      clearInterval(interval);
    };
  }, []);

  const addTranscript = useCallback((sender: 'solaris' | 'astra' | 'crew' | 'astronaut' | 'system', text: string) => {
    setTranscript((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  }, []);

  const stopSpeaking = useCallback(() => {
    solarisVoiceService.stopSpeaking();
    setVoiceState('awake');
  }, []);

  const speakText = useCallback(
    (text: string, onEnd?: () => void) => {
      setCurrentUtterance(text);
      addTranscript('solaris', text);
      setVoiceState('speaking');

      solarisVoiceService
        .speak(text)
        .then(() => {
          setVoiceState('awake');
          onEnd?.();
        })
        .catch(() => {
          setVoiceState('awake');
          onEnd?.();
        });
    },
    [addTranscript]
  );

  const clearNarrationQueue = useCallback(() => {
    autoNarrationTimeoutRef.current.forEach((t) => clearTimeout(t));
    autoNarrationTimeoutRef.current = [];
    stopSpeaking();
  }, [stopSpeaking]);

  const triggerAutoNarration = useCallback(
    (profileToNarrate?: CrewProfile) => {
      const crew = profileToNarrate || activeCrew;
      if (!crew) return;

      clearNarrationQueue();
      setAstraModeState('NARRATING');
      setStage('STAGE_BRIEFING');

      const welcome = `Welcome back, ${crew.name}. Synchronizing your telemetry and daily biometrics now.`;

      speakText(welcome, () => {
        let cumulativeDelay = 0;

        crew.narrationScript.forEach((step, idx) => {
          const timeout = setTimeout(() => {
            setActiveHotspotId(step.hotspot);
            speakText(step.text, () => {
              if (idx === crew.narrationScript.length - 1) {
                const summaryTimeout = setTimeout(() => {
                  setActiveHotspotId(null);
                  speakText(crew.summaryVerdict, () => {
                    const questionTimeout = setTimeout(() => {
                      speakText(
                        'How are you feeling today? Any issues with sleep, skin irritation, or spine pain?',
                        () => {
                          setAstraModeState('LISTENING');
                          setStage('STAGE_ASSESSMENT');
                        }
                      );
                    }, 400);
                    autoNarrationTimeoutRef.current.push(questionTimeout);
                  });
                }, 400);
                autoNarrationTimeoutRef.current.push(summaryTimeout);
              }
            });
          }, cumulativeDelay);

          autoNarrationTimeoutRef.current.push(timeout);
          cumulativeDelay += 4200;
        });
      });
    },
    [activeCrew, clearNarrationQueue, speakText]
  );

  const selectCrew = useCallback(
    async (rawCrewId: string) => {
      clearNarrationQueue();
      const crewId = rawCrewId.toLowerCase().includes('patel')
        ? 'patel'
        : rawCrewId.toLowerCase().includes('chen')
        ? 'chen'
        : 'vance';

      let profile: CrewProfile = { ...(CREW_PROFILES[crewId] || CREW_PROFILES.vance) };

      // Fetch authoritative crew telemetry from Python FastAPI backend if not in explicit mock mode
      if (!isMockMode()) {
        try {
          const data = await httpClient.getCrewTelemetry(crewId);
          setBackendOnline(true);
          setConnectionStatus('CONNECTED');
          if (data && data.crew) {
            profile = {
              ...profile,
              vitals: {
                heartRate: data.crew.heart_rate_bpm ?? profile.vitals.heartRate,
                hrv: data.crew.hrv_rmssd_ms ?? profile.vitals.hrv,
                spo2: data.crew.spo2_pct ?? profile.vitals.spo2,
                respRate: data.crew.resp_rate_brm ?? profile.vitals.respRate,
                coreTemp: data.crew.skin_temp_c ?? profile.vitals.coreTemp,
                radiation_mSv: data.hotspots?.dosimeter?.cumulative_msv ?? profile.vitals.radiation_mSv,
                sleepHours: data.crew.sleep_hours ?? profile.vitals.sleepHours,
              },
              summaryVerdict: data.astra_briefing_script || profile.summaryVerdict,
              mlAnalysis: data.ml_analysis,
            };
          }
        } catch (err) {
          console.warn('Real backend fetch failed; remaining on local profile:', err);
          setBackendOnline(false);
          setConnectionStatus('DISCONNECTED');
        }
      }

      setActiveCrew(profile);
      setStage('STAGE_BRIEFING');
      triggerAutoNarration(profile);
    },
    [clearNarrationQueue, triggerAutoNarration]
  );

  const authenticateCrew = useCallback(
    async (name: string): Promise<boolean> => {
      await selectCrew(name);
      return true;
    },
    [selectCrew]
  );

  const lockDashboard = useCallback(() => {
    clearNarrationQueue();
    setActiveCrew(null);
    setAstraModeState('AUTH_GATE');
    setStage('STAGE_AUTH');
    setActiveHotspotId(null);
    const greeting = 'SOLARIS Medical Interface locked. Please authenticate your crew profile.';
    setCurrentUtterance(greeting);
    speakText(greeting);
  }, [clearNarrationQueue, speakText]);

  const sendInput = useCallback(
    async (rawInput: string) => {
      const clean = rawInput.trim();
      if (!clean) return;

      addTranscript('crew', clean);
      const lower = clean.toLowerCase();

      // Handle Authentication Gate
      if (!activeCrew) {
        if (lower.includes('vance') || lower.includes('alex') || lower.includes('commander')) {
          await selectCrew('vance');
          return;
        }
        if (lower.includes('patel') || lower.includes('specialist') || lower.includes('eva')) {
          await selectCrew('patel');
          return;
        }
        if (lower.includes('chen') || lower.includes('maya') || lower.includes('engineer')) {
          await selectCrew('chen');
          return;
        }
        speakText('Crew member not recognized. Please state Vance, Patel, or Chen to authenticate.');
        return;
      }

      // Hands-free Voice Commands
      if (lower.includes('read manually') || lower.includes('manual mode') || lower.includes('stop reading')) {
        clearNarrationQueue();
        setAstraModeState('MANUAL_MODE');
        setActiveHotspotId(null);
        const manualMsg = 'Manual telemetry inspection active. Voice narration paused.';
        setCurrentUtterance(manualMsg);
        speakText(manualMsg);
        return;
      }

      if (
        lower.includes('sleep solaris') ||
        lower.includes('sleep astra') ||
        lower.includes('go to sleep') ||
        lower.includes('standby')
      ) {
        clearNarrationQueue();
        setAstraModeState('SLEEPING');
        setVoiceState('sleeping');
        setActiveHotspotId(null);
        speakText("Entering standby mode. Say 'Wake up, SOLARIS' when you need me.");
        return;
      }

      if (
        lower.includes('wake solaris') ||
        lower.includes('wake up, solaris') ||
        lower.includes('wake up solaris') ||
        lower.includes('solaris online') ||
        lower.includes('wake astra') ||
        lower.includes('wake up')
      ) {
        setAstraModeState('LISTENING');
        setVoiceState('listening');
        speakText('SOLARIS active and monitoring. How can I assist?');
        return;
      }

      if (lower.includes('status') || lower.includes('read vitals') || lower.includes('read my health')) {
        triggerAutoNarration();
        return;
      }

      if (lower.includes('check my heart') || lower.includes('heart rate') || lower.includes('cardio')) {
        clearNarrationQueue();
        setActiveHotspotId('heart');
        const speech = `Cardiovascular status for ${activeCrew.name}: Heart rate is currently ${activeCrew.vitals.heartRate} BPM, and HRV is ${activeCrew.vitals.hrv} milliseconds.`;
        setCurrentUtterance(speech);
        speakText(speech);
        return;
      }

      // Symptom Assessment & NLP Correlation
      const sleepMatch =
        lower.includes('sleep') ||
        lower.includes('tired') ||
        lower.includes('insomnia') ||
        lower.includes('exhausted') ||
        lower.includes('fatigue');

      const skinMatch =
        lower.includes('skin') ||
        lower.includes('rash') ||
        lower.includes('itch') ||
        lower.includes('dry') ||
        lower.includes('irritation');

      const spineMatch =
        lower.includes('spine') ||
        lower.includes('back') ||
        lower.includes('lumbar') ||
        lower.includes('elongation') ||
        lower.includes('pain') ||
        lower.includes('stiff');

      if (sleepMatch || skinMatch || spineMatch) {
        clearNarrationQueue();
        setActiveHotspotId('spine_skin');

        let advice = '';
        let detected = {
          sleepIssue: sleepMatch,
          skinIssue: skinMatch,
          spineIssue: spineMatch,
        };
        let mlData: MLAnalysis | undefined = undefined;

        if (!isMockMode()) {
          try {
            const res = await httpClient.assessSymptoms({
              crew_name: activeCrew.id,
              transcript: clean,
              sleep_issue: sleepMatch,
              skin_issue: skinMatch,
              spine_issue: spineMatch,
            });
            setBackendOnline(true);
            setConnectionStatus('CONNECTED');
            advice = res.astra_spoken_response || '';
            detected = res.detected_symptoms;
            mlData = res.ml_analysis;
          } catch (err) {
            console.warn('Real backend /api/assess error; using local engine:', err);
            setBackendOnline(false);
            setConnectionStatus('DISCONNECTED');
          }
        }

        if (!advice) {
          if (spineMatch && sleepMatch) {
            advice =
              'Because your sleep dropped and you are feeling lumbar spine elongation pain in microgravity, your autonomic nervous system is stressed, which explains why your heart rate is jumping. I recommend 20 minutes on the ARED resistive device and a 45-minute circadian light session.';
          } else if (spineMatch) {
            advice =
              'Verbal report noted: microgravity spinal decompression pain. Axial unloading detected. I have logged this finding and recommend spinal compression countermeasure on the ARED harness.';
          } else if (sleepMatch) {
            advice =
              'Circadian sleep deficit confirmed. Your HRV suppression directly correlates with acute sleep deprivation. Recommended countermeasure: scheduled restorative rest and melatonin protocol.';
          } else {
            advice =
              'Dermal irritation logged. Sensor contact points evaluated. Recommendation: apply barrier emollient and inspect smart-garment contact zones.';
          }
        }

        setVerbalSymptoms({
          sleepIssue: detected.sleepIssue,
          skinIssue: detected.skinIssue,
          spineIssue: detected.spineIssue,
          lastTranscript: clean,
          astraAdvice: advice,
          mlAnalysis: mlData,
        });

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#4ECDC4', '#7CD4FD', '#EDECE8'],
          });
        } catch {
          // ignore
        }

        speakText(advice, () => {
          setAstraModeState('LISTENING');
          setStage('STAGE_COMMAND');
        });
        return;
      }

      // Default conversational response
      speakText(`Recorded your report: "${clean}". Mission telemetry remains synchronized.`);
    },
    [activeCrew, addTranscript, clearNarrationQueue, selectCrew, speakText, triggerAutoNarration]
  );

  const submitAssessment = useCallback(
    async (response: string) => {
      await sendInput(response);
    },
    [sendInput]
  );

  const toggleMic = useCallback(() => {
    setIsMicActive((prev) => {
      const next = !prev;
      if (next) {
        solarisVoiceService.startListening();
      } else {
        solarisVoiceService.stopListening();
      }
      return next;
    });
  }, []);

  const wakeSolaris = useCallback(() => {
    setAstraModeState('LISTENING');
    setVoiceState('listening');
    speakText('SOLARIS awake and monitoring.');
  }, [speakText]);

  const sleepSolaris = useCallback(() => {
    stopSpeaking();
    setAstraModeState('SLEEPING');
    setVoiceState('sleeping');
    addTranscript('system', 'SOLARIS entered standby mode.');
  }, [addTranscript, stopSpeaking]);

  const toggleManualMode = useCallback((override?: boolean) => {
    setAstraModeState((prev) => {
      const next = override !== undefined ? (override ? 'MANUAL_MODE' : 'LISTENING') : prev === 'MANUAL_MODE' ? 'LISTENING' : 'MANUAL_MODE';
      if (next === 'MANUAL_MODE') {
        stopSpeaking();
      }
      return next;
    });
  }, [stopSpeaking]);

  const toggleMockMode = useCallback((enabled?: boolean) => {
    const next = enabled !== undefined ? enabled : apiToggleMockMode();
    if (enabled !== undefined) apiSetMockMode(enabled);
    setMockModeActive(next);
  }, []);

  const restartFlow = useCallback(() => {
    lockDashboard();
  }, [lockDashboard]);

  return (
    <SolarisContext.Provider
      value={{
        activeCrew,
        astraMode,
        solarisMode: astraMode,
        stage,
        voiceState,
        activeHotspotId,
        verbalSymptoms,
        transcript,
        currentUtterance,
        isMicActive,
        backendOnline,
        connectionStatus,
        isMockMode: mockModeActive,
        selectCrew,
        authenticateCrew,
        lockDashboard,
        sendInput,
        submitAssessment,
        toggleMic,
        setAstraMode: setAstraModeState,
        setSolarisMode: setAstraModeState,
        speakText,
        stopSpeaking,
        triggerAutoNarration,
        wakeSolaris,
        sleepSolaris,
        wakeAstra: wakeSolaris,
        sleepAstra: sleepSolaris,
        toggleManualMode,
        toggleMockMode,
        restartFlow,
      }}
    >
      {children}
    </SolarisContext.Provider>
  );
};

export const useSolaris = (): SolarisContextType => {
  const context = useContext(SolarisContext);
  if (!context) {
    throw new Error('useSolaris must be used within a SolarisProvider');
  }
  return context;
};

// Backwards-compatibility aliases
export const useAstra = useSolaris;
export const AstraProvider = SolarisProvider;
export const AstraContext = SolarisContext;
export type AstraContextType = SolarisContextType;
