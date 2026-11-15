export type IndicatorType =
  | 'heart_rate'
  | 'blood_pressure_sys'
  | 'blood_pressure_dia'
  | 'glucose'
  | 'temperature'
  | 'sleep'
  | 'mood'
  | 'fatigue'
  | 'spo2'
  | 'respiratory_rate'
  | 'hrv'
  | 'radiation_rate'
  | 'activity_minutes';

export type RecordSource = 'manual' | 'simulated_device' | 'imported_file' | 'report_sample';
export type RecordQuality = 'ok' | 'stale' | 'out_of_range' | 'missing_context';
export type FindingLevel = 'normal' | 'watch' | 'review' | 'urgent';
export type FindingStatus = 'new' | 'under_review' | 'acknowledged';
export type BodyRegion = 'head' | 'eyes' | 'heart' | 'lungs' | 'abdomen' | 'skeleton' | 'immune' | 'wrist' | 'arm' | 'pelvis';
export type LinkState = 'connected' | 'limited' | 'down';
export type MissionEnvironment =
  | 'space_station'
  | 'mars_habitat'
  | 'rover'
  | 'satellite'
  | 'station'
  | 'lunar'
  | 'mars';

export interface HealthRecord {
  id: string;
  subject_id: string;
  type: IndicatorType;
  value: number;
  unit: string;
  timestamp: string; // ISO 8601
  source: RecordSource;
  is_simulated: boolean;
  quality: RecordQuality;
  mission_phase: string;
  synced: boolean;
  synced_at: string | null;
}

export interface BaselineStats {
  indicator: IndicatorType;
  count: number;
  median: number;
  mad: number; // median absolute deviation
  min: number;
  max: number;
  is_established: boolean; // true if >= 5 valid readings
}

export interface Finding {
  id: string;
  subject_id: string;
  level: FindingLevel;
  indicators: IndicatorType[];
  summary: string;
  detail: string;
  timestamp: string;
  observed_value: string;
  baseline_value: string;
  rule_triggered: string;
  body_region: BodyRegion;
  hazard_id: string;
  status: FindingStatus;
  review_notes?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  callsign: string;
  role: string;
  gender: 'male' | 'female';
  mission_day: number;
  status: FindingLevel;
  scenario: string;
  last_assessment?: string;
  baseline_established: boolean;
}

export interface WearableSensor {
  id: string;
  code: string;
  name: string;
  hardware: string;
  anatomical_site: string;
  male_position: [number, number, number];
  female_position: [number, number, number];
  metrics: IndicatorType[];
  description: string;
  sample_frequency: string;
}

export interface RiskQuestion {
  id: string;
  question: string;
  subtext: string;
  category: 'isolation' | 'fluid_shift' | 'environmental' | 'workload';
  options: {
    label: string;
    score: number; // 1 (optimal) to 5 (high strain)
    description: string;
  }[];
}

export interface RiskAssessmentSubmission {
  id: string;
  subject_id: string;
  category: string;
  timestamp: string;
  scores: Record<string, number>;
  average_score: number;
  risk_level: 'low' | 'moderate' | 'elevated';
  summary: string;
  monitoring_notes: string;
}

export interface TaskDemand {
  exertion: number;
  duration: number;
  cognitive_load: number;
  dexterity: number;
  exposure: number;
}

export type TaskReadinessOutput =
  | 'No concern identified'
  | 'Review recommended'
  | 'Operational concern'
  | 'Insufficient data';

export interface MissionTask {
  id: string;
  title: string;
  timeline_slot: string;
  mission_day: number;
  assigned_to: string;
  demands: TaskDemand;
  affected_indicators: IndicatorType[];
  readiness_output: TaskReadinessOutput;
  readiness_reason: string;
}

export interface SpaceflightHazard {
  id: string;
  code: string;
  name: string;
  short_name: string;
  icon: string;
  description: string;
  indicators_watched: IndicatorType[];
  preventive_focus: string;
  mitigation_guidance: string;
  citation: string;
}

export type SimulationScenario =
  | 'nominal'
  | 'sleep_disruption'
  | 'physiological_drift'
  | 'multi_anomaly'
  | 'recovery';

