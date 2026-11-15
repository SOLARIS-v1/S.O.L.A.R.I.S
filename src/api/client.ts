import {
  HealthRecord,
  Finding,
  CrewMember,
  MissionTask,
  LinkState,
  MissionEnvironment,
  BackendConnectionStatus,
  HealthCheckResult,
  SymptomAssessmentRequest,
  SymptomAssessmentResponse,
  CardiovascularAnalysisPayload,
  CardiovascularAnalysisResult,
  SleepAnalyticsResult,
  ImmuneAnalyticsResult,
  MetabolicAnalyticsResult,
  RadiationSummaryPayload,
  RadiationSummaryResult,
  OcularBonePayload,
  OcularBoneResult,
  AstronautInsightsResult,
  ResearchRegistryResult,
  ResearchStatusResult,
} from './types';
import { useAstraStore } from './mockClient';
import { httpClient } from './httpClient';

export type { BackendConnectionStatus, HealthCheckResult };

export interface ApiClient {
  getConnectionStatus(): Promise<BackendConnectionStatus>;
  checkHealth?(timeoutMs?: number): Promise<HealthCheckResult>;
  getRecords(subject_id?: string, limit?: number): Promise<HealthRecord[]>;
  postRecord(
    record: Omit<HealthRecord, 'id' | 'synced' | 'synced_at'>
  ): Promise<HealthRecord>;
  getFindings(subject_id?: string): Promise<Finding[]>;
  updateFinding(id: string, updates: Partial<Finding>): Promise<Finding>;
  getCrew(): Promise<CrewMember[]>;
  getTasks(): Promise<MissionTask[]>;
  getLinkState(): Promise<{ state: LinkState; pendingCount: number; lastSync: string }>;
  setLinkState(state: LinkState): Promise<void>;
  drainSyncQueue(): Promise<number>;
  setEnvironment(env: MissionEnvironment): Promise<void>;
  getEnvironment(): Promise<MissionEnvironment>;
  injectFault(
    faultType: 'fever' | 'bad_sleep' | 'raised_bp' | 'missed_checkin' | 'link_down',
    subjectId?: string
  ): Promise<void>;
  resetDemo(): Promise<void>;

  // SOLARIS Medical Intelligence extensions
  assessSymptoms?(req: SymptomAssessmentRequest): Promise<SymptomAssessmentResponse>;
  getCrewTelemetry?(name: string): Promise<any>;
  submitCheckin?(req: any): Promise<any>;
  getCheckinLogs?(name?: string): Promise<any[]>;

  // SOLARIS Research ML extensions (solaris_ml)
  getResearchStatus(): Promise<ResearchStatusResult>;
  getResearchRegistry(): Promise<ResearchRegistryResult>;
  analyzeCardiovascular(payload: CardiovascularAnalysisPayload): Promise<CardiovascularAnalysisResult>;
  getSleepAnalytics(astronautId?: string): Promise<SleepAnalyticsResult>;
  getImmuneAnalytics(astronautId?: string): Promise<ImmuneAnalyticsResult>;
  getMetabolicAnalytics(astronautId?: string): Promise<MetabolicAnalyticsResult>;
  getRadiationSummary(astronautId?: string): Promise<RadiationSummaryResult>;
  postRadiationSummary(payload: RadiationSummaryPayload): Promise<RadiationSummaryResult>;
  getOcularObservations(astronautId?: string, currentOnsdMm?: number, baselineOnsdMm?: number): Promise<OcularBoneResult>;
  getBoneObservations(astronautId?: string, bmdTScore?: number): Promise<OcularBoneResult>;
  getAstronautInsights(astronautId: string): Promise<AstronautInsightsResult>;
}

// Key for explicit user selection of Demo / Mock mode
const STORAGE_KEY_MOCK_MODE = 'solaris_mock_mode_enabled';

const modeListeners = new Set<(isMock: boolean, status: BackendConnectionStatus) => void>();

export function isMockMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_MOCK_MODE) === 'true';
  } catch {
    return false;
  }
}

export function setMockMode(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_MOCK_MODE, String(enabled));
  } catch (e) {
    console.warn('Could not persist mock mode toggle to localStorage:', e);
  }
  const status: BackendConnectionStatus = enabled ? 'DEMO_MODE' : 'DISCONNECTED';
  modeListeners.forEach((fn) => {
    try {
      fn(enabled, status);
    } catch (err) {
      console.error('Error in mode listener:', err);
    }
  });
}

