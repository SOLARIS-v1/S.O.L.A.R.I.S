import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  solarisVoiceService,
  SolarisVoiceState,
  VoiceTranscriptItem,
  AssessmentFlowState,
  HealthTelemetryAccessor,
  SavedAssessmentRecord,
  ActiveAstronautInfo,
} from '../services/solarisVoiceService';
import { useAstraStore } from '../api/mockClient';
import { httpClient } from '../api/httpClient';
import { IndicatorType, HealthRecord, Finding } from '../api/types';

export interface SolarisVoiceContextType {
  voiceState: SolarisVoiceState;
  isListening: boolean;
  isSpeaking: boolean;
  isManualMode: boolean;
  speechLoudness: number;
  currentUtterance: string;
  interimTranscript: string;
  transcript: VoiceTranscriptItem[];
  assessmentFlow: AssessmentFlowState;
  highlightedMetric: string | null;
  highlightedZones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen' | 'eyes'>;
  activeAstronaut: ActiveAstronautInfo | null;

  // Actions
  wakeSolaris: () => void;
  sleepSolaris: () => void;
  toggleManualMode: (override?: boolean) => void;
  sendInput: (text: string) => Promise<void>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  startHealthAssessment: () => void;
  cancelHealthAssessment: () => void;
  confirmHealthAssessment: () => Promise<boolean>;
  setHealthAccessor: (accessor: HealthTelemetryAccessor) => void;
  clearTranscript: () => void;
  setHighlightedMetric: (metric: string | null) => void;
  setHighlightedZones: (zones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen' | 'eyes'>) => void;
}

const SolarisVoiceContext = createContext<SolarisVoiceContextType | null>(null);

export const SolarisVoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const {
    activeSubjectId,
    crew,
    records,
    findings,
  } = useAstraStore();

  const [voiceState, setVoiceState] = useState<SolarisVoiceState>('awake');
  const [speechLoudness, setSpeechLoudness] = useState<number>(0);
  const [currentUtterance, setCurrentUtterance] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [transcript, setTranscript] = useState<VoiceTranscriptItem[]>(() => [
    {
      id: 'init-1',
      sender: 'solaris',
      text: 'Hello. SOLARIS is online. How can I assist you?',
      timestamp: '00:00:00',
    },
  ]);

  const [highlightedMetric, setHighlightedMetric] = useState<string | null>(null);
  const [highlightedZones, setHighlightedZones] = useState<
    Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen' | 'eyes'>
  >([]);

  const [assessmentFlow, setAssessmentFlow] = useState<AssessmentFlowState>({
    isActive: false,
    stage: 'idle',
    currentStepIndex: 0,
    answers: {},
    summaryText: '',
    affectedZones: [],
  });

  const activeAstronaut = crew.find((c) => c.id === activeSubjectId) || crew[0] || null;

  // Add transcript helper
  const addTranscript = useCallback((sender: 'solaris' | 'astronaut' | 'system', text: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    setTranscript((prev) => [
      ...prev,
      {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender,
        text,
        timestamp: timeStr,
      },
    ]);
  }, []);

