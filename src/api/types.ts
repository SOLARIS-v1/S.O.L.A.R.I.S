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
