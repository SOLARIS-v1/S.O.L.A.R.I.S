import { create } from 'zustand';
import {
  HealthRecord,
  Finding,
  CrewMember,
  MissionTask,
  LinkState,
  MissionEnvironment,
  IndicatorType,
  SimulationScenario,
  VoiceChatMessage,
  MissionEnvironmentMetrics,
  DailyAssessmentRecord,
  HealthTimelineEvent,
  GuidanceRecommendation,
} from './types';
import { generateSeedRecords, CREW_MEMBERS, SEEDED_TASKS } from '../mock/seed';
import { evaluateSubjectRecords } from '../mock/engine';
import { INDICATOR_THRESHOLDS } from '../data/thresholds';
import { INITIAL_GUIDANCE, INITIAL_TIMELINE_EVENTS } from '../data/initialGuidanceAndTimeline';

const STORAGE_KEY_RECORDS = 'astra_records_v1';
const STORAGE_KEY_FINDINGS_STATUS = 'astra_findings_status_v1';
const STORAGE_KEY_ASSESSMENTS = 'astra_assessments_v1';
const STORAGE_KEY_TIMELINE = 'astra_timeline_v1';
const STORAGE_KEY_GUIDANCE = 'astra_guidance_v1';

interface StoreState {
  records: HealthRecord[];
  crew: CrewMember[];
  tasks: MissionTask[];
  findings: Finding[];
  dailyAssessments: DailyAssessmentRecord[];
  timelineEvents: HealthTimelineEvent[];
  guidanceList: GuidanceRecommendation[];
  activeSubjectId: string;
  linkState: LinkState;
  environment: MissionEnvironment;
  lastSyncTime: string;
  isSimulating: boolean;
  simulationTick: number;
  simulationScenario: SimulationScenario;
  simulationSpeed: number;
  disconnectedSensors: string[];
  voiceAssistantOpen: boolean;
  voiceMessages: VoiceChatMessage[];
  environmentMetrics: MissionEnvironmentMetrics;

  // Actions
  setActiveSubject: (id: string) => void;
  setLinkState: (state: LinkState) => void;
  setEnvironment: (env: MissionEnvironment) => void;
  postRecord: (record: Omit<HealthRecord, 'id' | 'synced' | 'synced_at'>) => HealthRecord;
  submitDailyAssessment: (assessment: Omit<DailyAssessmentRecord, 'id'>) => DailyAssessmentRecord;
  addTimelineEvent: (event: Omit<HealthTimelineEvent, 'id'>) => HealthTimelineEvent;
  updateGuidanceStatus: (id: string, status: GuidanceRecommendation['status']) => void;
  updateFindingStatus: (id: string, status: Finding['status'], notes?: string) => void;
  resolveFinding: (id: string, notes?: string) => void;
  requestAssessment: (subjectId: string, category: string) => void;
  injectFault: (fault: 'fever' | 'bad_sleep' | 'raised_bp' | 'missed_checkin' | 'link_down', subjectId?: string) => void;
  setSimulationScenario: (scenario: SimulationScenario) => void;
  setSimulationSpeed: (speed: number) => void;
  toggleSensorConnection: (sensorId: string) => void;
  setVoiceAssistantOpen: (open: boolean) => void;
  addVoiceMessage: (msg: Omit<VoiceChatMessage, 'id' | 'timestamp'>) => void;
  clearVoiceMessages: () => void;
  updateEnvironmentMetrics: (partial: Partial<MissionEnvironmentMetrics>) => void;
  drainSyncQueue: () => number;
  toggleSimulator: (force?: boolean) => void;
  stepSimulation: () => void;
  resetAll: () => void;
}

function loadInitialRecords(): HealthRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read from localStorage, using seed data:', e);
  }
  const initial = generateSeedRecords();
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(initial));
  } catch (e) {
    // Ignore storage quota
  }
  return initial;
}

function computeAllFindings(records: HealthRecord[]): Finding[] {
  const allFindings: Finding[] = [];
  let savedStatus: Record<string, { status: Finding['status']; notes?: string }> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FINDINGS_STATUS);
    if (raw) savedStatus = JSON.parse(raw);
  } catch (e) {
    // ignore
  }

  for (const c of CREW_MEMBERS) {
    const list = evaluateSubjectRecords(c.id, records);
    for (const f of list) {
      if (savedStatus[f.id]) {
        f.status = savedStatus[f.id].status;
        if (savedStatus[f.id].notes) f.review_notes = savedStatus[f.id].notes;
      }
      allFindings.push(f);
    }
  }
  return allFindings;
}

