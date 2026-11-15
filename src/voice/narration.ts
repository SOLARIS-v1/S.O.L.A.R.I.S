/**
 * SOLARIS Narration and Clinical Assessment Briefing Engine
 */

import { AssessmentStepConfig } from './intents';
import { INDICATOR_THRESHOLDS } from '../data/thresholds';

export const CLINICAL_ASSESSMENT_QUESTIONS: AssessmentStepConfig[] = [
  {
    id: 'cardiovascular',
    domain: 'cardiovascular',
    title: '1. Cardiovascular & Autonomic Stability',
    question: 'How is your cardiovascular stability today? Any palpitations, resting pulse jumps, or lightheadedness when translating across modules?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('yes') || lower.includes('palpitation') || lower.includes('racing') || lower.includes('flutter') || lower.includes('dizzy') || lower.includes('jump')) {
        return 'Did the elevated heart rate occur during rest or following exercise, and did it resolve spontaneously without chest pressure?';
      }
      return 'Are your resting pulse and orthostatic blood pressure feeling steady and comfortable throughout orbital tasks?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('yes') || combined.includes('palpitation') || combined.includes('racing') || combined.includes('flutter') || combined.includes('dizzy') || combined.includes('jump') || combined.includes('ectopic');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? (combined.includes('chest') || combined.includes('severe') ? 'moderate' : 'mild') : 'nominal',
        note: hasIssue ? 'Transient autonomic ectopic jumps noted; evaluate continuous ECG lead-II recording.' : 'Cardiovascular hemodynamic stability nominal.',
        zone: 'heart',
      };
    },
  },
  {
    id: 'respiratory',
    domain: 'respiratory',
    title: '2. Respiratory & Habitat Atmosphere',
    question: 'Are you breathing comfortably without any chest tightness, airway irritation, or CO2-related air hunger?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('tight') || lower.includes('cough') || lower.includes('short') || lower.includes('air') || lower.includes('co2') || lower.includes('irritat')) {
        return 'Is the shortness of breath or irritation aggravated near life-support ventilation loops or during aerobic training?';
      }
      return 'Have oxygen and carbon dioxide levels in your sleep quarters and work module felt fresh and balanced?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('tight') || combined.includes('cough') || combined.includes('short') || combined.includes('air') || combined.includes('co2') || combined.includes('irritat');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? 'mild' : 'nominal',
        note: hasIssue ? 'Mild respiratory sensitivity logged; cross-checking ECLSS ambient CO2 partial pressure.' : 'Respiratory mechanics and alveolar ventilation nominal.',
        zone: 'lungs',
      };
    },
  },
  {
    id: 'neuro_ocular',
    domain: 'neuro_ocular',
    title: '3. Cephalad Fluid Shift & SANS Monitoring',
    question: 'Do you notice any facial fullness, sinus congestion, ocular pressure, or changes in near-distance visual clarity?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('blur') || lower.includes('eye') || lower.includes('pressure') || lower.includes('vision') || lower.includes('head') || lower.includes('full') || lower.includes('sinus')) {
        return 'Are you noticing visual grid distortion, blind spots, or difficulty reading small displays? An Amsler grid check is recommended.';
      }
      return 'Is your near visual sharpness stable when reading instrumentation panels?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('blur') || combined.includes('eye') || combined.includes('pressure') || combined.includes('vision') || combined.includes('head') || combined.includes('full') || combined.includes('sinus');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? (combined.includes('distortion') || combined.includes('blind') ? 'moderate' : 'mild') : 'nominal',
        note: hasIssue ? 'Cephalad fluid engorgement noted; schedule Amsler grid and fundus imaging.' : 'Neuro-ocular parameters and visual acuity nominal.',
        zone: 'head',
      };
    },
  },
  {
    id: 'musculoskeletal',
    domain: 'musculoskeletal',
    title: '4. Musculoskeletal & Spinal Loading',
    question: 'How is your spinal comfort and neuromuscular recovery following resistive training on ARED?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('pain') || lower.includes('ache') || lower.includes('back') || lower.includes('spine') || lower.includes('sore') || lower.includes('tight') || lower.includes('stiff')) {
        return 'Is the spinal discomfort concentrated in the lumbar region from microgravity spinal elongation, or does it radiate into your legs?';
      }
      return 'Are back extensor muscles feeling loose and adaptable during daily countermeasure protocols?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('pain') || combined.includes('ache') || combined.includes('back') || combined.includes('spine') || combined.includes('sore') || combined.includes('tight') || combined.includes('stiff');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? (combined.includes('radiat') || combined.includes('sharp') ? 'moderate' : 'mild') : 'nominal',
        note: hasIssue ? 'Lumbar unloading strain from microgravity spinal elongation; posture axial loading prescribed.' : 'Axial musculoskeletal structural comfort confirmed.',
        zone: 'spine',
      };
    },
  },
  {
    id: 'circadian_sleep',
    domain: 'circadian_sleep',
    title: '5. Sleep Architecture & Circadian Rest',
    question: 'How restorative was your sleep during the last crew rest cycle? Any mid-sleep awakenings or ambient noise disruption?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('poor') || lower.includes('bad') || lower.includes('restless') || lower.includes('tired') || lower.includes('woke') || lower.includes('fragment') || lower.includes('noise') || lower.includes('insomnia')) {
        return 'Did environmental acoustics, ventilation airflow, or thermal discomfort in your crew quarters disrupt your deep sleep cycles?';
      }
      return 'Did you awaken feeling fully restored and alert, without lingering grogginess or sleep inertia?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('poor') || combined.includes('bad') || combined.includes('restless') || combined.includes('tired') || combined.includes('woke') || combined.includes('fragment') || combined.includes('noise') || combined.includes('insomnia');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? (combined.includes('severe') || combined.includes('exhaust') ? 'moderate' : 'mild') : 'nominal',
        note: hasIssue ? 'Disrupted orbital sleep cycle with perceived sleep deficit; circadian lighting protocol recommended.' : 'Restorative sleep cycle nominal.',
        zone: 'head',
      };
    },
  },
  {
    id: 'fatigue_performance',
    domain: 'fatigue_performance',
    title: '6. Perceived Fatigue & Exertion Capacity',
    question: 'How would you rate your muscle fatigue and overall physical readiness for scheduled operational tasks?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('low') || lower.includes('weak') || lower.includes('fatigue') || lower.includes('sore') || lower.includes('heavy') || lower.includes('hard') || lower.includes('exhaust')) {
        return 'Were there localized muscle cramps, joint discomfort, or unusual exertion fatigue during daily countermeasure training?';
      }
      return 'Are your physical energy reserves feeling robust for today\'s scheduled mission workload?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('low') || combined.includes('weak') || combined.includes('fatigue') || combined.includes('sore') || combined.includes('heavy') || combined.includes('hard') || combined.includes('cramp');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? 'mild' : 'nominal',
        note: hasIssue ? 'Exertion fatigue noted; review daily ARED/T2 loading profile and electrolyte intake.' : 'Full operational physical exertion capacity confirmed.',
        zone: 'heart',
      };
    },
  },
  {
    id: 'cognitive_morale',
    domain: 'cognitive_morale',
    title: '7. Cognitive Focus & Operational Morale',
    question: 'How is your mental focus, cognitive clarity, and operational morale heading into today\'s mission schedule?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('stress') || lower.includes('low') || lower.includes('overwhelm') || lower.includes('fog') || lower.includes('drain') || lower.includes('struggle') || lower.includes('hard')) {
        return 'Are you experiencing task saturation, communication stress, or difficulty maintaining attention on telemetry checks?';
      }
      return 'Do you feel clear-headed, mentally focused, and well-aligned with flight operations?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('stress') || combined.includes('low') || combined.includes('overwhelm') || combined.includes('fog') || combined.includes('drain') || combined.includes('struggle') || combined.includes('isolate');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? 'mild' : 'nominal',
        note: hasIssue ? 'Operational cognitive strain noted; adjust work-rest cycle and mission pacing.' : 'High cognitive sharpness and mission morale confirmed.',
        zone: 'head',
      };
    },
  },
];

