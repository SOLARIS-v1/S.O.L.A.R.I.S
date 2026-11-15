/**
 * SOLARIS Voice Command Registry & Pattern Matcher
 * Provides deterministic and fuzzy command matching across global and page-scoped routes.
 */

import { uiBus } from './uiBus';

export interface CommandDefinition {
  id: string;
  category: 'navigation' | 'body' | 'timeline' | 'analytics' | 'measure' | 'checkin' | 'drawers' | 'system';
  phrases: string[];
  routeScope?: 'global' | string[];
  needsConfirmation?: boolean;
  helpText: string;
  feedbackText: (params?: any) => string;
  handler: (params?: any, context?: any) => Promise<string | void> | string | void;
  extractParams?: (rawText: string, cleanText: string) => any;
}

// --- Levenshtein Distance & Fuzzy Matcher ---
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const maxLen = Math.max(s1.length, s2.length);
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, (maxLen - dist) / maxLen);
}

// --- Normalize Text & Handle Name Aliases ---
export function normalizeVoiceInput(raw: string): string {
  let text = raw.toLowerCase().trim();
  // Map common Whisper/STT mishearings of the assistant name
  text = text.replace(/\b(solar\s+is|solarus|solaris's|solar\s+us|solaries)\b/g, 'solaris');
  text = text.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

// --- DOM Interactive Element Locator for "click <label>" ---
export function executeClickElement(targetLabel: string): { success: boolean; requiresConfirm?: boolean; message?: string } {
  const cleanTarget = targetLabel.toLowerCase().trim();
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [role="button"]:not([aria-disabled="true"]), [role="tab"], input[type="submit"], input[type="button"]'
    )
  );

  let bestMatch: { element: HTMLElement; score: number; label: string } | null = null;

  for (const el of elements) {
    // Only inspect visible elements
    if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) continue;

    const accessibleName = (
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.innerText ||
      el.textContent ||
      ''
    ).toLowerCase().trim();

    if (!accessibleName) continue;

    if (accessibleName === cleanTarget || accessibleName.includes(cleanTarget)) {
      bestMatch = { element: el, score: 1.0, label: accessibleName };
      break;
    }

    const sim = stringSimilarity(cleanTarget, accessibleName);
    if (sim >= 0.75 && (!bestMatch || sim > bestMatch.score)) {
      bestMatch = { element: el, score: sim, label: accessibleName };
    }
  }

  if (!bestMatch) {
    return { success: false, message: `Could not find button or link matching "${targetLabel}".` };
  }

  // Safety confirmation check
  const dangerousLabels = ['delete', 'reset', 'clear', 'wipe', 'purge', 'cancel session'];
  if (dangerousLabels.some((d) => bestMatch!.label.includes(d))) {
    return {
      success: false,
      requiresConfirm: true,
      message: `You requested to ${bestMatch.label}. Please confirm by saying 'yes' to proceed.`,
    };
  }

  // Visual highlight ring (600ms) before clicking
  const targetEl = bestMatch.element;
  const originalOutline = targetEl.style.outline;
  const originalTransition = targetEl.style.transition;
  targetEl.style.transition = 'all 0.2s ease-in-out';
  targetEl.style.outline = '3px solid #6366F1';
  targetEl.style.outlineOffset = '2px';

  setTimeout(() => {
    targetEl.click();
    setTimeout(() => {
      targetEl.style.outline = originalOutline;
      targetEl.style.transition = originalTransition;
    }, 400);
  }, 300);

  return { success: true, message: `Clicked ${bestMatch.label}.` };
}

