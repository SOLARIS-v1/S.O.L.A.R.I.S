/**
 * SOLARIS Voice Intent Parsing & Command Mapping
 * 
 * Strict mission directives:
 * - Wake: Tap or Space (no always-on hotword)
 * - Sleep: ONLY "sleep solaris", "stop listening", etc. (never triggers on "how was my sleep")
 * - Read commands: "read my readings", "read manually" (step-by-step), "read [indicator]"
 * - Query commands: "how am I doing", "what changed", "start check-in", "show body", "show trends", "repeat", "be quiet", "switch user"
 * - Typed only mode (renamed from manual mode)
 * - Identification fuzzy matcher
 */

export type SolarisVoiceState =
  | 'sleeping'
  | 'awake'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'typed_only'
  | 'error'
  | 'unavailable';

export type VoiceProviderMode = 'local' | 'typed';

export interface AssessmentStepConfig {
  id: string;
  domain: 'cardiovascular' | 'respiratory' | 'neuro_ocular' | 'musculoskeletal' | 'circadian_sleep' | 'fatigue_performance' | 'cognitive_morale';
  title: string;
  question: string;
  generateFollowUp: (answer: string) => string;
  interpret: (answer: string, followUpAnswer: string) => {
    symptomDetected: boolean;
    severity: 'nominal' | 'mild' | 'moderate' | 'marked';
    note: string;
    zone?: 'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen' | 'eyes';
  };
}

export interface AssessmentFlowState {
  isActive: boolean;
  stage: 'idle' | 'asking_question' | 'listening_answer' | 'asking_followup' | 'listening_followup' | 'summarizing' | 'awaiting_confirmation' | 'saved' | 'cancelled';
  currentStepIndex: number;
  currentQuestion?: AssessmentStepConfig;
  answers: Record<string, { answer: string; followUpAnswer?: string; interpretation?: string; domain?: string }>;
  summaryText: string;
  affectedZones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen' | 'eyes'>;
}

export interface VoiceCommandResult {
  handled: boolean;
  intent: string;
  spokenResponse: string;
  navigationTarget?: string;
  highlightMetric?: string;
  newState?: SolarisVoiceState;
  stepByStepIndex?: number;
}

export function normalizeVoiceInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether an utterance is an explicit sleep command.
 * Strictly triggers only on "sleep solaris", "go to sleep solaris", "stop listening", etc.
 * Never triggers on a sentence merely containing "sleep" (for example "how was my sleep").
 */
export function isSleepCommand(normalized: string): boolean {
  if (
    normalized.includes('how was my sleep') ||
    normalized.includes('how did i sleep') ||
    normalized.includes('check my sleep') ||
    normalized.includes('read my sleep') ||
    normalized.includes('read sleep') ||
    normalized.includes('about my sleep') ||
    normalized.includes('sleep quality') ||
    normalized.includes('sleep report') ||
    normalized.includes('sleep score') ||
    normalized.includes('sleep hours')
  ) {
    return false;
  }

  return (
    normalized === 'sleep solaris' ||
    normalized.includes('sleep solaris') ||
    normalized.includes('go to sleep solaris') ||
    normalized.includes('stop listening') ||
    normalized === 'be quiet' ||
    normalized === 'sleep'
  );
}

/**
 * Checks whether an utterance is an explicit wake command.
 */
export function isWakeCommand(normalized: string): boolean {
  return (
    normalized.includes('wake up solaris') ||
    normalized.includes('wake solaris') ||
    normalized.includes('hey solaris') ||
    normalized.includes('hello solaris') ||
    normalized === 'solaris'
  );
}

export type IndicatorKeyword =
  | 'heart_rate'
  | 'blood_pressure'
  | 'sleep'
  | 'glucose'
  | 'temperature'
  | 'spo2'
  | 'hrv'
  | 'respiration';

/**
 * Matches an explicit indicator read command like "read heart rate", "read blood pressure".
 */
export function matchIndicatorQuery(normalized: string): IndicatorKeyword | null {
  if (normalized.includes('heart rate') || normalized.includes('pulse') || normalized.includes('bpm')) {
    return 'heart_rate';
  }
  if (normalized.includes('blood pressure') || normalized.includes('systolic') || normalized.includes('diastolic')) {
    return 'blood_pressure';
  }
  if (normalized.includes('sleep') || normalized.includes('sleep duration') || normalized.includes('sleep report')) {
    return 'sleep';
  }
  if (normalized.includes('glucose') || normalized.includes('blood sugar')) {
    return 'glucose';
  }
  if (normalized.includes('temperature') || normalized.includes('core temp') || normalized.includes('fever')) {
    return 'temperature';
  }
  if (normalized.includes('spo2') || normalized.includes('oxygen') || normalized.includes('saturation')) {
    return 'spo2';
  }
  if (normalized.includes('hrv') || normalized.includes('heart rate variability')) {
    return 'hrv';
  }
  if (normalized.includes('respiration') || normalized.includes('breathing rate') || normalized.includes('resp rate')) {
    return 'respiration';
  }
  return null;
}

export interface CrewMatchResult {
  matchedId: string | null;
  confidence: number;
  displayName: string;
  spokenName: string;
}

/**
 * Fuzzy matches spoken/typed identification answers against crew roster.
 * Supports Sarah Chen, Elena Patel, Marcus Vance, Alexei Brooks.
 * Accepts first name, last name, or callsign.
 */
export function matchCrewIdentification(rawInput: string): CrewMatchResult | null {
  const norm = normalizeVoiceInput(rawInput);

  // Sarah Chen (Flight Engineer / Science Officer)
  if (
    norm.includes('sarah') ||
    norm.includes('chen') ||
    norm.includes('maya') ||
    norm.includes('aura') ||
    norm.includes('flight engineer') ||
    norm.includes('science officer')
  ) {
    return {
      matchedId: 'chen',
      confidence: 0.95,
      displayName: 'Commander Chen',
      spokenName: 'Sarah',
    };
  }

  // Marcus Vance (Mission Commander)
  if (
    norm.includes('marcus') ||
    norm.includes('vance') ||
    norm.includes('alex') ||
    norm.includes('morgan') ||
    norm.includes('apex') ||
    norm.includes('commander')
  ) {
    return {
      matchedId: 'vance',
      confidence: 0.95,
      displayName: 'Commander Vance',
      spokenName: 'Marcus',
    };
  }

  // Elena Patel (EVA Specialist)
  if (
    norm.includes('elena') ||
    norm.includes('patel') ||
    norm.includes('sofia') ||
    norm.includes('reyes') ||
    norm.includes('nova') ||
    norm.includes('specialist') ||
    norm.includes('payload')
  ) {
    return {
      matchedId: 'patel',
      confidence: 0.95,
      displayName: 'Specialist Patel',
      spokenName: 'Elena',
    };
  }

  // Alexei Brooks (Medical Specialist / Flight Surgeon)
  if (
    norm.includes('alexei') ||
    norm.includes('alexey') ||
    norm.includes('brooks') ||
    norm.includes('daniel') ||
    norm.includes('vanguard') ||
    norm.includes('doctor') ||
    norm.includes('medical specialist') ||
    norm.includes('surgeon')
  ) {
    return {
      matchedId: 'brooks',
      confidence: 0.95,
      displayName: 'Dr. Brooks',
      spokenName: 'Alexei',
    };
  }

  return null;
}