export interface VoiceChatMessage {
  id: string;
  sender: 'astronaut' | 'astra' | 'system';
  text: string;
  timestamp: string;
}

export interface VerbalAssessmentQuestion {
  id: string;
  field: string;
  prompt: string;
  options: string[];
}

export interface MissionEnvironmentMetrics {
  cabinPressure_kPa: number;
  ppO2_kPa: number;
  ppCO2_mmHg: number;
  cabinTemp_C: number;
  relativeHumidity_pct: number;
  acousticNoise_dB: number;
  radiationDoseRate_uSv_h: number;
  cumulativeRadiationDose_mSv: number;
  exerciseCompliance_pct: number;
}

export interface IndicatorThreshold {
  type: IndicatorType;
  label: string;
  unit: string;
  normal_range: [number, number];
  watch_range?: [number, number];
  urgent_low?: number;
  urgent_high?: number;
  default_baseline: number;
  default_mad: number;
  source: string;
  body_region: BodyRegion;
  hazard_id: string;
  description: string;
}


export interface DailyAssessmentRecord {
  id: string;
  subject_id: string;
  timestamp: string; // ISO 8601
  is_simulated: boolean;
  vitals: {
    heart_rate: number;
    bp_sys: number;
    bp_dia: number;
    temperature: number;
    glucose?: number;
    spo2: number;
    resp_rate: number;
    hrv?: number;
    source: string;
    quality: RecordQuality;
  };
  sleep: {
    hours: number;
    quality: number; // 1-5
    difficulty_falling_asleep: boolean;
    interruptions: number;
    feeling_rested: boolean;
  };
  physical: {
    fatigue: number; // 1-5
    muscle_discomfort: boolean;
    joint_pain: boolean;
    spine_discomfort: boolean;
    headache: boolean;
    dizziness: boolean;
    exercise_recovery_score: number; // 1-5
  };
  psychological: {
    mood: number; // 1-5
    stress_score: number; // 1-5
    anxiety_score: number; // 1-5
    feeling_isolated: boolean;
    motivation_score: number; // 1-5
    concentration_score: number; // 1-5
  };
  symptoms: Array<{
    id: string;
    location: string;
    severity: number; // 0-10
    onset: string;
    duration: string;
    triggers?: string;
    notes?: string;
  }>;
  ai_correlation_notes?: string;
}

export type TimelineEventCategory =
  | 'assessment'
  | 'measurement'
  | 'symptom'
  | 'finding'
  | 'guidance'
  | 'medical_action'
  | 'mission_event';

export interface HealthTimelineEvent {
  id: string;
  subject_id: string;
  timestamp: string; // ISO 8601
  category: TimelineEventCategory;
  title: string;
  summary: string;
  detail?: string;
  severity?: 'normal' | 'watch' | 'review' | 'urgent';
  source: string;
  is_simulated: boolean;
  action_required?: boolean;
}

export type GuidanceCategory =
  | 'sleep'
  | 'hydration_nutrition'
  | 'exercise'
  | 'cardiovascular'
  | 'musculoskeletal'
  | 'mental_behavioral'
  | 'symptom'
  | 'measurement';

export interface GuidanceRecommendation {
  id: string;
  subject_id: string;
  category: GuidanceCategory;
  title: string;
  observed: string;
  why_matters: string;
  what_to_monitor: string;
  next_step: string;
  when_medical_support: string;
  sources: string[];
  status: 'active' | 'in_progress' | 'completed' | 'dismissed';
  timestamp: string;
}

export type BackendConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'DEMO_MODE';

export interface HealthCheckResult {
  status: BackendConnectionStatus;
  online: boolean;
  timestamp: string;
  url: string;
  engine?: string;
  database?: string;
  mode?: string;
  models_loaded?: boolean;
  latencyMs?: number;
  error?: string;
}

export interface SymptomAssessmentRequest {
  crew_name: string;
  transcript: string;
  sleep_issue?: boolean;
  skin_issue?: boolean;
  spine_issue?: boolean;
}

export interface SymptomAssessmentResponse {
  detected_symptoms: {
    sleepIssue: boolean;
    skinIssue: boolean;
    spineIssue: boolean;
  };
  ml_analysis?: any;
  astra_spoken_response?: string;
  countermeasures?: string[];
}

