/**
 * SOLARIS Voice Intent Parsing & Command Mapping
 */

export type SolarisVoiceState =
  | 'sleeping'
  | 'awake'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'manual_mode'
  | 'error'
  | 'unavailable';

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
}

export interface ParsedIntent {
  intent: string;
  confidence: number;
  params?: Record<string, string>;
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
 * Strictly triggers only on "sleep solaris", "stop listening", etc.
 * Never triggers on a query merely containing "sleep" (e.g. "how did I sleep").
 */
export function isSleepCommand(normalized: string): boolean {
  if (normalized.includes('sleep solaris') || normalized.includes('go to sleep solaris') || normalized === 'sleep') {
    return true;
  }
  if (normalized.includes('stop listening') || normalized.includes('be quiet') || normalized.includes('go to sleep')) {
    // Only if not inquiring about sleep
    if (!normalized.includes('how') && !normalized.includes('what') && !normalized.includes('read') && !normalized.includes('my sleep')) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether an utterance is a wake command.
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