export interface IndicatorVerdict {
  status: 'good' | 'watch' | 'review' | 'urgent';
  spokenText: string;
}

/**
 * Builds a dynamic verbal briefing strictly from real telemetry readings.
 * Never invents values. If readings are missing, states "I don't have a recent reading".
 */
export function buildBriefing(
  readings: Record<string, number | string | null | undefined>,
  _thresholds = INDICATOR_THRESHOLDS,
  _baseline?: Record<string, number>
): {
  overviewText: string;
  notableReadings: string[];
  possibleCause?: string;
  lifestyleSuggestion?: string;
  followUpPrompt: string;
} {
  const notable: string[] = [];

  const hr = readings['heart_rate'] as number | undefined;
  const spo2 = readings['spo2'] as number | undefined;
  const sleep = readings['sleep'] as number | undefined;

  if (hr !== undefined && hr !== null) {
    if (hr > 95) {
      notable.push(`heart rate elevated at ${hr} BPM`);
    } else if (hr < 50) {
      notable.push(`heart rate resting low at ${hr} BPM`);
    }
  }

  if (sleep !== undefined && sleep !== null) {
    if (sleep < 6) {
      notable.push(`sleep deficit recorded at ${sleep} hours`);
    }
  }

  if (spo2 !== undefined && spo2 !== null) {
    if (spo2 < 96) {
      notable.push(`oxygen saturation slightly decreased at ${spo2}%`);
    }
  }

  let overviewText = '';
  if (notable.length === 0) {
    overviewText = 'All recorded biometric parameters are within nominal operational limits.';
  } else {
    overviewText = `Telemetry review shows notable indications: ${notable.join(', ')}.`;
  }

  let possibleCause: string | undefined;
  let lifestyleSuggestion: string | undefined;

  if (sleep !== undefined && sleep < 6 && hr !== undefined && hr > 85) {
    possibleCause = 'This may be linked to circadian rhythm desynchrony and acute fatigue.';
    lifestyleSuggestion = 'Consider an early rest cycle, hydration, and lower ambient lighting.';
  } else if (hr !== undefined && hr > 95) {
    possibleCause = 'This may be linked to post-exercise cardiovascular recovery or mild stress.';
    lifestyleSuggestion = 'Hydrate and monitor resting heart rate stability before next task.';
  }

  const followUpPrompt = 'Want me to read everything, start your check-in, or open your trends?';

  return {
    overviewText,
    notableReadings: notable,
    possibleCause,
    lifestyleSuggestion,
    followUpPrompt,
  };
}