const INITIAL_ENV_METRICS: MissionEnvironmentMetrics = {
  cabinPressure_kPa: 101.3,
  ppO2_kPa: 21.0,
  ppCO2_mmHg: 2.8,
  cabinTemp_C: 21.8,
  relativeHumidity_pct: 44.5,
  acousticNoise_dB: 57.6,
  radiationDoseRate_uSv_h: 18.2,
  cumulativeRadiationDose_mSv: 64.8,
  exerciseCompliance_pct: 95.0,
};

const INITIAL_VOICE_MESSAGES: VoiceChatMessage[] = [
  {
    id: 'vm-init-1',
    sender: 'astra',
    text: 'SOLARIS Neural Core initialized (Qwen 2.5 local offline). Standing by for wake word or telemetry query.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'vm-init-2',
    sender: 'astronaut',
    text: 'Wake up, SOLARIS. Read my health.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'vm-init-3',
    sender: 'astra',
    text: 'Greetings Commander. All 7 Bio-Monitor and AstroSkin channels online. Resting heart rate 72 bpm, SpO2 98%, Core temperature 36.8°C nominal. Sleep latency elevated 14 minutes over baseline.',
    timestamp: new Date(Date.now() - 1795000).toISOString(),
  },
];

export const useAstraStore = create<StoreState>((set, get) => {
  const initialRecords = loadInitialRecords();
  const initialFindings = computeAllFindings(initialRecords);

  return {
    records: initialRecords,
    crew: CREW_MEMBERS,
    tasks: SEEDED_TASKS,
    findings: initialFindings,
    dailyAssessments: [],
    timelineEvents: INITIAL_TIMELINE_EVENTS,
    guidanceList: INITIAL_GUIDANCE,
    activeSubjectId: 'ASTRA-02', // Maya Chen default
    linkState: 'connected',
    environment: 'mars',
    lastSyncTime: new Date().toISOString(),
    isSimulating: false,
    simulationTick: 0,
    simulationScenario: 'nominal',
    simulationSpeed: 1,
    disconnectedSensors: [],
    voiceAssistantOpen: false,
    voiceMessages: INITIAL_VOICE_MESSAGES,
    environmentMetrics: INITIAL_ENV_METRICS,

    setActiveSubject: (id) => set({ activeSubjectId: id }),

    setLinkState: (state) => {
      set({ linkState: state });
      if (state === 'connected') {
        get().drainSyncQueue();
      }
    },

    setEnvironment: (environment) => set({ environment }),

    addTimelineEvent: (eventData) => {
      const newEvent: HealthTimelineEvent = {
        ...eventData,
        id: `tl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      set({ timelineEvents: [newEvent, ...get().timelineEvents] });
      return newEvent;
    },

    updateGuidanceStatus: (id, status) => {
      set({
        guidanceList: get().guidanceList.map((g) => (g.id === id ? { ...g, status } : g)),
      });
    },

    submitDailyAssessment: (assessmentData) => {
      const { records, timelineEvents, dailyAssessments, linkState } = get();
      const now = new Date().toISOString();
      const isSynced = linkState === 'connected';
      const assessmentId = `assess-${assessmentData.subject_id}-${Date.now()}`;
      const newAssessment: DailyAssessmentRecord = {
        ...assessmentData,
        id: assessmentId,
      };

      const hrVal = assessmentData.vitals?.heart_rate ?? (assessmentData.vitals as any)?.heart_rate_bpm ?? 75;
      const bpSysVal = assessmentData.vitals?.bp_sys ?? (assessmentData.vitals as any)?.systolic_bp ?? 118;
      const bpDiaVal = assessmentData.vitals?.bp_dia ?? (assessmentData.vitals as any)?.diastolic_bp ?? 76;
      const tempVal = assessmentData.vitals?.temperature ?? (assessmentData.vitals as any)?.body_temp_c ?? 37.0;
      const spo2Val = assessmentData.vitals?.spo2 ?? (assessmentData.vitals as any)?.spo2_pct ?? 98.4;
      const respVal = assessmentData.vitals?.resp_rate ?? (assessmentData.vitals as any)?.respiration_rate ?? 14.0;
      const sleepHrVal = assessmentData.sleep?.hours ?? (assessmentData.sleep as any)?.total_sleep_hours ?? 6.5;
      const fatigueVal = assessmentData.physical?.fatigue ?? (assessmentData.physical as any)?.fatigue_level ?? 2;
      const moodVal = assessmentData.psychological?.mood ?? (assessmentData.psychological as any)?.mood_level ?? 4;
      const symptomsList = assessmentData.symptoms || [];

      const newRecordsToPost: Omit<HealthRecord, 'id' | 'synced' | 'synced_at'>[] = [
        {
          subject_id: assessmentData.subject_id,
          type: 'heart_rate',
          value: hrVal,
          unit: 'bpm',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
        {
          subject_id: assessmentData.subject_id,
          type: 'blood_pressure_sys',
          value: bpSysVal,
          unit: 'mmHg',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
        {
          subject_id: assessmentData.subject_id,
          type: 'blood_pressure_dia',
          value: bpDiaVal,
          unit: 'mmHg',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
        {
          subject_id: assessmentData.subject_id,
          type: 'temperature',
          value: tempVal,
          unit: '°C',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
        {
          subject_id: assessmentData.subject_id,
          type: 'spo2',
          value: spo2Val,
          unit: '%',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
        {
          subject_id: assessmentData.subject_id,
          type: 'respiratory_rate',
          value: respVal,
          unit: 'br/m',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
        {
          subject_id: assessmentData.subject_id,
          type: 'sleep',
          value: sleepHrVal,
          unit: 'h',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
        {
          subject_id: assessmentData.subject_id,
          type: 'fatigue',
          value: fatigueVal,
          unit: '/5',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
        {
          subject_id: assessmentData.subject_id,
          type: 'mood',
          value: moodVal,
          unit: '/5',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        },
      ];

      if (assessmentData.vitals?.glucose !== undefined) {
        newRecordsToPost.push({
          subject_id: assessmentData.subject_id,
          type: 'glucose',
          value: assessmentData.vitals.glucose,
          unit: 'mg/dL',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        });
      }

      if (assessmentData.vitals?.hrv !== undefined) {
        newRecordsToPost.push({
          subject_id: assessmentData.subject_id,
          type: 'hrv',
          value: assessmentData.vitals.hrv,
          unit: 'ms',
          timestamp: assessmentData.timestamp,
          source: 'manual',
          is_simulated: assessmentData.is_simulated ?? true,
          quality: 'ok',
          mission_phase: 'transit',
        });
      }

      const generatedRecords: HealthRecord[] = newRecordsToPost.map((r, i) => ({
        ...r,
        id: `rec-${r.subject_id}-${r.type}-${Date.now()}-${i}`,
        synced: isSynced,
        synced_at: isSynced ? now : null,
      }));

      const nextRecords = [...records, ...generatedRecords];

      const newTimelineEvent: HealthTimelineEvent = {
        id: `tl-${Date.now()}`,
        subject_id: assessmentData.subject_id,
        timestamp: assessmentData.timestamp,
        category: 'assessment',
        title: 'Daily Health Assessment Completed',
        summary: `HR ${hrVal} bpm · BP ${bpSysVal}/${bpDiaVal} · Sleep ${sleepHrVal}h · Fatigue ${fatigueVal}/5`,
        detail: `Sleep quality: ${assessmentData.sleep?.quality ?? 4}/5 · Mood: ${moodVal}/5 · Symptoms reported: ${symptomsList.length}`,
        severity: fatigueVal >= 4 || sleepHrVal < 5.0 ? 'watch' : 'normal',
        source: 'Daily Check-in',
        is_simulated: assessmentData.is_simulated ?? true,
      };

      const symptomEvents: HealthTimelineEvent[] = symptomsList.map((s, idx) => ({
        id: `tl-symp-${Date.now()}-${idx}`,
        subject_id: assessmentData.subject_id,
        timestamp: assessmentData.timestamp,
        category: 'symptom',
        title: `Reported Symptom: ${s.location}`,
        summary: `Severity: ${s.severity}/10 · Onset: ${s.onset} · Duration: ${s.duration}`,
        detail: s.notes || s.triggers ? `Context: ${s.triggers || ''} ${s.notes || ''}` : undefined,
        severity: s.severity >= 6 ? 'review' : 'watch',
        source: 'Crew Self-Report',
        is_simulated: assessmentData.is_simulated ?? true,
      }));

      const nextAssessments = [newAssessment, ...dailyAssessments];
      const nextTimeline = [newTimelineEvent, ...symptomEvents, ...timelineEvents];
      const nextFindings = computeAllFindings(nextRecords);

      set({
        records: nextRecords,
        dailyAssessments: nextAssessments,
        timelineEvents: nextTimeline,
        findings: nextFindings,
        lastSyncTime: isSynced ? now : get().lastSyncTime,
      });

      return newAssessment;
    },

    postRecord: (recData) => {
      const { linkState, records } = get();
      const isSynced = linkState === 'connected';
      const now = new Date().toISOString();

      const newRecord: HealthRecord = {
        ...recData,
        id: `rec-${recData.subject_id}-${recData.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        synced: isSynced,
        synced_at: isSynced ? now : null,
      };

      const nextRecords = [...records, newRecord];
      try {
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(nextRecords));
      } catch (e) {
        // storage overflow fallback
      }

      const nextFindings = computeAllFindings(nextRecords);
      set({
        records: nextRecords,
        findings: nextFindings,
        lastSyncTime: isSynced ? now : get().lastSyncTime,
      });

      return newRecord;
    },

    updateFindingStatus: (id, status, notes) => {
      const nextFindings = get().findings.map(f => {
        if (f.id === id) {
          return {
            ...f,
            status,
            review_notes: notes !== undefined ? notes : f.review_notes,
            acknowledged_at: status === 'acknowledged' ? new Date().toISOString() : f.acknowledged_at,
            acknowledged_by: status === 'acknowledged' ? 'Dr. D. Brooks, CMO' : f.acknowledged_by,
          };
        }
        return f;
      });

      try {
        let savedStatus: Record<string, { status: Finding['status']; notes?: string }> = {};
        const raw = localStorage.getItem(STORAGE_KEY_FINDINGS_STATUS);
        if (raw) savedStatus = JSON.parse(raw);
        savedStatus[id] = { status, notes };
        localStorage.setItem(STORAGE_KEY_FINDINGS_STATUS, JSON.stringify(savedStatus));
      } catch (e) {
        // ignore
      }

      set({ findings: nextFindings });
    },

    resolveFinding: (id, notes) => {
      get().updateFindingStatus(id, 'acknowledged', notes || 'Clinically resolved by Medical Officer.');
    },

    requestAssessment: (subjectId, category) => {
      const now = new Date().toISOString();
      const newFinding: Finding = {
        id: `find-req-assess-${Date.now()}`,
        subject_id: subjectId,
        level: 'watch',
        indicators: ['mood', 'fatigue'],
        summary: `Targeted ${category} assessment requested by Medical Console`,
        detail: `Flight Surgeon requested supplementary subjective questionnaire regarding ${category} indicators.`,
        timestamp: now,
        observed_value: 'Assessment Pending',
        baseline_value: 'N/A',
        rule_triggered: 'Clinical Re-Assessment Protocol',
        body_region: 'head',
        hazard_id: 'isolation',
        status: 'new',
      };
      set({ findings: [newFinding, ...get().findings] });
    },

    setSimulationScenario: (scenario) => set({ simulationScenario: scenario }),
    setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

    toggleSensorConnection: (sensorId) => {
      const { disconnectedSensors } = get();
      if (disconnectedSensors.includes(sensorId)) {
        set({ disconnectedSensors: disconnectedSensors.filter(s => s !== sensorId) });
      } else {
        set({ disconnectedSensors: [...disconnectedSensors, sensorId] });
      }
    },

    setVoiceAssistantOpen: (open) => set({ voiceAssistantOpen: open }),

    addVoiceMessage: (msg) => {
      const newMsg: VoiceChatMessage = {
        ...msg,
        id: `vm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      set({ voiceMessages: [...get().voiceMessages, newMsg] });
    },

    clearVoiceMessages: () => set({ voiceMessages: [] }),

    updateEnvironmentMetrics: (partial) => {
      set({ environmentMetrics: { ...get().environmentMetrics, ...partial } });
    },

    injectFault: (fault, subjectId) => {
      const targetId = subjectId || get().activeSubjectId;
      const now = new Date().toISOString();

      if (fault === 'link_down') {
        get().setLinkState('down');
      } else if (fault === 'fever') {
        get().postRecord({
          subject_id: targetId,
          type: 'temperature',
          value: 38.3,
          unit: '°C',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142',
        });
        get().postRecord({
          subject_id: targetId,
          type: 'heart_rate',
          value: 86,
          unit: 'bpm',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142',
        });
      } else if (fault === 'bad_sleep') {
        get().postRecord({
          subject_id: targetId,
          type: 'sleep',
          value: 4.5,
          unit: 'hours',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142',
        });
        get().postRecord({
          subject_id: targetId,
          type: 'fatigue',
          value: 4.5,
          unit: 'scale 1-5',
          timestamp: now,
          source: 'manual',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142',
        });
      } else if (fault === 'raised_bp') {
        get().postRecord({
          subject_id: targetId,
          type: 'blood_pressure_sys',
          value: 142,
          unit: 'mmHg',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142',
        });
      } else if (fault === 'missed_checkin') {
        const nextRecords = get().records.map(r => {
          if (r.subject_id === targetId && (r.type === 'mood' || r.type === 'fatigue')) {
            return { ...r, quality: 'stale' as const };
          }
          return r;
        });
        set({ records: nextRecords, findings: computeAllFindings(nextRecords) });
      }
    },

    toggleSimulator: (force) => {
      const next = force !== undefined ? force : !get().isSimulating;
      set({ isSimulating: next });
    },

    stepSimulation: () => {
      const { activeSubjectId, simulationScenario, disconnectedSensors } = get();
      const now = new Date().toISOString();
      const currentTick = get().simulationTick + 1;

      // Handle based on active scenario
      if (simulationScenario === 'nominal') {
        const hrVariance = Math.sin(currentTick * 0.8) * 2;
        const hrVal = Math.round(71 + hrVariance);
        if (!disconnectedSensors.includes('ecg-01')) {
          get().postRecord({
            subject_id: activeSubjectId,
            type: 'heart_rate',
            value: hrVal,
            unit: 'bpm',
            timestamp: now,
            source: 'simulated_device',
            is_simulated: true,
            quality: 'ok',
            mission_phase: 'Transit Day 142 (Nominal)',
          });
        }
      } else if (simulationScenario === 'sleep_disruption') {
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'sleep',
          value: Math.max(3.8, +(5.2 - currentTick * 0.1).toFixed(1)),
          unit: 'hours',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Sleep Disruption)',
        });
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'fatigue',
          value: Math.min(4.8, +(3.2 + currentTick * 0.15).toFixed(1)),
          unit: 'scale 1-5',
          timestamp: now,
          source: 'manual',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Sleep Disruption)',
        });
      } else if (simulationScenario === 'physiological_drift') {
        const bpSys = Math.min(148, Math.round(118 + currentTick * 1.5));
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'blood_pressure_sys',
          value: bpSys,
          unit: 'mmHg',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Physiological Drift)',
        });
      } else if (simulationScenario === 'multi_anomaly') {
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'temperature',
          value: 38.4,
          unit: '°C',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Multi-Anomaly)',
        });
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'heart_rate',
          value: 88,
          unit: 'bpm',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Multi-Anomaly)',
        });
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'spo2',
          value: 94,
          unit: '%',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Multi-Anomaly)',
        });
      } else if (simulationScenario === 'recovery') {
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'temperature',
          value: 36.8,
          unit: '°C',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Recovery Protocol)',
        });
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'heart_rate',
          value: 70,
          unit: 'bpm',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Recovery Protocol)',
        });
        get().postRecord({
          subject_id: activeSubjectId,
          type: 'spo2',
          value: 99,
          unit: '%',
          timestamp: now,
          source: 'simulated_device',
          is_simulated: true,
          quality: 'ok',
          mission_phase: 'Transit Day 142 (Recovery Protocol)',
        });
      }

      set({ simulationTick: currentTick });
    },

    drainSyncQueue: () => {
      const now = new Date().toISOString();
      let count = 0;
      const nextRecords = get().records.map(r => {
        if (!r.synced) {
          count++;
          return { ...r, synced: true, synced_at: now };
        }
        return r;
      });

      try {
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(nextRecords));
      } catch (e) {
        // ignore
      }

      set({ records: nextRecords });
      return count;
    },

    resetAll: () => {
      try {
        localStorage.removeItem(STORAGE_KEY_RECORDS);
        localStorage.removeItem(STORAGE_KEY_FINDINGS_STATUS);
      } catch (e) {
        // ignore
      }
      const initial = generateSeedRecords();
      set({
        records: initial,
        findings: computeAllFindings(initial),
        linkState: 'connected',
        lastSyncTime: new Date().toISOString(),
        isSimulating: false,
        simulationTick: 0,
        simulationScenario: 'nominal',
        disconnectedSensors: [],
      });
    },
  };
});
