import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type AstraMode = 'AUTH_GATE' | 'NARRATING' | 'LISTENING' | 'MANUAL_MODE' | 'SLEEPING';

export interface CrewVitals {
  heartRate: number;
  hrv: number;
  spo2: number;
  respRate: number;
  coreTemp: number;
  radiation_mSv: number;
  sleepHours: number;
}

export interface HotspotNarration {
  hotspot: string;
  text: string;
}

export interface CrewProfile {
  id: 'vance' | 'patel' | 'chen';
  name: string;
  callsign: string;
  role: string;
  status: 'Nominal' | 'Caution' | 'Warning';
  badgeColor: string;
  vitals: CrewVitals;
  summaryVerdict: string;
  narrationScript: HotspotNarration[];
}

export interface VerbalSymptoms {
  sleepIssue: boolean;
  skinIssue: boolean;
  spineIssue: boolean;
  lastTranscript: string;
  astraAdvice: string;
}

export interface TranscriptMessage {
  id: string;
  sender: 'astra' | 'crew';
  text: string;
  timestamp: string;
}

export interface AstraContextType {
  activeCrew: CrewProfile | null;
  astraMode: AstraMode;
  activeHotspotId: string | null;
  verbalSymptoms: VerbalSymptoms;
  transcript: TranscriptMessage[];
  currentUtterance: string;
  isMicActive: boolean;
  selectCrew: (crewId: 'vance' | 'patel' | 'chen') => void;
  lockDashboard: () => void;
  sendInput: (input: string) => void;
  toggleMic: () => void;
  setAstraMode: (mode: AstraMode) => void;
  speakText: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  triggerAutoNarration: (profile?: CrewProfile) => void;
}

export const CREW_PROFILES: Record<'vance' | 'patel' | 'chen', CrewProfile> = {
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
      sleepHours: 6.8,
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
        text: 'NASA Archer wristband records sleep duration at 6.8 hours with moderate circadian phase stability.',
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
      sleepHours: 7.6,
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
        text: 'Archer actigraphy confirms 7.6 hours of deep restful sleep and excellent circadian readiness.',
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
      sleepHours: 4.6,
    },
    summaryVerdict:
      'Flight Engineer Chen, your telemetry shows significant microgravity spinal unloading strain and an acute sleep deficit of 4.6 hours, with elevated heart rate.',
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
        text: 'NASA Archer actigraphy flags a sleep deficit at only 4.6 hours, indicating acute circadian desynchrony.',
      },
      {
        hotspot: 'dosimeter',
        text: 'HERA active dosimeter telemetry confirms cumulative radiation within solar quiet thresholds.',
      },
    ],
  },
};

const AstraContext = createContext<AstraContextType | undefined>(undefined);