export function toggleMockMode(): boolean {
  const next = !isMockMode();
  setMockMode(next);
  return next;
}

export function onModeChange(
  listener: (isMock: boolean, status: BackendConnectionStatus) => void
): () => void {
  modeListeners.add(listener);
  const currentMock = isMockMode();
  listener(currentMock, currentMock ? 'DEMO_MODE' : 'DISCONNECTED');
  return () => modeListeners.delete(listener);
}

/**
 * Mock implementation of ApiClient that interfaces with Zustand store.
 * ONLY used when user explicitly enables Demo / Mock Mode.
 */
export const mockApiClient: ApiClient = {
  async getConnectionStatus() {
    return 'DEMO_MODE';
  },

  async checkHealth() {
    return {
      status: 'DEMO_MODE',
      online: false,
      timestamp: new Date().toISOString(),
      url: 'mock://local-zustand-store',
      mode: 'EXPLICIT DEMO SIMULATION',
      engine: 'In-Memory Zustand Simulation Engine',
      database: 'Browser LocalStorage',
      models_loaded: false,
      latencyMs: 0,
    };
  },

  async getRecords(subject_id, limit) {
    const records = useAstraStore.getState().records;
    let filtered = subject_id ? records.filter((r) => r.subject_id === subject_id) : records;
    if (limit) filtered = filtered.slice(-limit);
    return filtered;
  },

  async postRecord(recData) {
    return useAstraStore.getState().postRecord(recData);
  },

  async getFindings(subject_id) {
    const findings = useAstraStore.getState().findings;
    return subject_id ? findings.filter((f) => f.subject_id === subject_id) : findings;
  },

  async updateFinding(id, updates) {
    const f = useAstraStore.getState().findings.find((x) => x.id === id);
    if (!f) throw new Error(`Finding ${id} not found`);
    if (updates.status) {
      useAstraStore.getState().updateFindingStatus(id, updates.status, updates.review_notes);
    }
    return { ...f, ...updates };
  },

  async getCrew() {
    return useAstraStore.getState().crew;
  },

  async getTasks() {
    return useAstraStore.getState().tasks;
  },

  async getLinkState() {
    const store = useAstraStore.getState();
    const pendingCount = store.records.filter((r) => !r.synced).length;
    return {
      state: store.linkState,
      pendingCount,
      lastSync: store.lastSyncTime,
    };
  },

  async setLinkState(state: LinkState) {
    useAstraStore.getState().setLinkState(state);
  },

  async drainSyncQueue() {
    return useAstraStore.getState().drainSyncQueue();
  },

  async setEnvironment(env: MissionEnvironment) {
    useAstraStore.getState().setEnvironment(env);
  },

  async getEnvironment() {
    return useAstraStore.getState().environment;
  },

  async injectFault(faultType, subjectId) {
    useAstraStore.getState().injectFault(faultType, subjectId);
  },

  async resetDemo() {
    useAstraStore.getState().resetAll();
  },

  async assessSymptoms(req: SymptomAssessmentRequest): Promise<SymptomAssessmentResponse> {
    const lower = req.transcript.toLowerCase();
    const sleep = req.sleep_issue || lower.includes('sleep') || lower.includes('tired');
    const skin = req.skin_issue || lower.includes('skin') || lower.includes('rash');
    const spine = req.spine_issue || lower.includes('spine') || lower.includes('back');

    let advice = 'Simulation mode: Report recorded in local store. All parameters monitored.';
    if (spine && sleep) {
      advice =
        '[SIMULATION] Microgravity spinal elongation correlated with circadian sleep deficit. 20m ARED compression prescribed.';
    } else if (spine) {
      advice = '[SIMULATION] Axial spine decompression noted. Recommended harness compression countermeasure.';
    } else if (sleep) {
      advice = '[SIMULATION] Sleep deficit logged. HRV depression observed in simulated telemetry.';
    }

    return {
      detected_symptoms: {
        sleepIssue: sleep,
        skinIssue: skin,
        spineIssue: spine,
      },
      ml_analysis: {
        status: spine || sleep ? 'CAUTION' : 'NOMINAL',
        confidence_pct: 88,
        is_anomaly: spine || sleep,
        anomaly_score: spine || sleep ? 0.68 : 0.12,
        causal_explanation: advice,
        countermeasures: ['ARED Axial Loading', 'Circadian Phase Phototherapy'],
      },
      astra_spoken_response: advice,
      countermeasures: ['ARED Axial Loading', 'Circadian Phase Phototherapy'],
    };
  },

  async getCrewTelemetry(name: string) {
    const store = useAstraStore.getState();
    const member = store.crew.find(
      (c) => c.name.toLowerCase().includes(name.toLowerCase()) || c.id.toLowerCase() === name.toLowerCase()
    );
    return {
      crew: member,
      hotspots: {},
      astra_briefing_script: `Simulation telemetry for ${member?.name || name}.`,
    };
  },

  async submitCheckin(req: any) {
    return {
      status: 'simulated_success',
      message: `Simulated check-in logged for ${req.crew_name}`,
      logged_at: new Date().toISOString(),
    };
  },

  async getCheckinLogs() {
    return [];
  },

  // ---------------------------------------------------------------------------
  // Simulated Research ML Methods (Demo / Offline Mode)
  // ---------------------------------------------------------------------------

  async getResearchStatus(): Promise<ResearchStatusResult> {
    return {
      package_status: 'SIMULATED_DEMO',
      policy: 'Demo mode active; simulated research registry metadata.',
      models: {},
      quarantined_count: 4,
      enabled_count: 4,
      runtime_sklearn_version: '1.9.1 (simulated)',
      generated_at_utc: new Date().toISOString(),
    };
  },

  async getResearchRegistry(): Promise<ResearchRegistryResult> {
    return {
      registry_version: '2.0.0',
      policy: 'Simulation mode policy: observational analytics only.',
      models: [
        { id: 'cardiovascular_anomaly_detector', status: 'experimental_research_only', inference: 'enabled_as_unsupervised_score_only' },
        { id: 'immune_trajectory_pca', status: 'exploratory', inference: 'enabled_as_projection_only' },
        { id: 'radiation_dosimetry_engine', status: 'deterministic_observational_only', inference: 'enabled_absorbed_dose_summary' },
        { id: 'ocular_bone_observations', status: 'observations_only', inference: 'enabled_passthrough' },
        { id: 'sleep_recovery_model', status: 'quarantined_target_leakage', inference: 'disabled' },
        { id: 'stress_circadian_model', status: 'quarantined_poor_predictive_performance', inference: 'disabled' },
        { id: 'plasma_proteomics_model', status: 'quarantined_experimental', inference: 'disabled' },
        { id: 'physical_performance_model', status: 'quarantined_constructed_target', inference: 'disabled' },
      ],
      artifact_compatibility: { scikit_learn: '1.9.1' },
    };
  },

  async analyzeCardiovascular(payload: CardiovascularAnalysisPayload): Promise<CardiovascularAnalysisResult> {
    return {
      model_name: 'cardiovascular_anomaly_detector',
      model_version: '1.0.0-experimental',
      status: 'experimental',
      input_features: payload as any,
      output: { unsupervised_deviation_score: 0.082 },
      data_quality: 'validated_numeric_inputs',
      provenance: { simulated: true },
      limitations: ['Score is statistical deviation only; not an abnormal rhythm score.'],
      generated_at_utc: new Date().toISOString(),
    };
  },

  async getSleepAnalytics(astronautId: string = 'vance'): Promise<SleepAnalyticsResult> {
    return {
      astronaut_id: astronautId,
      model_status: 'quarantined_target_leakage',
      status_note: 'Predictive sleep model quarantined; descriptive metrics only.',
      metrics: {
        recorded_total_sleep_time_hours: 6.8,
        estimated_time_in_bed_hours: 7.5,
        measured_sleep_efficiency_pct: 90.6,
        wake_after_sleep_onset_min: 18.0,
        awakenings_count: 2,
        circadian_phase_alignment_pct: 82.0,
        sleep_classification_descriptive: 'optimal',
      },
      limitations: ['Descriptive actigraphy only.'],
      generated_at_utc: new Date().toISOString(),
    };
  },

  async getImmuneAnalytics(astronautId: string = 'vance'): Promise<ImmuneAnalyticsResult> {
    return {
      astronaut_id: astronautId,
      model_status: 'exploratory',
      output: { pca_coordinates: [0.12, -0.08] },
      diversity_metrics: { clonotypes: 1420 },
      limitations: ['Exploratory PCA projection only.'],
      generated_at_utc: new Date().toISOString(),
    };
  },

  async getMetabolicAnalytics(astronautId: string = 'vance'): Promise<MetabolicAnalyticsResult> {
    return {
      astronaut_id: astronautId,
      model_status: 'quarantined_experimental',
      status_note: 'Proteomics model quarantined; direct biomarkers only.',
      biomarkers: { Alanine: 1045000, Glutamine: 2310000 },
      limitations: ['Proteomics ML disabled.'],
      generated_at_utc: new Date().toISOString(),
    };
  },

  async getRadiationSummary(astronautId: string = 'vance'): Promise<RadiationSummaryResult> {
    return {
      model_name: 'radiation_dosimetry_engine',
      model_version: '2.0.0-deterministic',
      status: 'deterministic_analytics',
      input_features: { days_monitored: 7, unit: 'mGy/day' },
      output: {
        cumulative_absorbed_dose_mgy: 2.88,
        mean_daily_absorbed_dose_mgy: 0.411,
      },
      data_quality: 'validated_finite_nonnegative',
      provenance: { simulated: true },
      limitations: ['No mSv conversion; physical absorbed dose only.'],
      generated_at_utc: new Date().toISOString(),
    };
  },

  async postRadiationSummary(payload: RadiationSummaryPayload): Promise<RadiationSummaryResult> {
    const sum = payload.daily_absorbed_dose_mgy.reduce((a, b) => a + b, 0);
    return {
      model_name: 'radiation_dosimetry_engine',
      model_version: '2.0.0-deterministic',
      status: 'deterministic_analytics',
      input_features: { days_monitored: payload.daily_absorbed_dose_mgy.length, unit: 'mGy/day' },
      output: {
        cumulative_absorbed_dose_mgy: sum,
        mean_daily_absorbed_dose_mgy: sum / (payload.daily_absorbed_dose_mgy.length || 1),
      },
      data_quality: 'validated_finite_nonnegative',
      provenance: { simulated: true },
      limitations: ['No mSv conversion; physical absorbed dose only.'],
      generated_at_utc: new Date().toISOString(),
    };
  },

  async getOcularObservations(astronautId: string = 'vance', currentOnsdMm?: number, baselineOnsdMm?: number): Promise<OcularBoneResult> {
    return {
      model_name: 'ocular_bone_observations',
      model_version: '2.0.0-observational',
      status: 'observations_only',
      input_features: { current_onsd_mm: currentOnsdMm ?? 5.4, baseline_onsd_mm: baselineOnsdMm ?? 4.9 },
      output: { current_onsd_mm: currentOnsdMm ?? 5.4, baseline_onsd_mm: baselineOnsdMm ?? 4.9 },
      data_quality: 'validated_numeric_inputs',
      provenance: { simulated: true },
      limitations: ['Observations only; no SANS risk tiers.'],
      generated_at_utc: new Date().toISOString(),
    };
  },

  async getBoneObservations(astronautId: string = 'vance', bmdTScore?: number): Promise<OcularBoneResult> {
    return {
      model_name: 'ocular_bone_observations',
      model_version: '2.0.0-observational',
      status: 'observations_only',
      input_features: { bmd_t_score: bmdTScore ?? -0.8 },
      output: { bmd_t_score: bmdTScore ?? -0.8 },
      data_quality: 'validated_numeric_inputs',
      provenance: { simulated: true },
      limitations: ['Observations only; no bone loss forecasts.'],
      generated_at_utc: new Date().toISOString(),
    };
  },

  async getAstronautInsights(astronautId: string): Promise<AstronautInsightsResult> {
    return {
      astronaut_id: astronautId,
      astronaut_name: astronautId.toUpperCase(),
      mission_sol: 142,
      clinical_disclaimer: 'RESEARCH PLATFORM ONLY - NOT CLINICAL DIAGNOSIS',
      generated_at_utc: new Date().toISOString(),
    };
  },
};

