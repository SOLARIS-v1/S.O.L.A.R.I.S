/**
 * SOLARIS Computed Narration and Dynamic Briefing Engine
 * 
 * Strict clinical decision support rules:
 * - Computes verdict from real readings against INDICATOR_THRESHOLDS and personal baseline (median/MAD)
 * - Verdicts: good, watch, review, urgent
 * - One overall sentence, up to 3 notable readings with numbers
 * - Plausible physiological links ("may be linked to")
 * - Safe lifestyle suggestions (rest, hydration, recheck, light exercise; NO medications)
 * - Emergency screening (chest pain, breathing difficulty, fainting, severe pain) triggers immediate medical officer referral
 */

import { AssessmentStepConfig } from './intents';
import { INDICATOR_THRESHOLDS } from '../data/thresholds';

export type ReadingVerdictLevel = 'good' | 'watch' | 'review' | 'urgent';

export interface EvaluatedReading {
  key: string;
  label: string;
  value: number | string;
  unit: string;
  level: ReadingVerdictLevel;
  verdictPhrase: string;
  notable: boolean;
}

export interface ComputedBriefing {
  overallSentence: string;
  notableReadings: EvaluatedReading[];
  notableText: string;
  possibleCause?: string;
  lifestyleSuggestion?: string;
  fullSpeech: string;
  followUpPrompt: string;
}