// --- Master Command Registry ---
export const COMMAND_REGISTRY: CommandDefinition[] = [
  // 1. Navigation Commands (12 screens)
  {
    id: 'nav_stage',
    category: 'navigation',
    phrases: ['stage', 'home', 'overview', 'dashboard', 'main screen', 'cockpit'],
    helpText: 'Go to main dashboard',
    feedbackText: () => 'Opening Mission Dashboard',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/' });
      return 'Navigating to Dashboard.';
    },
  },
  {
    id: 'nav_monitoring',
    category: 'navigation',
    phrases: ['monitoring', 'telemetry', 'vitals screen', 'live vitals', 'sensor telemetry'],
    helpText: 'Open real-time telemetry monitoring',
    feedbackText: () => 'Opening Telemetry Monitoring',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/monitoring' });
      return 'Opening Telemetry.';
    },
  },
  {
    id: 'nav_body',
    category: 'navigation',
    phrases: ['body', 'anatomy', 'digital twin', '3d explorer', 'anatomical explorer'],
    helpText: 'Open 3D Anatomical Explorer',
    feedbackText: () => 'Opening Body Explorer',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/body' });
      return 'Opening Body Explorer.';
    },
  },
  {
    id: 'nav_checkin',
    category: 'navigation',
    phrases: ['check in', 'checkin', 'daily check in', 'assessment', 'symptom check'],
    helpText: 'Begin Daily Health Assessment Check-in',
    feedbackText: () => 'Opening Daily Check-in',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/check-in' });
      return 'Opening Check-in Protocol.';
    },
  },
  {
    id: 'nav_measure',
    category: 'navigation',
    phrases: ['measure', 'diagnostics lab', 'enter vitals', 'log reading', 'measurements'],
    helpText: 'Open Diagnostics Lab & manual measurement entry',
    feedbackText: () => 'Opening Diagnostics Lab',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/measure' });
      return 'Opening Diagnostics Lab.';
    },
  },
  {
    id: 'nav_eyetest',
    category: 'navigation',
    phrases: ['eye test', 'vision test', 'visual acuity', 'sans check', 'amsler grid'],
    helpText: 'Open Spaceflight SANS Vision Test',
    feedbackText: () => 'Opening Eye Test',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/eye-test' });
      return 'Opening Vision & SANS Test.';
    },
  },
  {
    id: 'nav_exercise',
    category: 'navigation',
    phrases: ['exercise', 'workout', 'countermeasures', 'ared', 'treadmill workout', 'routine'],
    helpText: 'Open Physical Countermeasures & Biomechanics',
    feedbackText: () => 'Opening Exercise Countermeasures',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/exercise' });
      return 'Opening Exercise Countermeasures.';
    },
  },
  {
    id: 'nav_analytics',
    category: 'navigation',
    phrases: ['analytics', 'trends', 'reports', 'charts', 'history analysis'],
    helpText: 'Open Longitudinal Health Trends & Analytics',
    feedbackText: () => 'Opening Analytics & Trends',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/analytics' });
      return 'Opening Analytics.';
    },
  },
  {
    id: 'nav_medical',
    category: 'navigation',
    phrases: ['medical', 'clinical review', 'flight surgeon', 'doctor review', 'consultation'],
    helpText: 'Open Flight Surgeon Medical Review',
    feedbackText: () => 'Opening Flight Surgeon Review',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/medical' });
      return 'Opening Medical Review.';
    },
  },
  {
    id: 'nav_environment',
    category: 'navigation',
    phrases: ['environment', 'habitat', 'co2 levels', 'radiation environment', 'cabin pressure'],
    helpText: 'Open Mission Habitat & Life Support Environment',
    feedbackText: () => 'Opening Habitat Telemetry',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/environment' });
      return 'Opening Habitat Environment.';
    },
  },
  {
    id: 'nav_settings',
    category: 'navigation',
    phrases: ['settings', 'configuration', 'system config', 'preferences'],
    helpText: 'Open System Settings',
    feedbackText: () => 'Opening Settings',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/settings' });
      return 'Opening Settings.';
    },
  },

  // 2. Body Explorer Commands
  {
    id: 'body_region_inspect',
    category: 'body',
    phrases: [
      'show my heart', 'show heart', 'inspect heart', 'cardiac view',
      'show my lungs', 'show lungs', 'inspect lungs', 'respiratory view',
      'show my eyes', 'show eyes', 'inspect eyes', 'ocular view',
      'show my spine', 'show spine', 'inspect back', 'lumbar view',
      'show my skin', 'show skin', 'inspect skin',
      'show my legs', 'show legs', 'inspect bones',
      'show my head', 'show brain', 'inspect head'
    ],
    helpText: 'Inspect anatomical region and zoom 3D model',
    feedbackText: (p) => `Inspecting ${p?.region || 'anatomy'}`,
    extractParams: (_raw, clean) => {
      if (clean.includes('heart') || clean.includes('cardiac')) return { hotspotId: 'cardio', region: 'Heart & Cardiovascular' };
      if (clean.includes('lung') || clean.includes('respirat')) return { hotspotId: 'lungs', region: 'Lungs & Thoracic RIP' };
      if (clean.includes('eye') || clean.includes('ocular')) return { hotspotId: 'ocular', region: 'Optic Nerve & SANS' };
      if (clean.includes('spine') || clean.includes('back') || clean.includes('lumbar')) return { hotspotId: 'spine_skin', region: 'Lumbar Spine' };
      if (clean.includes('skin')) return { hotspotId: 'spine_skin', region: 'Dermal Barrier' };
      if (clean.includes('leg') || clean.includes('bone')) return { hotspotId: 'femoral', region: 'Musculoskeletal Lower Extremities' };
      if (clean.includes('head') || clean.includes('brain')) return { hotspotId: 'head', region: 'Cranial & ICP' };
      return { hotspotId: 'cardio', region: 'Cardiovascular' };
    },
    handler: (params, context) => {
      uiBus.emit('NAVIGATE', { path: '/body' });
      uiBus.emit('SELECT_BODY_HOTSPOT', params);
      const telemetry = context?.telemetryAccessor;
      if (telemetry && params?.hotspotId === 'cardio') {
        const hr = telemetry.getMeasurement?.('heart_rate')?.value || 96;
        return `Focusing on heart. Current heart rate is ${hr} beats per minute.`;
      }
      return `Targeting ${params?.region}. Centering anatomical model.`;
    },
  },
  {
    id: 'body_camera_control',
    category: 'body',
    phrases: [
      'rotate left', 'rotate right', 'turn left', 'turn right',
      'zoom in', 'zoom out', 'reset view', 'center view',
      'skin view', 'x ray view', 'xray view', 'vessels view'
    ],
    helpText: 'Control 3D anatomical camera or layer toggle',
    feedbackText: (p) => `Camera: ${p?.action || 'adjust'}`,
    extractParams: (_raw, clean) => {
      if (clean.includes('rotate left') || clean.includes('turn left')) return { action: 'rotate_left' };
      if (clean.includes('rotate right') || clean.includes('turn right')) return { action: 'rotate_right' };
      if (clean.includes('zoom in')) return { action: 'zoom_in' };
      if (clean.includes('zoom out')) return { action: 'zoom_out' };
      if (clean.includes('reset view') || clean.includes('center view')) return { action: 'reset' };
      if (clean.includes('skin view')) return { layer: 'skin' };
      if (clean.includes('x ray') || clean.includes('xray')) return { layer: 'xray' };
      if (clean.includes('vessel')) return { layer: 'vessels' };
      return { action: 'reset' };
    },
    handler: (params) => {
      if (params.layer) {
        uiBus.emit('BODY_LAYER', { layer: params.layer });
        return `Switching to ${params.layer} layer.`;
      }
      uiBus.emit('BODY_CAMERA', params);
      return `Adjusting camera ${params.action.replace('_', ' ')}.`;
    },
  },

  // 3. Timeline Scrubber Commands
  {
    id: 'timeline_control',
    category: 'timeline',
    phrases: [
      'go back 7 days', 'go back 14 days', 'go to sol', 'what happened on sol',
      'next finding', 'previous finding', 'reset to today', 'play timeline'
    ],
    helpText: 'Scrub historical mission telemetry timeline',
    feedbackText: () => 'Scrubbing timeline',
    extractParams: (_raw, clean) => {
      if (clean.includes('7 days')) return { deltaDays: -7 };
      if (clean.includes('14 days')) return { deltaDays: -14 };
      const solMatch = clean.match(/sol\s*(\d+)/);
      if (solMatch) return { sol: parseInt(solMatch[1], 10) };
      if (clean.includes('next finding')) return { action: 'next_finding' };
      if (clean.includes('previous finding')) return { action: 'prev_finding' };
      if (clean.includes('reset to today')) return { action: 'reset' };
      if (clean.includes('play timeline')) return { action: 'play' };
      return {};
    },
    handler: (params) => {
      uiBus.emit('TIMELINE_SCRUB', params);
      if (params.sol) return `Jumping to Sol ${params.sol}.`;
      if (params.deltaDays) return `Scrubbing back ${Math.abs(params.deltaDays)} days.`;
      if (params.action === 'reset') return 'Resetting timeline to today.';
      return 'Timeline position updated.';
    },
  },

  // 4. Analytics Commands
  {
    id: 'analytics_range',
    category: 'analytics',
    phrases: ['show 7 days', 'show 14 days', 'show 30 days', 'show seven days', 'show fourteen days', 'show thirty days'],
    helpText: 'Select analytics date range (7, 14, or 30 days)',
    feedbackText: (p) => `Range: ${p?.days || 14} days`,
    extractParams: (_raw, clean) => {
      if (clean.includes('7') || clean.includes('seven')) return { days: 7 };
      if (clean.includes('14') || clean.includes('fourteen')) return { days: 14 };
      if (clean.includes('30') || clean.includes('thirty')) return { days: 30 };
      return { days: 14 };
    },
    handler: (params) => {
      uiBus.emit('NAVIGATE', { path: '/analytics' });
      uiBus.emit('ANALYTICS_RANGE', params);
      return `Displaying ${params.days}-day trends.`;
    },
  },
  {
    id: 'analytics_compare',
    category: 'analytics',
    phrases: ['compare sleep and heart rate', 'compare sleep and vitals', 'cross correlation'],
    helpText: 'Cross-analyze sleep metrics with heart rate telemetry',
    feedbackText: () => 'Comparing Sleep & Heart Rate',
    handler: () => {
      uiBus.emit('NAVIGATE', { path: '/analytics' });
      uiBus.emit('ANALYTICS_COMPARE', { metricA: 'sleep', metricB: 'heart_rate' });
      return 'Correlating sleep duration against nocturnal heart rate.';
    },
  },

  // 5. Drawers Commands
  {
    id: 'drawer_controls',
    category: 'drawers',
    phrases: [
      'open tasks', 'open environment', 'open settings', 'open simulator',
      'close drawer', 'close', 'dismiss'
    ],
    helpText: 'Open or close side drawers (tasks, environment, simulator, settings)',
    feedbackText: (p) => `${p?.action === 'close' ? 'Closing' : 'Opening'} ${p?.drawer || 'panel'}`,
    extractParams: (_raw, clean) => {
      if (clean.includes('close') || clean.includes('dismiss')) return { action: 'close' };
      if (clean.includes('task')) return { drawer: 'tasks', action: 'open' };
      if (clean.includes('environment') || clean.includes('habitat')) return { drawer: 'environment', action: 'open' };
      if (clean.includes('simulator')) return { drawer: 'simulator', action: 'open' };
      if (clean.includes('settings')) return { drawer: 'settings', action: 'open' };
      return { action: 'close' };
    },
    handler: (params) => {
      uiBus.emit('DRAWER_ACTION', params);
      return params.action === 'close' ? 'Closing drawer.' : `Opening ${params.drawer} drawer.`;
    },
  },

  // 6. Measurement Dictation & Form Fill
  {
    id: 'dictate_blood_pressure',
    category: 'measure',
    phrases: ['my blood pressure is', 'blood pressure is', 'log blood pressure'],
    needsConfirmation: true,
    helpText: 'Dictate blood pressure (e.g. "my blood pressure is 120 over 80")',
    feedbackText: (p) => `Recorded BP ${p?.sys}/${p?.dia}`,
    extractParams: (_raw, clean) => {
      const match = clean.match(/(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/);
      if (match) {
        return { sys: parseInt(match[1], 10), dia: parseInt(match[2], 10) };
      }
      return null;
    },
    handler: (params) => {
      if (!params || !params.sys || !params.dia) {
        return 'Please state your systolic and diastolic numbers, for example: 120 over 80.';
      }
      uiBus.emit('NAVIGATE', { path: '/measure' });
      uiBus.emit('MEASURE_INPUT', {
        metric: 'blood_pressure',
        value: { systolic: params.sys, diastolic: params.dia },
        needsSaveConfirm: true,
      });
      return `Recorded blood pressure ${params.sys} over ${params.dia} mmHg. Save reading?`;
    },
  },
  {
    id: 'dictate_vitals_single',
    category: 'measure',
    phrases: [
      'my temperature is', 'my core temp is', 'core temp is',
      'my glucose is', 'my blood sugar is', 'glucose is'
    ],
    needsConfirmation: true,
    helpText: 'Dictate vital reading (temperature or glucose)',
    feedbackText: (p) => `Recorded ${p?.metric}: ${p?.val}`,
    extractParams: (_raw, clean) => {
      if (clean.includes('temp')) {
        const m = clean.match(/(\d{2}(?:\.\d)?)/);
        if (m) return { metric: 'core_temp', val: parseFloat(m[1]), unit: '°C' };
      }
      if (clean.includes('glucose') || clean.includes('sugar')) {
        const m = clean.match(/(\d{2,3})/);
        if (m) return { metric: 'glucose', val: parseInt(m[1], 10), unit: 'mg/dL' };
      }
      return null;
    },
    handler: (params) => {
      if (!params) return 'Could not parse reading value.';
      uiBus.emit('NAVIGATE', { path: '/measure' });
      uiBus.emit('MEASURE_INPUT', {
        metric: params.metric,
        value: params.val,
        needsSaveConfirm: true,
      });
      return `Recorded ${params.metric.replace('_', ' ')} ${params.val} ${params.unit}. Save reading?`;
    },
  },

  // 7. Check-in Verbal Responses
  {
    id: 'checkin_flow',
    category: 'checkin',
    phrases: [
      'next question', 'previous question', 'submit assessment', 'submit telemetry',
      'mild pain', 'moderate pain', 'severe pain', 'no pain', 'lower back pain'
    ],
    helpText: 'Navigate or answer daily check-in questions verbally',
    feedbackText: () => 'Check-in response registered',
    extractParams: (_raw, clean) => {
      if (clean.includes('submit')) return { action: 'submit' };
      if (clean.includes('next')) return { action: 'next' };
      if (clean.includes('prev')) return { action: 'prev' };
      return { action: 'answer', answerValue: clean };
    },
    handler: (params) => {
      uiBus.emit('CHECKIN_ACTION', params);
      if (params.action === 'submit') {
        return 'Submitting check-in telemetry now.';
      }
      if (params.action === 'next') return 'Advancing to next check-in step.';
      if (params.action === 'prev') return 'Returning to previous check-in step.';
      return `Recorded response: ${params.answerValue}.`;
    },
  },

  // 8. Generic Click Fallback ("click <label>")
  {
    id: 'generic_click',
    category: 'system',
    phrases: ['click', 'press', 'tap', 'select button'],
    helpText: 'Click any visible button or link (e.g. "click Submit")',
    feedbackText: (p) => `Clicking "${p?.label || ''}"`,
    extractParams: (_raw, clean) => {
      const match = clean.match(/(?:click|press|tap)\s+(?:on\s+)?(.+)/i);
      if (match) return { label: match[1].trim() };
      return null;
    },
    handler: (params) => {
      if (!params?.label) return 'Please specify which element to click.';
      const res = executeClickElement(params.label);
      return res.message;
    },
  },

  // 9. Scroll & Screen Movement
  {
    id: 'scroll_control',
    category: 'system',
    phrases: ['scroll up', 'scroll down', 'scroll to top', 'scroll to bottom', 'scroll down page'],
    helpText: 'Scroll the active window',
    feedbackText: (p) => `Scrolling ${p?.direction || 'down'}`,
    extractParams: (_raw, clean) => {
      if (clean.includes('up')) return { direction: 'up' };
      if (clean.includes('top')) return { direction: 'top' };
      if (clean.includes('bottom')) return { direction: 'bottom' };
      return { direction: 'down' };
    },
    handler: (params) => {
      const scrollAmount = window.innerHeight * 0.6;
      if (params.direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (params.direction === 'bottom') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      } else if (params.direction === 'up') {
        window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      }
      return `Scrolled ${params.direction}.`;
    },
  },

  // 10. Help & Assistant Control
  {
    id: 'voice_help',
    category: 'system',
    phrases: ['what can i say', 'voice help', 'show commands', 'help'],
    helpText: 'Display list of available voice commands for current screen',
    feedbackText: () => 'Displaying Voice Commands',
    handler: () => {
      uiBus.emit('SHOW_HELP', { open: true });
      return 'Here are the commands you can speak right now.';
    },
  },
];