export const AstraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCrew, setActiveCrew] = useState<CrewProfile | null>(null);
  const [astraMode, setAstraMode] = useState<AstraMode>('AUTH_GATE');
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [currentUtterance, setCurrentUtterance] = useState<string>(
    'ASTRA Medical Interface online. Please state or type your crew name to unlock your telemetry.'
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
      sender: 'astra',
      text: 'ASTRA Medical Interface online. Please state or type your crew name to unlock your telemetry.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const autoNarrationTimeoutRef = useRef<NodeJS.Timeout[]>([]);

  const addTranscript = useCallback((sender: 'astra' | 'crew', text: string) => {
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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }
  }, []);

  const speakText = useCallback(
    (text: string, onEnd?: () => void) => {
      setCurrentUtterance(text);
      addTranscript('astra', text);

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        onEnd?.();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Select a natural calm English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.name.includes('Samantha') ||
            v.name.includes('Natural') ||
            v.name.includes('Google UK English Female') ||
            v.name.includes('Karen') ||
            v.name.includes('Zira') ||
            v.lang.startsWith('en')) &&
          !v.name.includes('Whisper')
      );
      if (preferred) utterance.voice = preferred;

      isSpeakingRef.current = true;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        onEnd?.();
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        onEnd?.();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis autoplay restriction or error:', err);
        isSpeakingRef.current = false;
        onEnd?.();
      }
    },
    [addTranscript]
  );

  const clearNarrationQueue = useCallback(() => {
    autoNarrationTimeoutRef.current.forEach((t) => clearTimeout(t));
    autoNarrationTimeoutRef.current = [];
    stopSpeaking();
  }, [stopSpeaking]);

  // STEP 2 & 3: Auto-Narration Sequence with Anatomical Hotspot Progression
  const triggerAutoNarration = useCallback(
    (profileToNarrate?: CrewProfile) => {
      const crew = profileToNarrate || activeCrew;
      if (!crew) return;

      clearNarrationQueue();
      setAstraMode('NARRATING');

      // Sequence: Welcome -> Hotspot 1 -> Hotspot 2 -> Hotspot 3 -> Hotspot 4 -> Hotspot 5 -> Summary -> Symptom Question
      const welcome = `Welcome back, ${crew.name}. Synchronizing your Astroskin telemetry and daily biometrics now.`;

      speakText(welcome, () => {
        let cumulativeDelay = 0;

        crew.narrationScript.forEach((step, idx) => {
          const timeout = setTimeout(() => {
            setActiveHotspotId(step.hotspot);
            speakText(step.text, () => {
              // If last item in script
              if (idx === crew.narrationScript.length - 1) {
                const summaryTimeout = setTimeout(() => {
                  setActiveHotspotId(null);
                  speakText(crew.summaryVerdict, () => {
                    const questionTimeout = setTimeout(() => {
                      speakText(
                        'How are you feeling today? Any issues with sleep, skin irritation, or spine pain that you can feel?',
                        () => {
                          setAstraMode('LISTENING');
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
          cumulativeDelay += 4200; // time window per metric node
        });
      });
    },
    [activeCrew, clearNarrationQueue, speakText]
  );

  // Authenticate Crew Member
  const selectCrew = useCallback(
    (crewId: 'vance' | 'patel' | 'chen') => {
      const profile = CREW_PROFILES[crewId];
      if (!profile) return;

      clearNarrationQueue();
      setActiveCrew(profile);
      triggerAutoNarration(profile);
    },
    [clearNarrationQueue, triggerAutoNarration]
  );

  const lockDashboard = useCallback(() => {
    clearNarrationQueue();
    setActiveCrew(null);
    setAstraMode('AUTH_GATE');
    setActiveHotspotId(null);
    setCurrentUtterance('ASTRA Medical Interface online. Please state or type your crew name to unlock your telemetry.');
    speakText('ASTRA Medical Interface online. Please state or type your crew name to unlock your telemetry.');
  }, [clearNarrationQueue, speakText]);

  // Main input processor (Handles both SpeechRecognition and Text input)
  const sendInput = useCallback(
    (rawInput: string) => {
      const clean = rawInput.trim();
      if (!clean) return;

      addTranscript('crew', clean);
      const lower = clean.toLowerCase();

      // STEP 1: Handle Auth Gate
      if (!activeCrew) {
        if (lower.includes('vance') || lower.includes('alex') || lower.includes('commander')) {
          selectCrew('vance');
          return;
        }
        if (lower.includes('patel') || lower.includes('specialist') || lower.includes('eva')) {
          selectCrew('patel');
          return;
        }
        if (lower.includes('chen') || lower.includes('maya') || lower.includes('engineer')) {
          selectCrew('chen');
          return;
        }
        speakText('Crew member not recognized. Please state Vance, Patel, or Chen to authenticate.');
        return;
      }

      // STEP 4: Hands-free Voice Commands
      // 1. "read manually" or "manual mode"
      if (lower.includes('read manually') || lower.includes('manual mode') || lower.includes('stop reading')) {
        clearNarrationQueue();
        setAstraMode('MANUAL_MODE');
        setActiveHotspotId(null);
        setCurrentUtterance('Manual telemetry inspection active. Voice narration paused.');
        speakText('Manual telemetry inspection active. You can review your charts silently.');
        return;
      }

      // 2. "sleep astra"
      if (lower.includes('sleep astra') || lower.includes('go to sleep') || lower.includes('standby')) {
        clearNarrationQueue();
        setAstraMode('SLEEPING');
        setActiveHotspotId(null);
        speakText("Entering standby mode. Say 'Wake ASTRA' when you need me.");
        return;
      }

      // 3. "wake astra"
      if (lower.includes('wake astra') || lower.includes('wake up') || lower.includes('astra online')) {
        setAstraMode('LISTENING');
        speakText('ASTRA active and monitoring. How can I assist?');
        return;
      }

      // 4. "read vitals" or "status"
      if (lower.includes('status') || lower.includes('read vitals') || lower.includes('tell me my status')) {
        triggerAutoNarration();
        return;
      }

      // STEP 3: Verbal Symptom Assessment Parser
      const sleepMatch =
        lower.includes('sleep') ||
        lower.includes('tired') ||
        lower.includes('insomnia') ||
        lower.includes('exhausted') ||
        lower.includes('restless') ||
        lower.includes("couldn't sleep") ||
        lower.includes('fatigue');

      const skinMatch =
        lower.includes('skin') ||
        lower.includes('rash') ||
        lower.includes('itch') ||
        lower.includes('dry') ||
        lower.includes('irritation') ||
        lower.includes('erythema') ||
        lower.includes('contact');

      const spineMatch =
        lower.includes('spine') ||
        lower.includes('back') ||
        lower.includes('lumbar') ||
        lower.includes('elongation') ||
        lower.includes('ache') ||
        lower.includes('vertebrae') ||
        lower.includes('pain') ||
        lower.includes('stiff');

      if (sleepMatch || skinMatch || spineMatch) {
        clearNarrationQueue();
        setActiveHotspotId('spine_skin');

        let advice = '';
        if (spineMatch && sleepMatch) {
          advice =
            'Because your sleep dropped and you are feeling lumbar spine elongation pain in microgravity, your autonomic nervous system is stressed, which explains why your heart rate is jumping. I recommend 20 minutes on the ARED resistive device and a 45-minute circadian light session.';
        } else if (spineMatch) {
          advice =
            'Verbal report noted: microgravity spinal decompression pain. Axial unloading detected on 3-axis IMU. I have logged this finding and recommend spinal compression countermeasure on the ARED harness.';
        } else if (sleepMatch) {
          advice =
            'Circadian sleep deficit confirmed. Your HRV suppression directly correlates with acute sleep deprivation. Recommended countermeasure: scheduled 30-minute restorative rest and melatonin protocol.';
        } else {
          advice =
            'Dermal irritation logged. Sensor contact points evaluated. Recommendation: apply barrier emollient and inspect smart-garment contact zones.';
        }

        setVerbalSymptoms({
          sleepIssue: sleepMatch,
          skinIssue: skinMatch,
          spineIssue: spineMatch,
          lastTranscript: clean,
          astraAdvice: advice,
        });

        speakText(advice, () => {
          setAstraMode('LISTENING');
        });
        return;
      }

      // Default conversational response
      speakText(`Recorded your report: "${clean}". Vitals and mission timeline remain synchronized.`);
    },
    [activeCrew, addTranscript, clearNarrationQueue, selectCrew, speakText, triggerAutoNarration]
  );

  // Setup Web Speech API SpeechRecognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser. Falling back to text input.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript;
        if (!isSpeakingRef.current) {
          sendInput(text);
        }
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', err.error);
      }
    };

    recognition.onend = () => {
      // Keep listening if mode is not sleeping and mic is enabled
      if (isMicActive && astraMode !== 'SLEEPING') {
        try {
          recognition.start();
        } catch {
          // already started
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // ignore
    }

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [astraMode, isMicActive, sendInput]);

  const toggleMic = useCallback(() => {
    setIsMicActive((prev) => {
      const next = !prev;
      if (!next && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      } else if (next && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
      return next;
    });
  }, []);

  return (
    <AstraContext.Provider
      value={{
        activeCrew,
        astraMode,
        activeHotspotId,
        verbalSymptoms,
        transcript,
        currentUtterance,
        isMicActive,
        selectCrew,
        lockDashboard,
        sendInput,
        toggleMic,
        setAstraMode,
        speakText,
        stopSpeaking,
        triggerAutoNarration,
      }}
    >
      {children}
    </AstraContext.Provider>
  );
};

export const useAstra = () => {
  const context = useContext(AstraContext);
  if (!context) {
    throw new Error('useAstra must be used within an AstraProvider');
  }
  return context;
};
