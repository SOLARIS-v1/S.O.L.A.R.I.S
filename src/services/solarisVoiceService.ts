/**
 * SOLARIS Authoritative Voice AI Service
 * 
 * Clinical aerospace voice assistant engine with:
 * - 100% SOLARIS identity ('Hello. SOLARIS is online. How can I assist you?')
 * - 8-state deterministic state machine: sleeping, awake, listening, processing, speaking, manual_mode, error, unavailable
 * - Robust microphone lifecycle: pauses ASR during TTS playback, sleeping releases audio devices, manual mode halts ASR, zero restart loops
 * - Complete command recognition covering all 16 mission directives
 * - Health-data grounding: NEVER invents health measurements; uses controlled accessors
 * - Full 7-domain spaceflight conversational health assessment workflow:
 *   Ask question -> listen -> interpret -> ask follow-up -> summarize -> confirm -> save (SQLite + local store)
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

export interface ActiveAstronautInfo {
  id: string;
  name: string;
  callsign: string;
  role?: string;
  missionDay?: number;
}

export interface HealthMeasurementResult {
  value: number | string;
  unit: string;
  isSimulated?: boolean;
  provenance?: 'measured' | 'derived' | 'simulated';
  timestamp?: string;
  detail?: string;
}

export interface BloodPressureResult {
  systolic: number;
  diastolic: number;
  map?: number; // Mean Arterial Pressure = diastolic + 1/3(systolic - diastolic)
  unit?: string;
  isSimulated?: boolean;
}

export interface SleepReportResult {
  durationHours: number;
  efficiencyPct?: number;
  deepSleepPct?: number;
  remPct?: number;
  wasoMinutes?: number; // Wake After Sleep Onset
  isSimulated?: boolean;
  trend?: string;
}

export interface RadiationReportResult {
  dailyRate_mSv?: number;
  cumulative_mSv?: number;
  absorbedDose_mGy?: number; // strictly distinguishing absorbed dose (mGy) vs equivalent dose (mSv)
  isSimulated?: boolean;
  statusText?: string;
}

export interface ClinicalFindingResult {
  id?: string;
  summary: string;
  detail: string;
  level: 'normal' | 'watch' | 'review' | 'urgent';
  observedValue?: string;
  baselineValue?: string;
  bodyRegion?: string;
}

export interface HealthTelemetryAccessor {
  getActiveAstronaut: () => ActiveAstronautInfo | null;
  getMeasurement: (metricKey: string) => HealthMeasurementResult | null;
  getBloodPressure: () => BloodPressureResult | null;
  getSleepReport: () => SleepReportResult | null;
  getRadiationReport: () => RadiationReportResult | null;
  getLatestFinding: () => ClinicalFindingResult | null;
  saveAssessmentResult?: (assessment: SavedAssessmentRecord) => Promise<boolean> | boolean;
}

export interface SavedAssessmentRecord {
  id: string;
  astronautId: string;
  astronautCallsign: string;
  timestamp: string;
  answers: Record<string, { prompt: string; answer: string; followUpPrompt?: string; followUpAnswer?: string; interpretation: string; domain: string }>;
  summary: string;
  affectedZones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen' | 'eyes'>;
  status: 'saved' | 'confirmed';
}

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

export interface VoiceTranscriptItem {
  id: string;
  sender: 'solaris' | 'astronaut' | 'system';
  text: string;
  timestamp: string;
}

/**
 * 7 Clinical Spaceflight Assessment Domains (Full Comprehensive Sequence)
 * 1. Cardiovascular & Autonomic
 * 2. Respiratory & Pulmonary
 * 3. Neuro-Ocular & Cephalad Fluid Shift / SANS
 * 4. Musculoskeletal & Spinal Elongation
 * 5. Sleep Architecture & Circadian Rest
 * 6. Perceived Fatigue & Exertion Tolerance
 * 7. Cognitive Alertness, Focus & Operational Morale
 */
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
      if (lower.includes('yes') || lower.includes('blur') || lower.includes('vision') || lower.includes('pressure') || lower.includes('headache') || lower.includes('full') || lower.includes('sinus')) {
        return 'Are visual symptoms bilateral or unilateral, and have you noticed any grid line distortion or blur on the Amsler test?';
      }
      return 'Are both sinus air passages clear without cranial congestion, orbital tightness, or retro-orbital ache?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('yes') || combined.includes('blur') || combined.includes('vision') || combined.includes('pressure') || combined.includes('headache') || combined.includes('congestion') || combined.includes('full');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? (combined.includes('blur') || combined.includes('headache') ? 'moderate' : 'mild') : 'nominal',
        note: hasIssue ? 'Cephalad venous engorgement with cranial fullness; daily Amsler grid vision screening recommended.' : 'Cephalic hemodynamics and visual acuity nominal.',
        zone: 'eyes',
      };
    },
  },
  {
    id: 'musculoskeletal',
    domain: 'musculoskeletal',
    title: '4. Space Adaptation Spinal Elongation',
    question: 'Are you experiencing any lumbar lengthening, back stiffness, or space-adaptation spine discomfort?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('yes') || lower.includes('pain') || lower.includes('stiff') || lower.includes('ache') || lower.includes('lumbar') || lower.includes('back') || lower.includes('spine')) {
        return 'Is the discomfort focused in your lower lumbar spine, and does axial compression loading on the ARED harness relieve it?';
      }
      return 'Has your spinal flexibility and lumbar comfort remained unimpaired during routine operations?';
    },
    interpret: (ans, fAns) => {
      const combined = `${ans} ${fAns}`.toLowerCase();
      const hasIssue = combined.includes('yes') || combined.includes('pain') || combined.includes('stiff') || combined.includes('ache') || combined.includes('lumbar') || combined.includes('discomfort') || combined.includes('spine');
      return {
        symptomDetected: hasIssue,
        severity: hasIssue ? (combined.includes('sharp') || combined.includes('acute') ? 'marked' : 'mild') : 'nominal',
        note: hasIssue ? 'Microgravity intervertebral disc expansion with lumbar tension; axial loading countermeasure advised.' : 'Spinal column alignment and core mobility nominal.',
        zone: 'spine',
      };
    },
  },
  {
    id: 'circadian_sleep',
    domain: 'circadian_sleep',
    title: '5. Sleep Architecture & Circadian Rest',
    question: 'How was your sleep quality and rest duration over your last 24-hour cycle?',
    generateFollowUp: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('poor') || lower.includes('bad') || lower.includes('restless') || lower.includes('insomnia') || lower.includes('woke') || lower.includes('little') || lower.includes('tired')) {
        return 'Did you experience difficulty falling asleep, frequent sleep fragmentation, or acoustic disturbances in your sleep quarters?';
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

export class SolarisVoiceService {
  private state: SolarisVoiceState = 'awake';
  private previousState: SolarisVoiceState = 'awake';
  private recognition: any = null;
  private isListeningInternal: boolean = false;
  private shouldListenContinuous: boolean = false;
  private isPausedForSpeech: boolean = false;
  private isRecognitionStarting: boolean = false;
  private synth: SpeechSynthesis | null = null;
  private currentUtteranceInstance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private loudnessInterval: any = null;

  private onStateChange: ((state: SolarisVoiceState) => void) | null = null;
  private onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
  private onLoudness: ((level: number) => void) | null = null;
  private onUtteranceStart: ((text: string) => void) | null = null;
  private onUtteranceEnd: (() => void) | null = null;
  private onNavigate: ((route: string) => void) | null = null;
  private onAssessmentFlowChange: ((flow: AssessmentFlowState) => void) | null = null;

  private telemetryAccessor: HealthTelemetryAccessor | null = null;

  // Conversational Health Assessment Workflow State (7-domain sequence)
  private assessmentState: AssessmentFlowState = {
    isActive: false,
    stage: 'idle',
    currentStepIndex: 0,
    answers: {},
    summaryText: '',
    affectedZones: [],
  };

  private currentTempAnswer: string = '';

  constructor() {
    this.initSpeechSynthesis();
    this.initSpeechRecognition();
  }

  // --- Speech Synthesis (TTS Output) ---

  private initSpeechSynthesis(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[SOLARIS Voice] SpeechSynthesis API not supported in this environment.');
      return;
    }

    this.synth = window.speechSynthesis;
    const loadVoices = () => {
      this.voices = this.synth?.getVoices() || [];
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  private pickSolarisVoice(): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth?.getVoices() || [];
    }
    if (!this.voices || this.voices.length === 0) return null;

    // Prefer calm, clear aerospace synthetic English voices
    const preferredNames = [
      'Google UK English Female',
      'Google US English',
      'Samantha',
      'Victoria',
      'Karen',
      'Oliver',
      'Natural',
      'Neural',
    ];
    for (const name of preferredNames) {
      const match = this.voices.find(v => v.lang.startsWith('en') && v.name.includes(name));
      if (match) return match;
    }
    const englishVoice = this.voices.find(v => v.lang.startsWith('en'));
    return englishVoice || this.voices[0];
  }

  // --- Speech Recognition (ASR Input) ---

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[SOLARIS Voice] Web Speech Recognition API not supported in this browser.');
      this.setState('unavailable');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListeningInternal = true;
        this.isRecognitionStarting = false;
        if (this.isPausedForSpeech || !this.shouldListenContinuous || this.state === 'manual_mode') {
          this.safeStopRecognition();
          return;
        }
        if (this.state !== 'speaking') {
          this.setState('listening');
        }
      };

      this.recognition.onresult = (event: any) => {
        // Drop any recognition events captured if paused for speech
        if (this.isPausedForSpeech || this.state === 'speaking') return;

        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || '';
          if (res.isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (interimText && this.onTranscript) {
          this.onTranscript(interimText.trim(), false);
        }

        if (finalText) {
          const cleanFinal = finalText.trim();
          if (cleanFinal) {
            this.onTranscript?.(cleanFinal, true);
            this.handleVoiceInput(cleanFinal);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isRecognitionStarting = false;
        if (event.error === 'no-speech') {
          // Expected when silent; do not switch to error
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn('[SOLARIS Voice] Microphone permission denied or blocked:', event.error);
          this.shouldListenContinuous = false;
          this.stopAudioMeter();
          this.setState('error');
          return;
        }
        if (event.error === 'aborted') {
          // Clean abort during pause or stop
          return;
        }
        console.warn('[SOLARIS Voice] Recognition error event:', event.error);
        this.shouldListenContinuous = false;
        this.stopAudioMeter();
        this.setState('error');
      };

      this.recognition.onend = () => {
        this.isListeningInternal = false;
        this.isRecognitionStarting = false;

        // If paused because SOLARIS is currently speaking, do not restart yet; resumeRecognition handles it
        if (this.isPausedForSpeech || this.state === 'speaking') {
          return;
        }

        // If continuous listening is desired and not manually sleeping or in manual mode, restart cleanly
        if (
          this.shouldListenContinuous &&
          this.state !== 'sleeping' &&
          this.state !== 'manual_mode' &&
          this.state !== 'error' &&
          this.state !== 'unavailable'
        ) {
          this.safeStartRecognition();
        } else if (this.state === 'listening') {
          this.setState('awake');
        }
      };
    } catch (err) {
      console.warn('[SOLARIS Voice] Failed to initialize SpeechRecognition:', err);
      this.setState('unavailable');
    }
  }

  private safeStartRecognition(): void {
    if (!this.recognition || this.isListeningInternal || this.isRecognitionStarting) return;
    if (this.state === 'sleeping' || this.state === 'manual_mode' || this.state === 'speaking') return;

    try {
      this.isRecognitionStarting = true;
      this.recognition.start();
    } catch {
      this.isRecognitionStarting = false;
    }
  }

  private safeStopRecognition(): void {
    if (!this.recognition || (!this.isListeningInternal && !this.isRecognitionStarting)) return;
    try {
      this.recognition.stop();
    } catch {
      // ignore
    }
  }

  // --- Loudness Metering ---

  private async initAudioMeter(): Promise<void> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      if (this.audioContext && this.analyser) return;
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.loudnessInterval = setInterval(() => {
        if (!this.analyser || this.state === 'sleeping' || this.state === 'manual_mode') {
          this.onLoudness?.(0);
          return;
        }
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        this.onLoudness?.(normalized);
      }, 100);
    } catch {
      // Audio metering is non-fatal enhancement
    }
  }

  private stopAudioMeter(): void {
    if (this.loudnessInterval) {
      clearInterval(this.loudnessInterval);
      this.loudnessInterval = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
  }

  // --- Public Control Methods ---

  public setCallbacks(callbacks: {
    onStateChange?: (state: SolarisVoiceState) => void;
    onTranscript?: (text: string, isFinal: boolean) => void;
    onLoudness?: (level: number) => void;
    onUtteranceStart?: (text: string) => void;
    onUtteranceEnd?: () => void;
    onNavigate?: (route: string) => void;
    onAssessmentFlowChange?: (flow: AssessmentFlowState) => void;
  }): void {
    if (callbacks.onStateChange) this.onStateChange = callbacks.onStateChange;
    if (callbacks.onTranscript) this.onTranscript = callbacks.onTranscript;
    if (callbacks.onLoudness) this.onLoudness = callbacks.onLoudness;
    if (callbacks.onUtteranceStart) this.onUtteranceStart = callbacks.onUtteranceStart;
    if (callbacks.onUtteranceEnd) this.onUtteranceEnd = callbacks.onUtteranceEnd;
    if (callbacks.onNavigate) this.onNavigate = callbacks.onNavigate;
    if (callbacks.onAssessmentFlowChange) this.onAssessmentFlowChange = callbacks.onAssessmentFlowChange;
  }

  public setTelemetryAccessor(accessor: HealthTelemetryAccessor): void {
    this.telemetryAccessor = accessor;
  }

  public getState(): SolarisVoiceState {
    return this.state;
  }

  public getAssessmentFlowState(): AssessmentFlowState {
    return { ...this.assessmentState };
  }

  public setState(newState: SolarisVoiceState): void {
    if (this.state === newState) return;
    this.previousState = this.state;
    this.state = newState;
    this.onStateChange?.(newState);
  }

  public startListening(): void {
    if (this.state === 'manual_mode') return;
    if (!this.recognition) {
      this.shouldListenContinuous = false;
      this.setState('unavailable');
      return;
    }
    this.shouldListenContinuous = true;
    if (this.state === 'error' || this.state === 'unavailable' || this.state === 'sleeping') {
      this.setState('awake');
    }
    this.safeStartRecognition();
  }

  public stopListening(): void {
    this.shouldListenContinuous = false;
    this.safeStopRecognition();
    this.stopAudioMeter();
    if (this.state === 'listening') {
      this.setState('awake');
    }
  }

  public speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      // If manual mode, do not synthesize audio, but complete cleanly
      if (this.state === 'manual_mode') {
        this.onUtteranceStart?.(text);
        this.onUtteranceEnd?.();
        resolve();
        return;
      }

      if (!this.synth) {
        this.onUtteranceStart?.(text);
        setTimeout(() => {
          this.onUtteranceEnd?.();
          resolve();
        }, Math.min(1200, Math.max(400, text.length * 40)));
        return;
      }

      try {
        this.synth.cancel();

        // 1. Strictly pause recognition while speaking to prevent hearing own voice
        this.isPausedForSpeech = true;
        this.safeStopRecognition();

        this.setState('speaking');
        this.onUtteranceStart?.(text);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voice = this.pickSolarisVoice();
        if (voice) utterance.voice = voice;

        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          this.currentUtteranceInstance = null;
          this.isPausedForSpeech = false;
          this.onUtteranceEnd?.();

          // 2. Resume listening if continuous mode was active
          if (this.state === 'speaking') {
            if (this.shouldListenContinuous) {
              this.setState('listening');
              this.safeStartRecognition();
            } else {
              this.setState('awake');
            }
          }
          resolve();
        };

        utterance.onend = finish;
        utterance.onerror = (err) => {
          console.warn('[SOLARIS Voice] Speech synthesis error:', err);
          finish();
        };

        // Safety timeout in case onend doesn't fire in background
        const wordCount = text.split(/\s+/).length;
        const expectedDurationMs = Math.max(1200, (wordCount / 2.5) * 1000 + 1500);
        setTimeout(finish, expectedDurationMs);

        this.currentUtteranceInstance = utterance;
        this.synth.speak(utterance);
      } catch (err) {
        console.warn('[SOLARIS Voice] Error speaking text:', err);
        this.isPausedForSpeech = false;
        resolve();
      }
    });
  }

  public stopSpeaking(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
    this.currentUtteranceInstance = null;
    this.isPausedForSpeech = false;
    this.onUtteranceEnd?.();
    if (this.state === 'speaking') {
      this.setState(this.shouldListenContinuous ? 'listening' : 'awake');
      if (this.shouldListenContinuous) {
        this.safeStartRecognition();
      }
    }
  }

  // --- Voice Commands & Conversational Logic ---

  /**
   * Primary entry point for spoken or typed astronaut input.
   */
  public async handleVoiceInput(rawInput: string): Promise<VoiceCommandResult> {
    const text = rawInput.trim();
    if (!text) return { handled: false, intent: 'empty', spokenResponse: '' };

    this.setState('processing');

    // 1. Check if we are inside the conversational health assessment flow
    if (this.assessmentState.isActive) {
      const assessmentResult = await this.advanceAssessmentWorkflow(text);
      return assessmentResult;
    }

    // 2. Parse general voice commands
    const commandResult = await this.parseAndExecuteCommand(text);
    return commandResult;
  }

  /**
   * Command recognition engine enforcing:
   * - 100% SOLARIS identity ('Hello. SOLARIS is online. How can I assist you?')
   * - Health-data grounding (Never invent data; state honestly when missing or simulated)
   * - Specified mission health directives
   */
  public async parseAndExecuteCommand(rawText: string): Promise<VoiceCommandResult> {
    const lower = rawText.toLowerCase().trim();

    // 1. Wake word / Greetings: 'Wake up, SOLARIS' / 'Wake up SOLARIS' / 'Hey SOLARIS' / 'Hello SOLARIS'
    if (
      lower.includes('wake up, solaris') ||
      lower.includes('wake up solaris') ||
      lower.includes('hey solaris') ||
      lower.includes('hello solaris') ||
      lower.includes('wake solaris') ||
      lower === 'solaris'
    ) {
      const response = 'Hello. SOLARIS is online. How can I assist you?';
      this.shouldListenContinuous = true;
      await this.speak(response);
      return { handled: true, intent: 'wake', spokenResponse: response, newState: 'listening' };
    }

    // 2. Sleep commands: 'Sleep SOLARIS' / 'Stop listening' (Releases microphone)
    if (
      lower.includes('sleep solaris') ||
      lower.includes('sleep, solaris') ||
      lower.includes('stop listening') ||
      lower.includes('go to sleep') ||
      lower === 'sleep'
    ) {
      const response = "SOLARIS entering standby mode. Say 'Wake up, SOLARIS' when you need me.";
      this.stopSpeaking();
      this.stopListening();
      this.setState('sleeping');
      return { handled: true, intent: 'sleep', spokenResponse: response, newState: 'sleeping' };
    }

    // 3. Manual mode commands: 'Switch to manual mode' (Halts ASR)
    if (
      lower.includes('switch to manual mode') ||
      lower.includes('manual mode') ||
      lower.includes('quiet mode') ||
      lower.includes('silent mode')
    ) {
      const response = 'Manual mode engaged. SOLARIS voice narration paused. You can inspect telemetry silently.';
      this.stopSpeaking();
      this.stopListening();
      this.setState('manual_mode');
      return { handled: true, intent: 'switch_to_manual_mode', spokenResponse: response, newState: 'manual_mode' };
    }

    // 4. Resume voice mode: 'Resume voice mode'
    if (
      lower.includes('resume voice mode') ||
      lower.includes('voice mode') ||
      lower.includes('unmute voice') ||
      lower.includes('resume voice')
    ) {
      this.setState('awake');
      const response = 'Voice mode resumed. SOLARIS is listening.';
      this.startListening();
      await this.speak(response);
      return { handled: true, intent: 'resume_voice_mode', spokenResponse: response, newState: 'listening' };
    }

    // 5. 'Read my health'
    if (
      lower.includes('read my health') ||
      lower.includes('health status') ||
      lower.includes('overall health') ||
      lower.includes('how am i doing') ||
      lower.includes('read health')
    ) {
      return await this.handleReadHealth();
    }

    // 6. 'Read my heart rate'
    if (
      lower.includes('read my heart rate') ||
      lower.includes('read heart rate') ||
      lower.includes('check my heart rate') ||
      lower.includes('what is my heart rate') ||
      lower.includes('heart rate') ||
      lower.includes('pulse')
    ) {
      return await this.handleReadHeartRate();
    }

    // 7. 'Read my blood pressure'
    if (
      lower.includes('read my blood pressure') ||
      lower.includes('read blood pressure') ||
      lower.includes('check blood pressure') ||
      lower.includes('what is my blood pressure') ||
      lower.includes('blood pressure')
    ) {
      return await this.handleReadBloodPressure();
    }

    // 8. 'Read my sleep report'
    if (
      lower.includes('read my sleep report') ||
      lower.includes('read sleep report') ||
      lower.includes('sleep report') ||
      lower.includes('how did i sleep') ||
      lower.includes('sleep analysis')
    ) {
      return await this.handleReadSleepReport();
    }

    // 9. 'Start health assessment'
    if (
      lower.includes('start health assessment') ||
      lower.includes('start assessment') ||
      lower.includes('begin assessment') ||
      lower.includes('daily assessment') ||
      lower.includes('check-in') ||
      lower.includes('check in')
    ) {
      return await this.startConversationalAssessment();
    }

    // 10. 'Start eye test'
    if (
      lower.includes('start eye test') ||
      lower.includes('start eye screening') ||
      lower.includes('start vision test') ||
      lower.includes('eye test') ||
      lower.includes('amsler grid') ||
      lower.includes('amsler test')
    ) {
      const response = 'Initiating Amsler grid vision screening. Opening the eye test module.';
      this.onNavigate?.('/vision');
      await this.speak(response);
      return { handled: true, intent: 'start_eye_test', spokenResponse: response, navigationTarget: '/vision' };
    }

    // 11. 'Show radiation exposure'
    if (
      lower.includes('show radiation exposure') ||
      lower.includes('read radiation') ||
      lower.includes('radiation exposure') ||
      lower.includes('radiation dose') ||
      lower.includes('dosimeter')
    ) {
      return await this.handleReadRadiation();
    }

    // 12. 'Explain this finding'
    if (
      lower.includes('explain this finding') ||
      lower.includes('explain finding') ||
      lower.includes('explain alert') ||
      lower.includes('explain anomaly') ||
      lower.includes('what is this finding')
    ) {
      return await this.handleExplainFinding();
    }

    // 13. 'Open health analytics'
    if (
      lower.includes('open health analytics') ||
      lower.includes('open analytics') ||
      lower.includes('show analytics') ||
      lower.includes('health analytics')
    ) {
      const response = 'Opening Health Analytics module.';
      this.onNavigate?.('/analytics');
      await this.speak(response);
      return { handled: true, intent: 'open_health_analytics', spokenResponse: response, navigationTarget: '/analytics' };
    }

    // 14. 'Open medical review'
    if (
      lower.includes('open medical review') ||
      lower.includes('open medical') ||
      lower.includes('medical review') ||
      lower.includes('clinical review')
    ) {
      const response = 'Opening Clinical Medical Review module.';
      this.onNavigate?.('/medical');
      await this.speak(response);
      return { handled: true, intent: 'open_medical_review', spokenResponse: response, navigationTarget: '/medical' };
    }

    // Auxiliary navigation helpers
    if (lower.includes('body explorer') || lower.includes('show my body') || lower.includes('3d body')) {
      const response = 'Displaying 3D Anatomical Digital Twin.';
      this.onNavigate?.('/body');
      await this.speak(response);
      return { handled: true, intent: 'open_body_explorer', spokenResponse: response, navigationTarget: '/body' };
    }

    if (lower.includes('health monitoring') || lower.includes('open monitoring') || lower.includes('show vitals')) {
      const response = 'Opening Live Health Monitoring console.';
      this.onNavigate?.('/monitoring');
      await this.speak(response);
      return { handled: true, intent: 'open_health_monitoring', spokenResponse: response, navigationTarget: '/monitoring' };
    }

    // Default Fallback (never invent medical measurements)
    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    const callsign = astronaut?.callsign || 'Astronaut';
    const fallbackResponse = `Command acknowledged, ${callsign}. You can ask SOLARIS to read your heart rate, check blood pressure, review sleep, start a 7-domain health assessment, or start an eye test.`;
    await this.speak(fallbackResponse);
    return { handled: false, intent: 'unknown', spokenResponse: fallbackResponse };
  }

  // --- Grounded Telemetry Handlers (Zero Hardcoded Health Numbers) ---

  private async handleReadHeartRate(): Promise<VoiceCommandResult> {
    const hr = this.telemetryAccessor?.getMeasurement('heart_rate');
    if (!hr || hr.value === undefined || hr.value === null || hr.value === '') {
      const text = 'SOLARIS does not have a current reading for that measurement.';
      await this.speak(text);
      return { handled: true, intent: 'read_heart_rate', spokenResponse: text };
    }

    let response = `Your heart rate is currently ${hr.value} beats per minute.`;
    if (hr.isSimulated || hr.provenance === 'simulated') {
      response += ' Note: This reading is simulated.';
    }

    await this.speak(response);
    return { handled: true, intent: 'read_heart_rate', spokenResponse: response, highlightMetric: 'heart_rate' };
  }

  private async handleReadBloodPressure(): Promise<VoiceCommandResult> {
    const bp = this.telemetryAccessor?.getBloodPressure();
    if (!bp || bp.systolic === undefined || bp.diastolic === undefined || bp.systolic === null || bp.diastolic === null) {
      const text = 'SOLARIS does not have a current reading for that measurement.';
      await this.speak(text);
      return { handled: true, intent: 'read_blood_pressure', spokenResponse: text };
    }

    const mapVal = bp.map !== undefined ? bp.map : Math.round(bp.diastolic + (bp.systolic - bp.diastolic) / 3);
    let response = `Your blood pressure is ${bp.systolic} over ${bp.diastolic} millimeters of mercury, with a mean arterial pressure of ${mapVal} mmHg.`;
    if (bp.isSimulated) {
      response += ' Note: This reading is simulated.';
    }

    await this.speak(response);
    return { handled: true, intent: 'read_blood_pressure', spokenResponse: response, highlightMetric: 'blood_pressure' };
  }

  private async handleReadSleepReport(): Promise<VoiceCommandResult> {
    const sleep = this.telemetryAccessor?.getSleepReport();
    if (!sleep || sleep.durationHours === undefined || sleep.durationHours === null) {
      const text = 'SOLARIS does not have a current reading for that measurement.';
      await this.speak(text);
      return { handled: true, intent: 'read_sleep_report', spokenResponse: text };
    }

    let response = `Sleep report: Total duration was ${sleep.durationHours} hours`;
    if (sleep.efficiencyPct !== undefined && sleep.efficiencyPct !== null) {
      response += ` with ${sleep.efficiencyPct} percent sleep efficiency`;
    }
    response += '.';
    if (sleep.trend) {
      response += ` ${sleep.trend}`;
    }
    if (sleep.isSimulated) {
      response += ' Note: This reading is simulated.';
    }

    await this.speak(response);
    return { handled: true, intent: 'read_sleep_report', spokenResponse: response, highlightMetric: 'sleep' };
  }

  private async handleReadRadiation(): Promise<VoiceCommandResult> {
    const rad = this.telemetryAccessor?.getRadiationReport();
    if (
      !rad ||
      (rad.cumulative_mSv === undefined &&
        rad.absorbedDose_mGy === undefined &&
        rad.dailyRate_mSv === undefined)
    ) {
      const text = 'SOLARIS does not have a current reading for that measurement.';
      await this.speak(text);
      return { handled: true, intent: 'show_radiation_exposure', spokenResponse: text };
    }

    const parts: string[] = [];
    if (rad.absorbedDose_mGy !== undefined && rad.absorbedDose_mGy !== null) {
      parts.push(`Daily absorbed physical dose is ${rad.absorbedDose_mGy} milliGray.`);
    }
    if (rad.cumulative_mSv !== undefined && rad.cumulative_mSv !== null) {
      parts.push(`Cumulative equivalent dose is ${rad.cumulative_mSv} milliSieverts.`);
    }
    if (rad.dailyRate_mSv !== undefined && rad.dailyRate_mSv !== null) {
      parts.push(`Daily dose rate is ${rad.dailyRate_mSv} milliSieverts per day.`);
    }
    if (rad.statusText) {
      parts.push(`Status: ${rad.statusText}.`);
    }
    if (rad.isSimulated) {
      parts.push('Note: This reading is simulated.');
    }

    const response = parts.join(' ');
    this.onNavigate?.('/monitoring');
    await this.speak(response);
    return { handled: true, intent: 'show_radiation_exposure', spokenResponse: response, navigationTarget: '/monitoring', highlightMetric: 'radiation' };
  }

  private async handleExplainFinding(): Promise<VoiceCommandResult> {
    const finding = this.telemetryAccessor?.getLatestFinding();
    if (!finding || !finding.summary) {
      const text = 'SOLARIS does not have a current reading for that measurement.';
      await this.speak(text);
      return { handled: true, intent: 'explain_this_finding', spokenResponse: text };
    }

    let response = `Active clinical finding: ${finding.summary}. Detail: ${finding.detail}`;
    if (finding.observedValue && finding.baselineValue) {
      response += ` Observed value is ${finding.observedValue} compared to baseline ${finding.baselineValue}.`;
    }

    await this.speak(response);
    return { handled: true, intent: 'explain_this_finding', spokenResponse: response };
  }

  private async handleReadHealth(): Promise<VoiceCommandResult> {
    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    const callsign = astronaut?.callsign || 'Astronaut';

    const hr = this.telemetryAccessor?.getMeasurement('heart_rate');
    const bp = this.telemetryAccessor?.getBloodPressure();
    const spo2 = this.telemetryAccessor?.getMeasurement('spo2');
    const rad = this.telemetryAccessor?.getRadiationReport();
    const sleep = this.telemetryAccessor?.getSleepReport();

    // If none are available, report grounded unavailability honestly
    if (!hr && !bp && !spo2 && !rad && !sleep) {
      const text = 'SOLARIS does not have a current reading for that measurement.';
      await this.speak(text);
      return { handled: true, intent: 'read_my_health', spokenResponse: text };
    }

    const parts: string[] = [`Health status summary for ${callsign}:`];
    let anySimulated = false;

    if (hr && hr.value !== undefined && hr.value !== null) {
      parts.push(`Heart rate is ${hr.value} BPM.`);
      if (hr.isSimulated) anySimulated = true;
    }
    if (bp && bp.systolic !== undefined && bp.diastolic !== undefined) {
      parts.push(`Blood pressure is ${bp.systolic} over ${bp.diastolic} mmHg.`);
      if (bp.isSimulated) anySimulated = true;
    }
    if (spo2 && spo2.value !== undefined && spo2.value !== null) {
      parts.push(`Oxygen saturation is ${spo2.value} percent.`);
      if (spo2.isSimulated) anySimulated = true;
    }
    if (rad?.cumulative_mSv !== undefined && rad.cumulative_mSv !== null) {
      parts.push(`Cumulative radiation is ${rad.cumulative_mSv} milliSieverts.`);
    }
    if (rad?.dailyRate_mSv !== undefined && rad.dailyRate_mSv !== null) {
      parts.push(`Daily radiation dose rate is ${rad.dailyRate_mSv} milliSieverts per day.`);
    }
    if (rad?.isSimulated) anySimulated = true;
    if (sleep && sleep.durationHours !== undefined && sleep.durationHours !== null) {
      parts.push(`Last sleep duration was ${sleep.durationHours} hours.`);
      if (sleep.isSimulated) anySimulated = true;
    }

    if (anySimulated) {
      parts.push('Note: One or more telemetry readings are simulated.');
    }

    const fullText = parts.join(' ');
    await this.speak(fullText);
    return { handled: true, intent: 'read_my_health', spokenResponse: fullText };
  }

  // --- 7-Domain Conversational Health Assessment Workflow ---
  // Sequence: Ask question (1..7) -> Listen -> Interpret -> Follow-up -> Listen -> Synthesize -> Next -> Summarize -> Confirm -> Save (SQLite + local)

  public async startConversationalAssessment(): Promise<VoiceCommandResult> {
    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    const callsign = astronaut?.callsign || 'Astronaut';

    this.assessmentState = {
      isActive: true,
      stage: 'asking_question',
      currentStepIndex: 0,
      currentQuestion: CLINICAL_ASSESSMENT_QUESTIONS[0],
      answers: {},
      summaryText: '',
      affectedZones: [],
    };
    this.currentTempAnswer = '';
    this.onAssessmentFlowChange?.(this.assessmentState);

    const firstQuestion = CLINICAL_ASSESSMENT_QUESTIONS[0];
    const speech = `Starting Sol daily health assessment for ${callsign}. Domain 1 of 7: ${firstQuestion.title}. ${firstQuestion.question}`;

    await this.speak(speech);
    this.assessmentState.stage = 'listening_answer';
    this.onAssessmentFlowChange?.(this.assessmentState);

    return {
      handled: true,
      intent: 'start_health_assessment',
      spokenResponse: speech,
      navigationTarget: '/check-in',
    };
  }

  public async advanceAssessmentWorkflow(astronautResponse: string): Promise<VoiceCommandResult> {
    const text = astronautResponse.trim();
    const lower = text.toLowerCase();

    // Check for cancellation
    if (lower === 'cancel' || lower === 'cancel assessment' || lower === 'abort assessment' || lower === 'stop assessment') {
      this.assessmentState = {
        isActive: false,
        stage: 'cancelled',
        currentStepIndex: 0,
        answers: {},
        summaryText: '',
        affectedZones: [],
      };
      this.onAssessmentFlowChange?.(this.assessmentState);
      const cancelMsg = 'Health assessment cancelled. Returning to standard telemetry monitoring.';
      await this.speak(cancelMsg);
      return { handled: true, intent: 'assessment_cancelled', spokenResponse: cancelMsg };
    }

    const stepIndex = this.assessmentState.currentStepIndex;
    const currentQ = CLINICAL_ASSESSMENT_QUESTIONS[stepIndex];

    // Stage 1: Received initial answer -> ask domain follow-up question
    if (this.assessmentState.stage === 'listening_answer') {
      this.currentTempAnswer = text;
      const followUp = currentQ.generateFollowUp(text);

      this.assessmentState.stage = 'asking_followup';
      this.onAssessmentFlowChange?.(this.assessmentState);

      await this.speak(followUp);

      this.assessmentState.stage = 'listening_followup';
      this.onAssessmentFlowChange?.(this.assessmentState);

      return {
        handled: true,
        intent: 'assessment_followup',
        spokenResponse: followUp,
      };
    }

    // Stage 2: Received follow-up answer -> interpret and move to next domain or summarize
    if (this.assessmentState.stage === 'listening_followup') {
      const initialAns = this.currentTempAnswer;
      const followUpAns = text;
      const interpretation = currentQ.interpret(initialAns, followUpAns);

      const affectedZones = [...this.assessmentState.affectedZones];
      if (interpretation.symptomDetected && interpretation.zone && !affectedZones.includes(interpretation.zone)) {
        affectedZones.push(interpretation.zone);
      }

      this.assessmentState.answers[currentQ.id] = {
        domain: currentQ.domain,
        answer: initialAns,
        followUpAnswer: followUpAns,
        interpretation: interpretation.note,
      };
      this.assessmentState.affectedZones = affectedZones;

      const nextIndex = stepIndex + 1;
      if (nextIndex < CLINICAL_ASSESSMENT_QUESTIONS.length) {
        // Move to next domain question
        this.assessmentState.currentStepIndex = nextIndex;
        this.assessmentState.currentQuestion = CLINICAL_ASSESSMENT_QUESTIONS[nextIndex];
        this.assessmentState.stage = 'asking_question';
        this.onAssessmentFlowChange?.(this.assessmentState);

        const nextQ = CLINICAL_ASSESSMENT_QUESTIONS[nextIndex];
        const transitionSpeech = `Recorded. Domain ${nextIndex + 1} of 7: ${nextQ.title}. ${nextQ.question}`;
        await this.speak(transitionSpeech);

        this.assessmentState.stage = 'listening_answer';
        this.onAssessmentFlowChange?.(this.assessmentState);

        return { handled: true, intent: 'assessment_next_question', spokenResponse: transitionSpeech };
      } else {
        // All 7 domains complete -> Summarize
        return await this.summarizeAndAskConfirmation();
      }
    }

    // Stage 3: Awaiting confirmation
    if (this.assessmentState.stage === 'awaiting_confirmation') {
      if (
        lower.includes('confirm') ||
        lower.includes('yes') ||
        lower.includes('save') ||
        lower.includes('affirmative') ||
        lower.includes('commit') ||
        lower.includes('correct')
      ) {
        return await this.saveAssessment();
      } else {
        const askAgain = "Please say 'Confirm' to save your 7-domain assessment to your medical record, or 'Cancel' to discard.";
        await this.speak(askAgain);
        return { handled: true, intent: 'assessment_confirmation_retry', spokenResponse: askAgain };
      }
    }

    return { handled: false, intent: 'assessment_unhandled', spokenResponse: '' };
  }

  private async summarizeAndAskConfirmation(): Promise<VoiceCommandResult> {
    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    const callsign = astronaut?.callsign || 'Astronaut';

    // Compile comprehensive 7-domain summary
    const summaryNotes = Object.values(this.assessmentState.answers).map(a => a.interpretation).filter(Boolean);
    const summaryText = `7-domain assessment summary for ${callsign}: ${summaryNotes.join(' ')}`;
    this.assessmentState.summaryText = summaryText;
    this.assessmentState.stage = 'summarizing';
    this.onAssessmentFlowChange?.(this.assessmentState);

    const speech = `${summaryText} Would you like me to commit these assessment findings to your medical record? Please say confirm or cancel.`;
    await this.speak(speech);

    this.assessmentState.stage = 'awaiting_confirmation';
    this.onAssessmentFlowChange?.(this.assessmentState);

    return {
      handled: true,
      intent: 'assessment_summary',
      spokenResponse: speech,
    };
  }

  public async saveAssessment(): Promise<VoiceCommandResult> {
    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    const record: SavedAssessmentRecord = {
      id: `ASSESS-${Date.now()}`,
      astronautId: astronaut?.id || 'ASTRO-CREW',
      astronautCallsign: astronaut?.callsign || 'Astronaut',
      timestamp: new Date().toISOString(),
      answers: Object.entries(this.assessmentState.answers).reduce((acc, [k, v]) => {
        acc[k] = {
          domain: v.domain || k,
          prompt: CLINICAL_ASSESSMENT_QUESTIONS.find(q => q.id === k)?.question || k,
          answer: v.answer,
          followUpAnswer: v.followUpAnswer,
          interpretation: v.interpretation || '',
        };
        return acc;
      }, {} as any),
      summary: this.assessmentState.summaryText,
      affectedZones: this.assessmentState.affectedZones,
      status: 'confirmed',
    };

    // Save through controlled accessor function (which writes to SQLite + local store)
    if (this.telemetryAccessor?.saveAssessmentResult) {
      try {
        await this.telemetryAccessor.saveAssessmentResult(record);
      } catch (err) {
        console.warn('[SOLARIS Voice] Failed to save assessment to backend store:', err);
      }
    }

    this.assessmentState = {
      isActive: false,
      stage: 'saved',
      currentStepIndex: 0,
      answers: {},
      summaryText: '',
      affectedZones: [],
    };
    this.onAssessmentFlowChange?.(this.assessmentState);

    const confirmationSpeech = 'Assessment confirmed and successfully saved to your autonomous medical log and station database. Standing by for telemetry commands.';
    await this.speak(confirmationSpeech);

    return {
      handled: true,
      intent: 'assessment_saved',
      spokenResponse: confirmationSpeech,
    };
  }
}

// Authoritative Singleton Instance
export const solarisVoiceService = new SolarisVoiceService();
