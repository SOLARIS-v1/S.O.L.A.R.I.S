import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { voiceAssistantService, CrewData, AssessmentResponse } from '../services/voiceAssistantService';
import confetti from 'canvas-confetti';

export type FlowStage = 'STAGE_AUTH' | 'STAGE_BRIEFING' | 'STAGE_ASSESSMENT' | 'STAGE_COMMAND';
export type VoiceState = 'sleeping' | 'awake' | 'listening' | 'speaking';

export interface TranscriptItem {
  id: string;
  sender: 'astra' | 'astronaut' | 'system';
  text: string;
  timestamp: string;
}

interface VoiceAssistantContextType {
  stage: FlowStage;
  voiceState: VoiceState;
  isManualMode: boolean;
  highlightedMetric: string | null;
  highlightedZones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen'>;
  speechLoudness: number;
  crewData: CrewData | null;
  transcript: TranscriptItem[];
  currentUtterance: string;
  interimTranscript: string;

  // Actions
  authenticateCrew: (name: string) => Promise<boolean>;
  submitAssessment: (response: string) => Promise<void>;
  toggleManualMode: (override?: boolean) => void;
  wakeAstra: () => void;
  sleepAstra: () => void;
  sendInput: (text: string) => void;
  restartFlow: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | null>(null);

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stage, setStage] = useState<FlowStage>('STAGE_AUTH');
  const [voiceState, setVoiceState] = useState<VoiceState>('awake');
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [highlightedMetric, setHighlightedMetric] = useState<string | null>(null);
  const [highlightedZones, setHighlightedZones] = useState<Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen'>>([]);
  const [speechLoudness, setSpeechLoudness] = useState<number>(0);
  const [crewData, setCrewData] = useState<CrewData | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentUtterance, setCurrentUtterance] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  const stageRef = useRef(stage);
  stageRef.current = stage;
  const isManualModeRef = useRef(isManualMode);
  isManualModeRef.current = isManualMode;
  const crewDataRef = useRef(crewData);
  crewDataRef.current = crewData;

  const addTranscript = useCallback((sender: 'astra' | 'astronaut' | 'system', text: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setTranscript((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender,
        text,
        timestamp: timeStr,
      },
    ]);
  }, []);

  const speakAstra = useCallback(
    async (text: string, onWord?: (word: string) => void) => {
      addTranscript('astra', text);
      setCurrentUtterance(text);
      if (!isManualModeRef.current) {
        await voiceAssistantService.speak(text, onWord);
      }
    },
    [addTranscript]
  );

  // STAGE_BRIEFING: Automated Telemetry Narration
  const runBriefing = useCallback(
    async (crew: CrewData) => {
      setStage('STAGE_BRIEFING');
      setHighlightedZones(['heart', 'head']);

      const hr = crew.vitals.heartRate;
      const spo2 = crew.vitals.spo2;
      const rad = crew.vitals.radiation_mSv;
      const hrv = crew.vitals.hrv;

      const speechIntro = `Welcome back, ${crew.name}. Here is your status summary.`;
      await speakAstra(speechIntro);

      // 1. SpO2 and Radiation
      setHighlightedMetric('spo2');
      await speakAstra(`SpO2 is nominal at ${spo2} percent, and cumulative radiation reads ${rad} milliSieverts.`);

      // 2. Heart rate with warning if elevated
      setHighlightedMetric('heartRate');
      setHighlightedZones(['heart']);
      if (hr > 85) {
        await speakAstra(`However, your heart rate shows a slight elevation at ${hr} beats per minute.`);
      } else {
        await speakAstra(`Heart rate is calm and steady at ${hr} beats per minute.`);
      }

      // 3. HRV check
      setHighlightedMetric('hrv');
      if (hrv < 45) {
        await speakAstra(`Your heart rate variability is dipping at ${hrv} milliseconds, reflecting microgravity autonomic strain.`);
      } else {
        await speakAstra(`Heart rate variability is resilient at ${hrv} milliseconds.`);
      }

      setHighlightedMetric(null);

      // Transition to STAGE_ASSESSMENT
      setStage('STAGE_ASSESSMENT');
      setHighlightedZones(['head', 'spine', 'skin']);
      await speakAstra('How are you feeling today? Are you experiencing any issues with sleep, skin irritation, or spine and back pain?');
      voiceAssistantService.startListening();
    },
    [speakAstra]
  );

  // STAGE_AUTH: Authenticate Crew Name
  const authenticateCrew = useCallback(
    async (rawName: string): Promise<boolean> => {
      const name = rawName.trim();
      if (!name) return false;

      addTranscript('astronaut', name);
      const data = await voiceAssistantService.fetchCrewData(name);
      setCrewData(data);

      addTranscript('system', `Biometric lock released for ${data.name} (${data.role}).`);
      await runBriefing(data);
      return true;
    },
    [addTranscript, runBriefing]
  );

  // STAGE_ASSESSMENT: Process Verbal Symptoms & Return Correlated Insight
  const submitAssessment = useCallback(
    async (response: string) => {
      if (!response.trim()) return;

      addTranscript('astronaut', response);
      const subId = crewDataRef.current?.id || 'ASTRA-CREW';
      const result: AssessmentResponse = await voiceAssistantService.postAssessment(response, subId);

      setHighlightedZones(result.affectedZones);

      if (crewDataRef.current) {
        setCrewData({
          ...crewDataRef.current,
          recommendations: [...result.recommendations, ...crewDataRef.current.recommendations],
        });
      }

      // Speak Correlated Insight
      await speakAstra(result.insight);

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.65 },
          colors: ['#6FBF9B', '#B8CCE6', '#E0BE6A'],
        });
      } catch {
        // ignore
      }

      // Transition to STAGE_COMMAND
      setStage('STAGE_COMMAND');
      await speakAstra('Assessment recorded. Standing by for voice commands. Call "read manually" to inspect silently, or "sleep Astra" to enter standby.');
      voiceAssistantService.startListening();
    },
    [addTranscript, speakAstra]
  );

  // Handle Command parsing
  const handleCommand = useCallback(
    async (cmd: string) => {
      const lower = cmd.toLowerCase().trim();

      // "sleep astra"
      if (lower.includes('sleep astra') || lower.includes('go to sleep') || lower.includes('standby mode')) {
        addTranscript('astronaut', cmd);
        await speakAstra("Entering standby mode. Call 'Wake ASTRA' if you need me.");
        voiceAssistantService.stopSpeaking();
        setVoiceState('sleeping');
        return;
      }

      // "wake astra"
      if (lower.includes('wake astra') || lower.includes('hey astra') || lower.includes('wake up')) {
        addTranscript('astronaut', cmd);
        setVoiceState('listening');
        voiceAssistantService.startListening();
        await speakAstra('ASTRA online. How can I assist you?');
        return;
      }

      // "read manually" or "manual mode"
      if (lower.includes('read manually') || lower.includes('manual mode') || lower.includes('quiet mode') || lower.includes('stop reading')) {
        addTranscript('astronaut', cmd);
        setIsManualMode(true);
        voiceAssistantService.stopSpeaking();
        await speakAstra('Manual mode activated. Voice narration paused. Inspect telemetry at your leisure.');
        return;
      }

      // "voice mode" / "resume narration"
      if (lower.includes('voice mode') || lower.includes('resume narration') || lower.includes('read out loud')) {
        addTranscript('astronaut', cmd);
        setIsManualMode(false);
        await speakAstra('Voice narration resumed.');
        return;
      }

      // "check in" / "re-assess"
      if (lower.includes('check in') || lower.includes('symptom') || lower.includes('start assessment')) {
        addTranscript('astronaut', cmd);
        setStage('STAGE_ASSESSMENT');
        setHighlightedZones(['head', 'spine', 'skin']);
        await speakAstra('How are you feeling right now? Describe any symptoms or discomfort.');
        return;
      }

      // General query handling
      addTranscript('astronaut', cmd);
      if (lower.includes('heart') || lower.includes('pulse')) {
        setHighlightedMetric('heartRate');
        setHighlightedZones(['heart']);
        await speakAstra(`Heart rate is currently ${crewDataRef.current?.vitals.heartRate || 72} beats per minute with normal sinus rhythm.`);
      } else if (lower.includes('oxygen') || lower.includes('spo2')) {
        setHighlightedMetric('spo2');
        setHighlightedZones(['lungs']);
        await speakAstra(`Oxygen saturation is steady at ${crewDataRef.current?.vitals.spo2 || 98} percent.`);
      } else if (lower.includes('radiation')) {
        setHighlightedMetric('radiation');
        await speakAstra(`Cumulative mission radiation is ${crewDataRef.current?.vitals.radiation_mSv || 48.6} milliSieverts, well within career safety limits.`);
      } else {
        await speakAstra(`Telemetry confirmed. All monitored life-support systems remain within operational safety envelope.`);
      }
    },
    [addTranscript, speakAstra]
  );

  // Incoming Voice Transcript Handler
  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      setInterimTranscript(text);

      if (!isFinal) return;
      setInterimTranscript('');

      const clean = text.trim();
      if (!clean) return;

      // When in STAGE_AUTH: listen for crew name
      if (stageRef.current === 'STAGE_AUTH') {
        const lower = clean.toLowerCase();
        if (
          lower.includes('vance') ||
          lower.includes('patel') ||
          lower.includes('chen') ||
          lower.includes('maya') ||
          lower.includes('alex') ||
          lower.includes('daniel') ||
          lower.includes('sofia') ||
          lower.includes('specialist') ||
          lower.includes('commander')
        ) {
          authenticateCrew(clean);
        }
        return;
      }

      // When in STAGE_ASSESSMENT: listen for symptom answers
      if (stageRef.current === 'STAGE_ASSESSMENT') {
        submitAssessment(clean);
        return;
      }

      // When in STAGE_COMMAND: parse voice commands
      handleCommand(clean);
    },
    [authenticateCrew, submitAssessment, handleCommand]
  );

  // Initialize service callbacks and startup greeting
  useEffect(() => {
    voiceAssistantService.setCallbacks(
      handleTranscript,
      (st) => setVoiceState(st),
      (level) => setSpeechLoudness(level)
    );

    // Initial load greeting in STAGE_AUTH
    const timer = setTimeout(() => {
      const greeting = 'ASTRA Medical Interface online. Please state or type your crew name.';
      addTranscript('astra', greeting);
      setCurrentUtterance(greeting);
      voiceAssistantService.speak(greeting).then(() => {
        voiceAssistantService.startListening();
      });
    }, 600);

    return () => {
      clearTimeout(timer);
      voiceAssistantService.stopListening();
      voiceAssistantService.stopSpeaking();
    };
  }, [addTranscript, handleTranscript]);

  const toggleManualMode = useCallback((override?: boolean) => {
    setIsManualMode((prev) => {
      const next = override !== undefined ? override : !prev;
      if (next) {
        voiceAssistantService.stopSpeaking();
      }
      return next;
    });
  }, []);

  const wakeAstra = useCallback(() => {
    setVoiceState('listening');
    voiceAssistantService.startListening();
    speakAstra('ASTRA awake and listening.');
  }, [speakAstra]);

  const sleepAstra = useCallback(() => {
    voiceAssistantService.stopSpeaking();
    voiceAssistantService.stopListening();
    setVoiceState('sleeping');
    addTranscript('system', 'ASTRA entered standby mode.');
  }, [addTranscript]);

  const sendInput = useCallback(
    (text: string) => {
      handleTranscript(text, true);
    },
    [handleTranscript]
  );

  const restartFlow = useCallback(() => {
    setStage('STAGE_AUTH');
    setCrewData(null);
    setHighlightedMetric(null);
    setHighlightedZones([]);
    const greeting = 'ASTRA Medical Interface online. Please state or type your crew name.';
    addTranscript('astra', greeting);
    setCurrentUtterance(greeting);
    voiceAssistantService.speak(greeting).then(() => {
      voiceAssistantService.startListening();
    });
  }, [addTranscript]);

  return (
    <VoiceAssistantContext.Provider
      value={{
        stage,
        voiceState,
        isManualMode,
        highlightedMetric,
        highlightedZones,
        speechLoudness,
        crewData,
        transcript,
        currentUtterance,
        interimTranscript,
        authenticateCrew,
        submitAssessment,
        toggleManualMode,
        wakeAstra,
        sleepAstra,
        sendInput,
        restartFlow,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = (): VoiceAssistantContextType => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
};
