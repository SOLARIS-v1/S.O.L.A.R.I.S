/**
 * Comprehensive Unit Test Suite for SOLARIS Voice Command Registry & Safety
 * Tests 45+ utterances covering navigation, body inspection, timeline, dictation, and edge cases.
 */

import {
  matchVoiceCommand,
  normalizeVoiceInput,
  stringSimilarity,
} from '../commandRegistry';
import { isSleepCommand, isWakeCommand } from '../intents';

interface TestAssertion {
  utterance: string;
  expectedCategory?: string;
  expectedId?: string;
  shouldMatch: boolean;
  notes?: string;
}

const TEST_CASES: TestAssertion[] = [
  // --- 1. Navigation (12 Screens & Synonyms) ---
  { utterance: 'stage', expectedId: 'nav_stage', shouldMatch: true },
  { utterance: 'go to home', expectedId: 'nav_stage', shouldMatch: true },
  { utterance: 'overview', expectedId: 'nav_stage', shouldMatch: true },
  { utterance: 'dashboard', expectedId: 'nav_stage', shouldMatch: true },
  { utterance: 'open monitoring', expectedId: 'nav_monitoring', shouldMatch: true },
  { utterance: 'telemetry', expectedId: 'nav_monitoring', shouldMatch: true },
  { utterance: 'show body', expectedId: 'nav_body', shouldMatch: true },
  { utterance: '3d explorer', expectedId: 'nav_body', shouldMatch: true },
  { utterance: 'start check-in', expectedId: 'nav_checkin', shouldMatch: true },
  { utterance: 'daily check in', expectedId: 'nav_checkin', shouldMatch: true },
  { utterance: 'assessment', expectedId: 'nav_checkin', shouldMatch: true },
  { utterance: 'open measure', expectedId: 'nav_measure', shouldMatch: true },
  { utterance: 'diagnostics lab', expectedId: 'nav_measure', shouldMatch: true },
  { utterance: 'eye test', expectedId: 'nav_eyetest', shouldMatch: true },
  { utterance: 'vision test', expectedId: 'nav_eyetest', shouldMatch: true },
  { utterance: 'exercise', expectedId: 'nav_exercise', shouldMatch: true },
  { utterance: 'workout', expectedId: 'nav_exercise', shouldMatch: true },
  { utterance: 'countermeasures', expectedId: 'nav_exercise', shouldMatch: true },
  { utterance: 'open analytics', expectedId: 'nav_analytics', shouldMatch: true },
  { utterance: 'show trends', expectedId: 'nav_analytics', shouldMatch: true },
  { utterance: 'medical', expectedId: 'nav_medical', shouldMatch: true },
  { utterance: 'clinical review', expectedId: 'nav_medical', shouldMatch: true },
  { utterance: 'environment', expectedId: 'nav_environment', shouldMatch: true },
  { utterance: 'habitat', expectedId: 'nav_environment', shouldMatch: true },
  { utterance: 'settings', expectedId: 'nav_settings', shouldMatch: true },

  // --- 2. Body Explorer & Camera ---
  { utterance: 'show my heart', expectedId: 'body_region_inspect', shouldMatch: true },
  { utterance: 'inspect lungs', expectedId: 'body_region_inspect', shouldMatch: true },
  { utterance: 'ocular view', expectedId: 'body_region_inspect', shouldMatch: true },
  { utterance: 'inspect back', expectedId: 'body_region_inspect', shouldMatch: true },
  { utterance: 'show my skin', expectedId: 'body_region_inspect', shouldMatch: true },
  { utterance: 'inspect bones', expectedId: 'body_region_inspect', shouldMatch: true },
  { utterance: 'show brain', expectedId: 'body_region_inspect', shouldMatch: true },
  { utterance: 'rotate left', expectedId: 'body_camera_control', shouldMatch: true },
  { utterance: 'zoom in', expectedId: 'body_camera_control', shouldMatch: true },
  { utterance: 'x-ray view', expectedId: 'body_camera_control', shouldMatch: true },

  // --- 3. Timeline Scrubber ---
  { utterance: 'go back 7 days', expectedId: 'timeline_control', shouldMatch: true },
  { utterance: 'go back 14 days', expectedId: 'timeline_control', shouldMatch: true },
  { utterance: 'go to sol 120', expectedId: 'timeline_control', shouldMatch: true },
  { utterance: 'next finding', expectedId: 'timeline_control', shouldMatch: true },
  { utterance: 'reset to today', expectedId: 'timeline_control', shouldMatch: true },

  // --- 4. Analytics Ranges ---
  { utterance: 'show 7 days', expectedId: 'analytics_range', shouldMatch: true },
  { utterance: 'show 30 days', expectedId: 'analytics_range', shouldMatch: true },
  { utterance: 'compare sleep and heart rate', expectedId: 'analytics_compare', shouldMatch: true },

  // --- 5. Drawers ---
  { utterance: 'open tasks', expectedId: 'drawer_controls', shouldMatch: true },
  { utterance: 'open environment', expectedId: 'drawer_controls', shouldMatch: true },
  { utterance: 'open simulator', expectedId: 'drawer_controls', shouldMatch: true },
  { utterance: 'close', expectedId: 'drawer_controls', shouldMatch: true },

  // --- 6. Dictation ---
  { utterance: 'my blood pressure is 120 over 80', expectedId: 'dictate_blood_pressure', shouldMatch: true },
  { utterance: 'my core temp is 37.1', expectedId: 'dictate_vitals_single', shouldMatch: true },
  { utterance: 'my glucose is 92', expectedId: 'dictate_vitals_single', shouldMatch: true },

  // --- 7. Generic DOM Click Fallback ---
  { utterance: 'click Submit', expectedId: 'generic_click', shouldMatch: true },
  { utterance: 'press Confirm', expectedId: 'generic_click', shouldMatch: true },

  // --- 8. Screen Scrolling & Help ---
  { utterance: 'scroll down', expectedId: 'scroll_control', shouldMatch: true },
  { utterance: 'scroll to top', expectedId: 'scroll_control', shouldMatch: true },
  { utterance: 'what can i say', expectedId: 'voice_help', shouldMatch: true },
];