// ---------------------------------------------------------------------------
// SOLARIS ML Research Package Types (solaris_ml)
// ---------------------------------------------------------------------------

export interface CardiovascularAnalysisPayload {
  mean_hr_bpm: number;
  mean_rr_ms: number;
  sdnn_ms: number;
  rmssd_ms: number;
  pnn50_pct: number;
  sbp_mean: number;
  dbp_mean: number;
  map_mean: number;
  pp_mean: number;
  units: Record<string, string>;
  astronaut_id?: string;
}

export interface CardiovascularAnalysisResult {
  model_name: string;
  model_version: string;
  status: string;
  input_features: Record<string, any>;
  output: {
    unsupervised_deviation_score: number;
    anomaly_score?: number;
  };
  data_quality: string;
  provenance: Record<string, any>;
  limitations: string[];
  generated_at_utc: string;
}

export interface SleepAnalyticsResult {
  astronaut_id: string;
  model_status: string;
  status_note?: string;
  metrics: {
    recorded_total_sleep_time_hours?: number;
    estimated_time_in_bed_hours?: number;
    measured_sleep_efficiency_pct?: number;
    wake_after_sleep_onset_min?: number;
    awakenings_count?: number;
    circadian_phase_alignment_pct?: number;
    sleep_classification_descriptive?: string;
    [key: string]: any;
  };
  limitations: string[];
  generated_at_utc: string;
}

export interface ImmuneAnalyticsResult {
  astronaut_id: string;
  model_status: string;
  trajectory?: any;
  output?: {
    pca_coordinates: number[];
  };
  diversity_metrics: Record<string, any>;
  limitations: string[];
  generated_at_utc: string;
}

export interface MetabolicAnalyticsResult {
  astronaut_id: string;
  model_status: string;
  status_note?: string;
  biomarkers: Record<string, any>;
  limitations: string[];
  generated_at_utc: string;
}

export interface RadiationSummaryPayload {
  daily_absorbed_dose_mgy: number[];
  unit?: string;
  astronaut_id?: string;
}

export interface RadiationSummaryResult {
  model_name: string;
  model_version: string;
  status: string;
  input_features: Record<string, any>;
  output: {
    cumulative_absorbed_dose_mgy: number;
    mean_daily_absorbed_dose_mgy?: number;
    radiation_spike_days_statistical_only?: number[];
  };
  data_quality: string;
  provenance: Record<string, any>;
  limitations: string[];
  generated_at_utc: string;
}

export interface OcularBonePayload {
  current_onsd_mm?: number;
  baseline_onsd_mm?: number;
  bmd_t_score?: number;
  astronaut_id?: string;
}

export interface OcularBoneResult {
  model_name: string;
  model_version: string;
  status: string;
  input_features: Record<string, any>;
  output: {
    current_onsd_mm?: number;
    baseline_onsd_mm?: number;
    bmd_t_score?: number;
    [key: string]: any;
  };
  data_quality: string;
  provenance: Record<string, any>;
  limitations: string[];
  generated_at_utc: string;
}

export interface AstronautInsightsResult {
  astronaut_id: string;
  astronaut_name: string;
  mission_sol: number;
  cardiovascular?: CardiovascularAnalysisResult;
  sleep?: SleepAnalyticsResult;
  radiation?: RadiationSummaryResult;
  ocular?: OcularBoneResult;
  bone?: OcularBoneResult;
  immune?: ImmuneAnalyticsResult;
  metabolic?: MetabolicAnalyticsResult;
  clinical_disclaimer: string;
  generated_at_utc: string;
}

export interface ResearchModelRegistryEntry {
  id: string;
  status: string;
  inference: string;
  artifact?: string;
  basis?: string;
  permitted_output?: string;
  input_units?: Record<string, string>;
  prohibited_claims?: string[];
  replacement?: string;
}

export interface ResearchRegistryResult {
  registry_version: string;
  policy: string;
  models: ResearchModelRegistryEntry[];
  artifact_compatibility: Record<string, any>;
}

export interface ResearchStatusResult {
  package_status: string;
  policy: string;
  models: Record<string, any>;
  quarantined_count: number;
  enabled_count: number;
  runtime_sklearn_version: string;
  generated_at_utc: string;
}