  // Set up strictly grounded application data accessor (Zero hardcoded numbers)
  useEffect(() => {
    const controlledAccessor: HealthTelemetryAccessor = {
      getActiveAstronaut: () => {
        if (!activeAstronaut) return null;
        return {
          id: activeAstronaut.id,
          name: activeAstronaut.name,
          callsign: activeAstronaut.callsign,
          role: activeAstronaut.role,
          missionDay: activeAstronaut.mission_day,
        };
      },

      getMeasurement: (metricKey: string) => {
        const subId = activeSubjectId || activeAstronaut?.id;
        const matchingRecords = records
          .filter((r) => r.subject_id === subId && r.type === (metricKey as IndicatorType))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const latest = matchingRecords[0];
        if (!latest || latest.value === undefined || latest.value === null) return null;

        return {
          value: latest.value,
          unit: latest.unit,
          isSimulated: latest.is_simulated || latest.source === 'simulated_device',
          provenance: latest.is_simulated ? 'simulated' : 'measured',
          timestamp: latest.timestamp,
        };
      },

      getBloodPressure: () => {
        const subId = activeSubjectId || activeAstronaut?.id;
        const sysRecords = records
          .filter((r) => r.subject_id === subId && r.type === 'blood_pressure_sys')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const diaRecords = records
          .filter((r) => r.subject_id === subId && r.type === 'blood_pressure_dia')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (sysRecords.length === 0 || diaRecords.length === 0) return null;

        const sys = sysRecords[0];
        const dia = diaRecords[0];
        if (sys.value === undefined || dia.value === undefined) return null;

        const map = Math.round(dia.value + (sys.value - dia.value) / 3);

        return {
          systolic: sys.value,
          diastolic: dia.value,
          map,
          unit: 'mmHg',
          isSimulated: sys.is_simulated || dia.is_simulated,
        };
      },

      getSleepReport: () => {
        const subId = activeSubjectId || activeAstronaut?.id;
        const sleepRecords = records
          .filter((r) => r.subject_id === subId && r.type === 'sleep')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (sleepRecords.length === 0) return null;
        const latest = sleepRecords[0];
        if (latest.value === undefined || latest.value === null) return null;

        return {
          durationHours: latest.value,
          isSimulated: latest.is_simulated || latest.source === 'simulated_device',
        };
      },

      getRadiationReport: () => {
        const subId = activeSubjectId || activeAstronaut?.id;
        const radRecords = records
          .filter((r) => r.subject_id === subId && r.type === 'radiation_rate')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (radRecords.length === 0) return null;

        const latest = radRecords[0];
        if (latest.value === undefined || latest.value === null) return null;

        return {
          dailyRate_mSv: latest.value,
          isSimulated: latest.is_simulated || latest.source === 'simulated_device',
        };
      },

      getLatestFinding: () => {
        const subId = activeSubjectId || activeAstronaut?.id;
        const subFindings = findings
          .filter((f) => f.subject_id === subId && f.status !== 'acknowledged')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (subFindings.length === 0) return null;
        const top = subFindings[0];

        return {
          id: top.id,
          summary: top.summary,
          detail: top.detail,
          level: top.level,
          observedValue: top.observed_value,
          baselineValue: top.baseline_value,
          bodyRegion: top.body_region,
        };
      },

      saveAssessmentResult: async (saved: SavedAssessmentRecord) => {
        const subId = activeSubjectId || activeAstronaut?.id || 'vance';

        const hasSleep = saved.affectedZones.includes('head');
        const hasSpine = saved.affectedZones.includes('spine');
        const hasSkin = saved.affectedZones.includes('skin');

        // Keep the confirmed verbal assessment as a transcript; do not convert it into numeric telemetry.
        // Persist to SQLite Database via backend inference endpoint
        try {
          await httpClient.assessSymptoms({
            crew_name: subId,
            transcript: saved.summary,
            sleep_issue: hasSleep,
            skin_issue: hasSkin,
            spine_issue: hasSpine,
          });
        } catch (err) {
          console.warn('[SOLARIS Voice] Backend SQLite persistence notice:', err);
        }

        // 4. Save offline cache in localStorage
        try {
          const key = `solaris_assessments_${subId}`;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          existing.unshift(saved);
          localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
        } catch {
          // ignore storage error
        }

        return true;
      },
    };

    solarisVoiceService.setTelemetryAccessor(controlledAccessor);
  }, [activeAstronaut, activeSubjectId, records, findings]);

  // Wire service callbacks into React state
  useEffect(() => {
    solarisVoiceService.setCallbacks({
      onStateChange: (st) => setVoiceState(st),
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setInterimTranscript('');
          addTranscript('astronaut', text);
        } else {
          setInterimTranscript(text);
        }
      },
      onLoudness: (lvl) => setSpeechLoudness(lvl),
      onUtteranceStart: (text) => {
        setCurrentUtterance(text);
        addTranscript('solaris', text);
      },
      onUtteranceEnd: () => {
        setCurrentUtterance('');
      },
      onNavigate: (route) => {
        if (navigate) {
          navigate(route);
        }
      },
      onAssessmentFlowChange: (flow) => {
        setAssessmentFlow({ ...flow });
        if (flow.affectedZones) {
          setHighlightedZones(flow.affectedZones);
        }
      },
    });