export function runTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  console.log(`Running Voice Command Registry Suite (${TEST_CASES.length} cases)...`);

  for (const tc of TEST_CASES) {
    const match = matchVoiceCommand(tc.utterance);
    if (tc.shouldMatch) {
      if (!match) {
        failed++;
        errors.push(`FAIL: "${tc.utterance}" expected match for ${tc.expectedId}, got null`);
      } else if (tc.expectedId && match.command.id !== tc.expectedId) {
        failed++;
        errors.push(`FAIL: "${tc.utterance}" expected ${tc.expectedId}, got ${match.command.id}`);
      } else {
        passed++;
      }
    } else {
      if (match) {
        failed++;
        errors.push(`FAIL: "${tc.utterance}" expected NO match, got ${match.command.id}`);
      } else {
        passed++;
      }
    }
  }

  // --- Safety Critical Tests: Sleep Guard ---
  // "how was my sleep" must NEVER sleep the assistant!
  const sleepFalsePositive = isSleepCommand(normalizeVoiceInput('how was my sleep'));
  if (sleepFalsePositive) {
    failed++;
    errors.push('CRITICAL FAIL: "how was my sleep" triggered sleep!');
  } else {
    passed++;
  }

  const sleepAnalysisFalsePositive = isSleepCommand(normalizeVoiceInput('sleep analysis'));
  if (sleepAnalysisFalsePositive) {
    failed++;
    errors.push('CRITICAL FAIL: "sleep analysis" triggered sleep!');
  } else {
    passed++;
  }

  // "sleep solaris" MUST sleep the assistant
  const realSleep = isSleepCommand(normalizeVoiceInput('sleep solaris'));
  if (!realSleep) {
    failed++;
    errors.push('CRITICAL FAIL: "sleep solaris" did NOT trigger sleep!');
  } else {
    passed++;
  }

  // Name Alias normalization test: "solar is" -> "solaris"
  const aliasNorm = normalizeVoiceInput('solar is wake up');
  if (!aliasNorm.includes('solaris')) {
    failed++;
    errors.push(`FAIL: alias "solar is" not normalized to "solaris", got "${aliasNorm}"`);
  } else {
    passed++;
  }

  // Dictation parameter extraction test
  const bpMatch = matchVoiceCommand('my blood pressure is 128 over 82');
  if (bpMatch?.params?.sys === 128 && bpMatch?.params?.dia === 82) {
    passed++;
  } else {
    failed++;
    errors.push(`FAIL: Blood pressure params mismatch: ${JSON.stringify(bpMatch?.params)}`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (errors.length > 0) {
    console.error('Errors:\n' + errors.join('\n'));
    throw new Error(`${failed} tests failed`);
  }
  return { passed, failed, errors };
}

// Execute if run directly
try {
  runTests();
} catch (e) {
  process.exit(1);
}