/**
 * Authoritative API Client:
 * SELECTS httpClient BY DEFAULT.
 * ONLY uses mockApiClient if user explicitly toggled Mock / Demo Mode.
 * NEVER silently falls back to fabricated data on HTTP failure.
 */
function getActiveClient(): ApiClient {
  return isMockMode() ? mockApiClient : httpClient;
}

export const api: ApiClient = {
  async getConnectionStatus(): Promise<BackendConnectionStatus> {
    if (isMockMode()) {
      return 'DEMO_MODE';
    }
    return httpClient.getConnectionStatus();
  },

  async checkHealth(timeoutMs?: number): Promise<HealthCheckResult> {
    if (isMockMode()) {
      return mockApiClient.checkHealth!(timeoutMs);
    }
    return httpClient.checkHealth(timeoutMs);
  },

  async getRecords(subject_id?: string, limit?: number) {
    return getActiveClient().getRecords(subject_id, limit);
  },

  async postRecord(record) {
    return getActiveClient().postRecord(record);
  },

  async getFindings(subject_id?: string) {
    return getActiveClient().getFindings(subject_id);
  },

  async updateFinding(id: string, updates: Partial<Finding>) {
    return getActiveClient().updateFinding(id, updates);
  },

  async getCrew() {
    return getActiveClient().getCrew();
  },

  async getTasks() {
    return getActiveClient().getTasks();
  },

  async getLinkState() {
    return getActiveClient().getLinkState();
  },

  async setLinkState(state: LinkState) {
    return getActiveClient().setLinkState(state);
  },

  async drainSyncQueue() {
    return getActiveClient().drainSyncQueue();
  },

  async setEnvironment(env: MissionEnvironment) {
    return getActiveClient().setEnvironment(env);
  },

  async getEnvironment() {
    return getActiveClient().getEnvironment();
  },

  async injectFault(faultType, subjectId) {
    return getActiveClient().injectFault(faultType, subjectId);
  },

  async resetDemo() {
    return getActiveClient().resetDemo();
  },

  async assessSymptoms(req: SymptomAssessmentRequest) {
    if (getActiveClient().assessSymptoms) {
      return getActiveClient().assessSymptoms!(req);
    }
    return httpClient.assessSymptoms(req);
  },

  async getCrewTelemetry(name: string) {
    if (getActiveClient().getCrewTelemetry) {
      return getActiveClient().getCrewTelemetry!(name);
    }
    return httpClient.getCrewTelemetry(name);
  },

  async submitCheckin(req: any) {
    if (getActiveClient().submitCheckin) {
      return getActiveClient().submitCheckin!(req);
    }
    return httpClient.submitCheckin(req);
  },

  async getCheckinLogs(name?: string) {
    if (getActiveClient().getCheckinLogs) {
      return getActiveClient().getCheckinLogs!(name);
    }
    return httpClient.getCheckinLogs(name);
  },

  // ---------------------------------------------------------------------------
  // SOLARIS Research ML Delegations
  // ---------------------------------------------------------------------------

  async getResearchStatus() {
    return getActiveClient().getResearchStatus();
  },

  async getResearchRegistry() {
    return getActiveClient().getResearchRegistry();
  },

  async analyzeCardiovascular(payload: CardiovascularAnalysisPayload) {
    return getActiveClient().analyzeCardiovascular(payload);
  },

  async getSleepAnalytics(astronautId?: string) {
    return getActiveClient().getSleepAnalytics(astronautId);
  },

  async getImmuneAnalytics(astronautId?: string) {
    return getActiveClient().getImmuneAnalytics(astronautId);
  },

  async getMetabolicAnalytics(astronautId?: string) {
    return getActiveClient().getMetabolicAnalytics(astronautId);
  },

  async getRadiationSummary(astronautId?: string) {
    return getActiveClient().getRadiationSummary(astronautId);
  },

  async postRadiationSummary(payload: RadiationSummaryPayload) {
    return getActiveClient().postRadiationSummary(payload);
  },

  async getOcularObservations(astronautId?: string, currentOnsdMm?: number, baselineOnsdMm?: number) {
    return getActiveClient().getOcularObservations(astronautId, currentOnsdMm, baselineOnsdMm);
  },

  async getBoneObservations(astronautId?: string, bmdTScore?: number) {
    return getActiveClient().getBoneObservations(astronautId, bmdTScore);
  },

  async getAstronautInsights(astronautId: string) {
    return getActiveClient().getAstronautInsights(astronautId);
  },
};

export { httpClient };