    return () => {
      solarisVoiceService.stopListening();
      solarisVoiceService.stopSpeaking();
    };
  }, [navigate, addTranscript]);

  // Public Actions
  const wakeSolaris = useCallback(() => {
    solarisVoiceService.handleVoiceInput('Wake up, SOLARIS');
  }, []);

  const sleepSolaris = useCallback(() => {
    solarisVoiceService.handleVoiceInput('Sleep SOLARIS');
  }, []);

  const toggleManualMode = useCallback((override?: boolean) => {
    if (override !== undefined) {
      if (override) {
        solarisVoiceService.setState('manual_mode');
        solarisVoiceService.stopSpeaking();
        solarisVoiceService.stopListening();
      } else {
        solarisVoiceService.setState('awake');
        solarisVoiceService.startListening();
      }
    } else {
      const cur = solarisVoiceService.getState();
      if (cur === 'manual_mode') {
        solarisVoiceService.setState('awake');
        solarisVoiceService.startListening();
      } else {
        solarisVoiceService.setState('manual_mode');
        solarisVoiceService.stopSpeaking();
        solarisVoiceService.stopListening();
      }
    }
  }, []);

  const sendInput = useCallback(async (text: string) => {
    addTranscript('astronaut', text);
    const result = await solarisVoiceService.handleVoiceInput(text);
    if (result.highlightMetric) {
      setHighlightedMetric(result.highlightMetric);
    }
  }, [addTranscript]);

  const speak = useCallback(async (text: string) => {
    await solarisVoiceService.speak(text);
  }, []);

  const stopSpeaking = useCallback(() => {
    solarisVoiceService.stopSpeaking();
  }, []);

  const startHealthAssessment = useCallback(() => {
    solarisVoiceService.startConversationalAssessment();
  }, []);

  const cancelHealthAssessment = useCallback(() => {
    solarisVoiceService.handleVoiceInput('cancel');
  }, []);

  const confirmHealthAssessment = useCallback(async () => {
    const res = await solarisVoiceService.advanceAssessmentWorkflow('confirm');
    return res.handled;
  }, []);

  const setHealthAccessor = useCallback((accessor: HealthTelemetryAccessor) => {
    solarisVoiceService.setTelemetryAccessor(accessor);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
  }, []);

  return (
    <SolarisVoiceContext.Provider
      value={{
        voiceState,
        isListening: voiceState === 'listening',
        isSpeaking: voiceState === 'speaking',
        isManualMode: voiceState === 'manual_mode',
        speechLoudness,
        currentUtterance,
        interimTranscript,
        transcript,
        assessmentFlow,
        highlightedMetric,
        highlightedZones,
        activeAstronaut: activeAstronaut
          ? {
              id: activeAstronaut.id,
              name: activeAstronaut.name,
              callsign: activeAstronaut.callsign,
              role: activeAstronaut.role,
              missionDay: activeAstronaut.mission_day,
            }
          : null,

        wakeSolaris,
        sleepSolaris,
        toggleManualMode,
        sendInput,
        speak,
        stopSpeaking,
        startHealthAssessment,
        cancelHealthAssessment,
        confirmHealthAssessment,
        setHealthAccessor,
        clearTranscript,
        setHighlightedMetric,
        setHighlightedZones,
      }}
    >
      {children}
    </SolarisVoiceContext.Provider>
  );
};

export const useSolarisVoice = (): SolarisVoiceContextType => {
  const context = useContext(SolarisVoiceContext);
  if (!context) {
    throw new Error('useSolarisVoice must be used within a SolarisVoiceProvider');
  }
  return context;
};

// Backwards-compatibility aliases
export const useVoiceAssistant = useSolarisVoice;
export const useAstraVoice = useSolarisVoice;
export const VoiceAssistantProvider = SolarisVoiceProvider;