const GOOD_PHRASES = ["that's good", 'right where it should be', 'in optimal range', 'holding steady'];
const WATCH_PHRASES = ['a little higher than your usual', 'slightly below baseline', 'showing mild deviation'];
const REVIEW_PHRASES = ['worth keeping an eye on', 'elevated above expected limits', 'showing notable strain'];
const URGENT_PHRASES = ['requiring immediate clinical review', 'please contact the medical officer now'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Computes personal baseline median and Median Absolute Deviation (MAD) if >= 5 readings exist.
 */
export function computeBaseline(historyValues: number[]): { median: number; mad: number } | null {
  if (historyValues.length < 5) return null;
  const sorted = [...historyValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  const deviations = sorted.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = deviations.length % 2 !== 0 ? deviations[mid] : (deviations[mid - 1] + deviations[mid]) / 2;
  return { median, mad: Math.max(0.1, mad) };
}

/**
 * Evaluates an individual reading against thresholds and personal baseline.
 */
export function evaluateReading(
  key: string,
  value: number | string | null | undefined,
  history?: number[]
): EvaluatedReading | null {
  if (value === undefined || value === null || value === '') return null;

  const numVal = typeof value === 'number' ? value : parseFloat(value as string);
  const threshold = (INDICATOR_THRESHOLDS as any)[key];

  if (isNaN(numVal) || !threshold) {
    return {
      key,
      label: key,
      value,
      unit: '',
      level: 'good',
      verdictPhrase: pickRandom(GOOD_PHRASES),
      notable: false,
    };
  }

  const baseline = history && history.length >= 5 ? computeBaseline(history) : null;
  let level: ReadingVerdictLevel = 'good';
  let notable = false;

  // Check urgent
  if (threshold.urgent_high !== undefined && numVal >= threshold.urgent_high) {
    level = 'urgent';
    notable = true;
  } else if (threshold.urgent_low !== undefined && numVal <= threshold.urgent_low) {
    level = 'urgent';
    notable = true;
  } else if (threshold.watch_range && numVal >= threshold.watch_range[0] && numVal <= threshold.watch_range[1]) {
    level = 'watch';
    notable = true;
  } else if (baseline) {
    // If > 2.5 MAD from personal median, flag for review
    const dist = Math.abs(numVal - baseline.median) / baseline.mad;
    if (dist > 3.0) {
      level = 'review';
      notable = true;
    } else if (dist > 2.0) {
      level = 'watch';
      notable = true;
    }
  } else if (threshold.normal_range) {
    if (numVal < threshold.normal_range[0] || numVal > threshold.normal_range[1]) {
      level = 'review';
      notable = true;
    }
  }

  let verdictPhrase = pickRandom(GOOD_PHRASES);
  if (level === 'watch') verdictPhrase = pickRandom(WATCH_PHRASES);
  else if (level === 'review') verdictPhrase = pickRandom(REVIEW_PHRASES);
  else if (level === 'urgent') verdictPhrase = pickRandom(URGENT_PHRASES);

  return {
    key,
    label: threshold.label || key,
    value: numVal,
    unit: threshold.unit || '',
    level,
    verdictPhrase,
    notable,
  };
}

/**
 * Authoritative computed briefing generator.
 * Strictly ground in numbers; never fabricates data.
 */
export function buildBriefing(
  readings: Record<string, number | string | null | undefined>,
  _thresholds = INDICATOR_THRESHOLDS,
  baselines?: Record<string, number[]>
): ComputedBriefing {
  const evaluatedList: EvaluatedReading[] = [];

  const candidateKeys = [
    'heart_rate',
    'blood_pressure_sys',
    'spo2',
    'sleep_duration',
    'core_temp',
    'hrv_rmssd',
    'resp_rate',
    'glucose',
  ];

  for (const k of candidateKeys) {
    const val = readings[k] ?? readings[k.replace('_duration', '')] ?? readings[k.replace('core_', '')];
    const evaluated = evaluateReading(k, val, baselines?.[k]);
    if (evaluated) {
      evaluatedList.push(evaluated);
    }
  }

  // Identify up to 3 notable readings (urgent/review/watch)
  const notableList = evaluatedList
    .filter((e) => e.notable)
    .sort((a, b) => {
      const rank = { urgent: 3, review: 2, watch: 1, good: 0 };
      return rank[b.level] - rank[a.level];
    })
    .slice(0, 3);

  let overallSentence = '';
  if (notableList.length === 0) {
    overallSentence = 'All recorded biometric parameters are currently nominal and holding steady within your expected flight envelope.';
  } else if (notableList.some((n) => n.level === 'urgent')) {
    overallSentence = 'Telemetry screening flags high deviation readings requiring immediate review.';
  } else if (notableList.some((n) => n.level === 'review')) {
    overallSentence = 'Telemetry shows notable physiological adjustments across your recent operational cycle.';
  } else {
    overallSentence = 'Your biometric trends are generally stable with minor operational variance.';
  }

  const notableDescriptions = notableList.map((n) => `${n.label} is ${n.value} ${n.unit}, which is ${n.verdictPhrase}`);
  const notableText = notableDescriptions.join('. ');

  // Rule table for causal connections ("may be linked to")
  let possibleCause: string | undefined;
  let lifestyleSuggestion: string | undefined;

  const hrReading = evaluatedList.find((e) => e.key === 'heart_rate');
  const sleepReading = evaluatedList.find((e) => e.key === 'sleep_duration');
  const hrvReading = evaluatedList.find((e) => e.key === 'hrv_rmssd');
  const bpReading = evaluatedList.find((e) => e.key === 'blood_pressure_sys');

  if (sleepReading && (sleepReading.value as number) < 5.5 && hrReading && (hrReading.value as number) > 85) {
    possibleCause = 'The elevated resting heart rate combined with reduced sleep duration may be linked to circadian disruption and cumulative sleep debt.';
    lifestyleSuggestion = 'Schedule 30 minutes of quiet rest before flight checks, prioritize hydration, and dim cabin lighting.';
  } else if (hrvReading && (hrvReading.value as number) < 40 && hrReading && (hrReading.value as number) > 90) {
    possibleCause = 'Decreased heart rate variability and transient tachycardia may be linked to post-exercise countermeasure exertion or autonomic stress.';
    lifestyleSuggestion = 'Perform 5 minutes of paced breathing, hydrate with electrolyte solution, and recheck cardiac telemetry.';
  } else if (bpReading && (bpReading.value as number) > 130) {
    possibleCause = 'Elevated systolic pressure may be linked to microgravity cephalad fluid redistribution and transient vascular tone adjustment.';
    lifestyleSuggestion = 'Avoid abrupt posture inversion, verify hydration balance, and repeat blood pressure measurement in 20 minutes.';
  }

  const followUpPrompt = 'Want me to read everything, start your check-in, or open your trends?';

  const speechParts: string[] = [overallSentence];
  if (notableText) speechParts.push(notableText + '.');
  if (possibleCause) speechParts.push(possibleCause);
  if (lifestyleSuggestion) speechParts.push(lifestyleSuggestion);
  speechParts.push(followUpPrompt);

  return {
    overallSentence,
    notableReadings: notableList,
    notableText,
    possibleCause,
    lifestyleSuggestion,
    fullSpeech: speechParts.join(' '),
    followUpPrompt,
  };
}

/**
 * 5-Step Verbal Check-In Questionnaire as specified in Phase 2:
 * 1. How are you feeling
 * 2. Trouble sleeping
 * 3. Skin changes
 * 4. Back or spine discomfort
 * 5. Anything else
 */
export const VERBAL_CHECKIN_STEPS = [
  {
    id: 'general_feeling',
    prompt: 'How are you feeling overall today?',
    summaryKey: 'General Well-being',
  },
  {
    id: 'sleep_trouble',
    prompt: 'Have you had any trouble sleeping or staying asleep in your crew quarters?',
    summaryKey: 'Sleep Quality',
  },
  {
    id: 'skin_changes',
    prompt: 'Have you noticed any skin irritation, dryness, or rashes from sensor pads or suit contact?',
    summaryKey: 'Dermal Condition',
  },
  {
    id: 'spine_discomfort',
    prompt: 'Are you feeling any back tightness, spinal elongation ache, or lumbar discomfort?',
    summaryKey: 'Spinal Comfort',
  },
  {
    id: 'additional_notes',
    prompt: 'Is there anything else regarding your physical comfort or mission focus you would like to log?',
    summaryKey: 'Additional Notes',
  },
];

export function checkEmergencySymptoms(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('chest pain') ||
    lower.includes('trouble breathing') ||
    lower.includes('shortness of breath') ||
    lower.includes('cannot breathe') ||
    lower.includes('fainted') ||
    lower.includes('passed out') ||
    lower.includes('blacked out') ||
    lower.includes('severe pain')
  );
}

export const CLINICAL_ASSESSMENT_QUESTIONS: AssessmentStepConfig[] = [
  {
    id: 'cardiovascular',
    domain: 'cardiovascular',
    title: '1. Cardiovascular & Autonomic Stability',
    question: 'How is your cardiovascular stability today? Any palpitations or resting pulse jumps?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('yes') || lower.includes('palpitation') || lower.includes('racing') || lower.includes('dizzy')) {
        return 'Did the pulse jump occur during rest or after training, and did it resolve spontaneously?';
      }
      return 'Are your pulse and blood pressure feeling steady and comfortable?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('yes') || combined.includes('palpitation') || combined.includes('racing') || combined.includes('dizzy');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? 'mild' : 'nominal',
        note: hasIssue ? 'Transient pulse variation reported; ECG review recommended.' : 'Cardiovascular stability nominal.',
        zone: 'heart',
      };
    },
  },
  {
    id: 'respiratory',
    domain: 'respiratory',
    title: '2. Respiratory Mechanics',
    question: 'Are you breathing comfortably without chest tightness or air hunger?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('tight') || lower.includes('short') || lower.includes('cough')) {
        return 'Is the tightness aggravated during exercise or near ventilation ducts?';
      }
      return 'Has cabin air quality felt comfortable in your workspace?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('tight') || combined.includes('short') || combined.includes('cough');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? 'mild' : 'nominal',
        note: hasIssue ? 'Airway sensitivity noted; cross-checking cabin airflow.' : 'Respiratory mechanics nominal.',
        zone: 'lungs',
      };
    },
  },
  {
    id: 'neuro_ocular',
    domain: 'neuro_ocular',
    title: '3. Vision & Ocular Screening',
    question: 'Notice any blurriness, blind spots, or eye pressure when looking at displays?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('blur') || lower.includes('blind') || lower.includes('pressure') || lower.includes('spot')) {
        return 'Are lines appearing distorted or wavy? An Amsler grid test is advised.';
      }
      return 'Is your near visual acuity clear for reading task checklists?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('blur') || combined.includes('blind') || combined.includes('pressure') || combined.includes('spot');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? 'moderate' : 'nominal',
        note: hasIssue ? 'Visual distortion flagged; Amsler test recommended.' : 'Visual acuity nominal.',
        zone: 'head',
      };
    },
  },
  {
    id: 'musculoskeletal',
    domain: 'musculoskeletal',
    title: '4. Spine & Musculoskeletal Comfort',
    question: 'How is your spinal comfort following resistive exercise on ARED?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('pain') || lower.includes('ache') || lower.includes('back') || lower.includes('spine')) {
        return 'Is the ache located in the lower lumbar spine from microgravity elongation?';
      }
      return 'Are your muscles feeling flexible and well-adapted?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('pain') || combined.includes('ache') || combined.includes('back') || combined.includes('spine');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? 'mild' : 'nominal',
        note: hasIssue ? 'Spinal unloading strain noted; posture countermeasures advised.' : 'Musculoskeletal comfort nominal.',
        zone: 'spine',
      };
    },
  },
  {
    id: 'circadian_sleep',
    domain: 'circadian_sleep',
    title: '5. Sleep & Circadian Rest',
    question: 'Did you wake up feeling well rested, without lingering grogginess?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('no') || lower.includes('tired') || lower.includes('poor') || lower.includes('bad') || lower.includes('woke')) {
        return 'Did cabin acoustics or temperature disturb your rest period?';
      }
      return 'Are your alertness and energy steady for scheduled duties?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('no') || combined.includes('tired') || combined.includes('poor') || combined.includes('bad') || combined.includes('woke');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? 'mild' : 'nominal',
        note: hasIssue ? 'Perceived sleep deficit logged; circadian lighting suggested.' : 'Restorative sleep confirmed.',
        zone: 'head',
      };
    },
  },
];