// --- Match Engine ---
export interface MatchResult {
  command: CommandDefinition;
  score: number;
  params?: any;
}

export function matchVoiceCommand(
  rawUtterance: string,
  _currentPath: string = '/'
): MatchResult | null {
  const clean = normalizeVoiceInput(rawUtterance);
  if (!clean) return null;

  let bestMatch: MatchResult | null = null;

  for (const cmd of COMMAND_REGISTRY) {
    for (const phrase of cmd.phrases) {
      const cleanPhrase = normalizeVoiceInput(phrase);

      // 1. Exact phrase match
      if (clean === cleanPhrase) {
        const params = cmd.extractParams ? cmd.extractParams(rawUtterance, clean) : undefined;
        return { command: cmd, score: 1.0, params };
      }

      // 2. Starts with / includes phrase
      if (clean.startsWith(cleanPhrase + ' ') || clean.includes(cleanPhrase)) {
        const params = cmd.extractParams ? cmd.extractParams(rawUtterance, clean) : undefined;
        const score = cleanPhrase.length / clean.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { command: cmd, score: Math.max(score, 0.85), params };
        }
      }

      // 3. Fuzzy similarity
      const sim = stringSimilarity(clean, cleanPhrase);
      if (sim >= 0.80 && (!bestMatch || sim > bestMatch.score)) {
        const params = cmd.extractParams ? cmd.extractParams(rawUtterance, clean) : undefined;
        bestMatch = { command: cmd, score: sim, params };
      }
    }
  }

  // If input starts with "click" or "press" and no command matched, fall back to generic click
  if (!bestMatch && (clean.startsWith('click ') || clean.startsWith('press ') || clean.startsWith('tap '))) {
    const genericCmd = COMMAND_REGISTRY.find((c) => c.id === 'generic_click');
    if (genericCmd) {
      const params = genericCmd.extractParams?.(rawUtterance, clean);
      return { command: genericCmd, score: 0.9, params };
    }
  }

  return bestMatch;
}
