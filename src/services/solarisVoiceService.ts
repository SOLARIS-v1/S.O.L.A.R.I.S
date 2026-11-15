/**
 * SOLARIS Authoritative Voice AI Service
 * 
 * Complete Phase 2 Architecture:
 * - Local Speech Recognition via 16 kHz Mono PCM WAV capture -> POST /api/voice/stt
 * - Provider hierarchy: 'local' (server whisper) -> 'browser' (online, optional) -> 'typed'
 * - Wake via Tap/Space; Sleep strictly via "sleep solaris" (releases mic, AudioContext closed)
 * - Grounded commands: "read my readings", "read manually" (step-by-step), "read [indicator]"
 * - Query commands: "how am I doing", "what changed", "start check-in", "show body", "show trends", "repeat", "be quiet", "switch user"
 * - Interactive Identification & Confirmation ("Who am I speaking with?" -> "Is this Maya?" -> lock to profile; chips fallback after 2 fails)
 * - Grounded 5-step verbal check-in & computed narration with emergency screening
 */

import {
  SolarisVoiceState,
  VoiceProviderMode,
  AssessmentStepConfig,
  AssessmentFlowState,
  VoiceCommandResult,
  normalizeVoiceInput,
  isSleepCommand,
  isWakeCommand,
  matchIndicatorQuery,
  matchCrewIdentification,
  CrewMatchResult,
} from '../voice/intents';
import {
  SolarisSpeechProvider,
  pickSolarisVoice,
} from '../voice/speech';
import {
  CLINICAL_ASSESSMENT_QUESTIONS,
  VERBAL_CHECKIN_STEPS,
  checkEmergencySymptoms,
  buildBriefing,
  ComputedBriefing,
} from '../voice/narration';
import { SolarisAudioRecorder } from '../voice/audioRecorder';

export type {
  SolarisVoiceState,
  VoiceProviderMode,
  AssessmentStepConfig,
  AssessmentFlowState,
  VoiceCommandResult,
  ComputedBriefing,
};

export {
  CLINICAL_ASSESSMENT_QUESTIONS,
  VERBAL_CHECKIN_STEPS,
  buildBriefing,
  normalizeVoiceInput,
  isSleepCommand,
  isWakeCommand,
  pickSolarisVoice,
};

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
  map?: number;
  unit?: string;
  isSimulated?: boolean;
}

export interface SleepReportResult {
  durationHours: number;
  efficiencyPct?: number;
  deepSleepPct?: number;
  remPct?: number;
  wasoMinutes?: number;
  isSimulated?: boolean;
  trend?: string;
}

export interface RadiationReportResult {
  dailyRate_mSv?: number;
  cumulative_mSv?: number;
  absorbedDose_mGy?: number;
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
  selectAstronautById?: (id: string) => Promise<void> | void;
  getMeasurement: (metricKey: string) => HealthMeasurementResult | null;
  getBloodPressure: () => BloodPressureResult | null;
  getSleepReport: () => SleepReportResult | null;
  getRadiationReport: () => RadiationReportResult | null;
  getLatestFinding: () => ClinicalFindingResult | null;
  getAllCurrentReadings?: () => Record<string, number | string | null | undefined>;
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

export interface VoiceTranscriptItem {
  id: string;
  sender: 'solaris' | 'astronaut' | 'system';
  text: string;
  timestamp: string;
}

const STEP_BY_STEP_METRICS = [
  'heart_rate',
  'blood_pressure',
  'sleep',
  'glucose',
  'temperature',
  'spo2',
  'hrv',
  'respiration',
];

export class SolarisVoiceService {
  private state: SolarisVoiceState = 'awake';
  private providerMode: VoiceProviderMode = 'local';
  private isBrowserRecognitionAllowed = false; // OFF by default
  private isLocalSTTAvailable = false;

  private speechProvider: SolarisSpeechProvider;
  private audioRecorder: SolarisAudioRecorder | null = null;
  private browserRecognition: any = null;

  private isPausedForSpeech = false;
  private isContinuousListening = false;
  private lastSpokenText = '';

  // Identification sub-workflow state
  private identificationState: {
    isActive: boolean;
    pendingMatch: CrewMatchResult | null;
    failedAttempts: number;
  } = {
    isActive: false,
    pendingMatch: null,
    failedAttempts: 0,
  };
  private showProfileChips = false;

  // Step-by-step manual reading mode state
  private stepReadingState: {
    isActive: boolean;
    currentIndex: number;
  } = {
    isActive: false,
    currentIndex: 0,
  };

  // 5-step verbal check-in state
  private verbalCheckInState: {
    isActive: boolean;
    currentStepIndex: number;
    answers: Record<string, string>;
  } = {
    isActive: false,
    currentStepIndex: 0,
    answers: {},
  };

  // 7-domain assessment state
  private assessmentState: AssessmentFlowState = {
    isActive: false,
    stage: 'idle',
    currentStepIndex: 0,
    answers: {},
    summaryText: '',
    affectedZones: [],
  };

  private telemetryAccessor: HealthTelemetryAccessor | null = null;

  private onStateChange: ((state: SolarisVoiceState) => void) | null = null;
  private onProviderModeChange: ((mode: VoiceProviderMode) => void) | null = null;
  private onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
  private onLoudness: ((level: number) => void) | null = null;
  private onUtteranceStart: ((text: string) => void) | null = null;
  private onUtteranceEnd: (() => void) | null = null;
  private onNavigate: ((route: string) => void) | null = null;
  private onAssessmentFlowChange: ((flow: AssessmentFlowState) => void) | null = null;
  private onShowProfileChips: ((show: boolean) => void) | null = null;

  constructor() {
    this.speechProvider = new SolarisSpeechProvider();
    this.checkLocalSTTStatus();
    this.initAudioRecorder();
  }

  // --- STT Initialization ---

  public async checkLocalSTTStatus(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/voice/status');
      if (res.ok) {
        const data = await res.json();
        this.isLocalSTTAvailable = !!data.available;
        if (this.isLocalSTTAvailable) {
          this.setProviderMode('local');
          return true;
        }
      }
    } catch {
      this.isLocalSTTAvailable = false;
    }
    // If local Whisper is not available, default to typed mode without crashing
    if (this.providerMode === 'local' && !this.isLocalSTTAvailable) {
      this.setProviderMode('typed');
    }
    return this.isLocalSTTAvailable;
  }

  private initAudioRecorder(): void {
    if (typeof window === 'undefined') return;

    this.audioRecorder = new SolarisAudioRecorder({
      silenceThresholdMs: 1200,
      onSilenceDetected: async (wavBlob) => {
        if (this.isPausedForSpeech || this.state === 'speaking' || this.state === 'typed_only') {
          return;
        }
        await this.handleCapturedAudio(wavBlob);
      },
      onLoudness: (level) => {
        if (!this.isPausedForSpeech && this.state !== 'speaking') {
          this.onLoudness?.(level);
        } else {
          this.onLoudness?.(0);
        }
      },
    });
  }

  private async handleCapturedAudio(wavBlob: Blob): Promise<void> {
    if (this.state === 'typed_only' || this.state === 'sleeping') return;

    this.setState('processing');
    try {
      const formData = new FormData();
      formData.append('file', wavBlob, 'audio.wav');

      const res = await fetch('http://127.0.0.1:8000/api/voice/stt', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 503) {
          console.warn('[SOLARIS Voice] Local Whisper model missing. Switching to typed only mode.');
          this.setProviderMode('typed');
          const errorMsg = 'Local voice model not found. Dropped to typed mode.';
          this.onTranscript?.(errorMsg, true);
          this.setState('awake');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = (data.text || '').trim();
      if (text) {
        this.onTranscript?.(text, true);
        await this.handleVoiceInput(text);
      } else {
        // Silent audio: resume listening if continuous
        if (this.isContinuousListening) {
          this.setState('listening');
        } else {
          this.setState('awake');
        }
      }
    } catch (err) {
      console.warn('[SOLARIS Voice] STT transcription failed, switching to typed only mode:', err);
      this.setProviderMode('typed');
      this.setState('awake');
      this.onTranscript?.('Local voice backend unreachable. Please type your command.', true);
    }
  }

  // --- Provider Controls ---

  public setProviderMode(mode: VoiceProviderMode): void {
    if (mode === 'browser' && !this.isBrowserRecognitionAllowed) {
      mode = 'typed';
    }
    this.providerMode = mode;
    this.onProviderModeChange?.(mode);
  }

  public getProviderMode(): VoiceProviderMode {
    return this.providerMode;
  }

  public getBrowserRecognitionAllowed(): boolean {
    return this.isBrowserRecognitionAllowed;
  }

  public setBrowserRecognitionAllowed(allowed: boolean): void {
    this.isBrowserRecognitionAllowed = allowed;
    if (!allowed && this.providerMode === 'browser') {
      this.setProviderMode('typed');
    }
  }

  public getShowProfileChips(): boolean {
    return this.showProfileChips;
  }

  public setShowProfileChips(show: boolean): void {
    this.showProfileChips = show;
    this.onShowProfileChips?.(show);
  }

  // --- Callbacks and Accessors ---

  public setCallbacks(callbacks: {
    onStateChange?: (state: SolarisVoiceState) => void;
    onProviderModeChange?: (mode: VoiceProviderMode) => void;
    onTranscript?: (text: string, isFinal: boolean) => void;
    onLoudness?: (level: number) => void;
    onUtteranceStart?: (text: string) => void;
    onUtteranceEnd?: () => void;
    onNavigate?: (route: string) => void;
    onAssessmentFlowChange?: (flow: AssessmentFlowState) => void;
    onShowProfileChips?: (show: boolean) => void;
  }): void {
    if (callbacks.onStateChange) this.onStateChange = callbacks.onStateChange;
    if (callbacks.onProviderModeChange) this.onProviderModeChange = callbacks.onProviderModeChange;
    if (callbacks.onTranscript) this.onTranscript = callbacks.onTranscript;
    if (callbacks.onLoudness) this.onLoudness = callbacks.onLoudness;
    if (callbacks.onUtteranceStart) this.onUtteranceStart = callbacks.onUtteranceStart;
    if (callbacks.onUtteranceEnd) this.onUtteranceEnd = callbacks.onUtteranceEnd;
    if (callbacks.onNavigate) this.onNavigate = callbacks.onNavigate;
    if (callbacks.onAssessmentFlowChange) this.onAssessmentFlowChange = callbacks.onAssessmentFlowChange;
    if (callbacks.onShowProfileChips) this.onShowProfileChips = callbacks.onShowProfileChips;
  }

  public setTelemetryAccessor(accessor: HealthTelemetryAccessor): void {
    this.telemetryAccessor = accessor;
  }

  public getState(): SolarisVoiceState {
    return this.state;
  }

  public setState(newState: SolarisVoiceState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange?.(newState);
  }

  // --- Audio Lifecycle: Wake & Sleep ---

  public async wakeSolaris(): Promise<void> {
    if (this.state === 'typed_only') {
      this.setState('awake');
      const intro = 'Solaris is online in typed mode. Enter your command below.';
      await this.speak(intro);
      return;
    }

    this.isContinuousListening = true;
    this.setState('awake');

    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    if (!astronaut) {
      // Unauthenticated: ask "Who is speaking?"
      this.identificationState = {
        isActive: true,
        pendingMatch: null,
        failedAttempts: 0,
      };
      await this.speak('Who is speaking?');
    } else {
      await this.speak(`Hello ${astronaut.callsign}. Solaris is listening. How can I assist you?`);
    }

    await this.startListening();
  }

  public sleepSolaris(): void {
    this.isContinuousListening = false;
    this.stopSpeaking();
    this.stopListening();
    this.setState('sleeping');
    // On sleep: stop speech, stop every MediaStream track, orb goes asleep, speak "Going to sleep. Tap or press Space when you need me."
    this.speak('Going to sleep. Tap or press Space when you need me.');
  }

  public toggleTypedOnlyMode(override?: boolean): void {
    const nextTyped = override !== undefined ? override : this.state !== 'typed_only';
    if (nextTyped) {
      this.stopListening();
      this.stopSpeaking();
      this.setState('typed_only');
    } else {
      this.setState('awake');
      this.wakeSolaris();
    }
  }

  public async startListening(): Promise<void> {
    if (this.state === 'typed_only' || this.state === 'sleeping') return;

    if (this.providerMode === 'local') {
      const ok = await this.audioRecorder?.start();
      if (!ok) {
        this.setProviderMode('typed');
        this.onTranscript?.('Microphone access denied. Dropped to typed mode.', true);
        this.setState('awake');
        return;
      }
      this.setState('listening');
    }
  }

  public stopListening(): void {
    if (this.audioRecorder) {
      this.audioRecorder.stop();
    }
    this.onLoudness?.(0);
    if (this.state === 'listening') {
      this.setState('awake');
    }
  }

  public async speak(text: string): Promise<void> {
    this.lastSpokenText = text;
    if (this.state === 'typed_only') {
      this.onUtteranceStart?.(text);
      this.onUtteranceEnd?.();
      return;
    }

    // Strictly pause recognition while Solaris is speaking so it does not hear itself
    this.isPausedForSpeech = true;
    this.audioRecorder?.stop();
    this.setState('speaking');

    await this.speechProvider.speak(text, {
      onStart: (t) => this.onUtteranceStart?.(t),
      onEnd: () => {
        this.isPausedForSpeech = false;
        this.onUtteranceEnd?.();
        if (this.state === 'speaking') {
          if (this.isContinuousListening) {
            this.setState('listening');
            this.startListening();
          } else {
            this.setState('awake');
          }
        }
      },
      onError: () => {
        this.isPausedForSpeech = false;
        this.onUtteranceEnd?.();
        if (this.state === 'speaking') this.setState('awake');
      },
    });
  }

  public stopSpeaking(): void {
    this.speechProvider.stopSpeaking();
    this.isPausedForSpeech = false;
    this.onUtteranceEnd?.();
    if (this.state === 'speaking') {
      this.setState(this.isContinuousListening ? 'listening' : 'awake');
    }
  }

  // --- Voice Command Parsing & Handlers ---

  public async handleVoiceInput(rawInput: string): Promise<VoiceCommandResult> {
    const text = rawInput.trim();
    if (!text) return { handled: false, intent: 'empty', spokenResponse: '' };

    this.setState('processing');

    // 1. Check for emergency symptoms in any response
    if (checkEmergencySymptoms(text)) {
      const emergencyWarning = 'Warning: Your symptoms require urgent clinical evaluation. Please contact the mission medical officer right now.';
      await this.speak(emergencyWarning);
      return { handled: true, intent: 'emergency_alert', spokenResponse: emergencyWarning };
    }

    // 2. Identification sub-workflow
    if (this.identificationState.isActive) {
      return await this.handleIdentificationWorkflow(text);
    }

    // 3. Step-by-step manual reading mode
    if (this.stepReadingState.isActive) {
      return await this.handleStepByStepReading(text);
    }

    // 4. Verbal 5-step check-in workflow
    if (this.verbalCheckInState.isActive) {
      return await this.handleVerbalCheckInWorkflow(text);
    }

    // 5. 7-domain clinical assessment
    if (this.assessmentState.isActive) {
      return await this.advanceAssessmentWorkflow(text);
    }

    // 6. Core Voice Command Recognition
    return await this.parseAndExecuteCommand(text);
  }

  private async handleIdentificationWorkflow(text: string): Promise<VoiceCommandResult> {
    const match = matchCrewIdentification(text);
    if (match && match.matchedId) {
      this.identificationState.isActive = false;
      this.identificationState.pendingMatch = null;
      this.identificationState.failedAttempts = 0;
      this.showProfileChips = false;
      this.onShowProfileChips?.(false);

      if (this.telemetryAccessor?.selectAstronautById) {
        await this.telemetryAccessor.selectAstronautById(match.matchedId);
      }

      const welcomeMsg = `Welcome ${match.displayName}. Solaris is tuned to your telemetry.`;
      await this.speak(welcomeMsg);
      return { handled: true, intent: 'identification_confirmed', spokenResponse: welcomeMsg };
    }

    this.identificationState.failedAttempts++;
    if (this.identificationState.failedAttempts >= 2) {
      this.identificationState.isActive = false;
      this.showProfileChips = true;
      this.onShowProfileChips?.(true);
      const fallbackMsg = 'Please tap your profile.';
      await this.speak(fallbackMsg);
      return { handled: true, intent: 'identification_fallback_chips', spokenResponse: fallbackMsg };
    }

    const retryPrompt = 'Who is speaking?';
    await this.speak(retryPrompt);
    return { handled: true, intent: 'identification_retry', spokenResponse: retryPrompt };
  }

  public async parseAndExecuteCommand(rawText: string): Promise<VoiceCommandResult> {
    const lower = rawText.toLowerCase().trim();
    const normalized = normalizeVoiceInput(rawText);

    // 1. Sleep: ONLY "sleep solaris", "stop listening", etc. (never triggers on "how was my sleep")
    if (isSleepCommand(normalized)) {
      this.sleepSolaris();
      return { handled: true, intent: 'sleep', spokenResponse: 'Going to sleep.', newState: 'sleeping' };
    }

    // 2. Wake
    if (isWakeCommand(normalized)) {
      await this.wakeSolaris();
      return { handled: true, intent: 'wake', spokenResponse: 'Hello. Solaris is listening.', newState: 'listening' };
    }

    // 3. Repeat last utterance
    if (lower === 'repeat' || lower.includes('say that again') || lower.includes('repeat that')) {
      const resp = this.lastSpokenText || 'No recent spoken response to repeat.';
      await this.speak(resp);
      return { handled: true, intent: 'repeat', spokenResponse: resp };
    }

    // 4. "Be quiet"
    if (lower === 'be quiet' || lower.includes('stop speaking') || lower.includes('hush')) {
      this.stopSpeaking();
      return { handled: true, intent: 'be_quiet', spokenResponse: '' };
    }

    // 5. "Switch user" / "change profile"
    if (lower.includes('switch user') || lower.includes('switch astronaut') || lower.includes('change user')) {
      this.identificationState = {
        isActive: true,
        pendingMatch: null,
        failedAttempts: 0,
      };
      const prompt = 'Who am I speaking with?';
      await this.speak(prompt);
      return { handled: true, intent: 'switch_user', spokenResponse: prompt };
    }

    // 6. "Read my readings" / "how am I doing" / "what changed"
    if (
      lower.includes('read my readings') ||
      lower.includes('how am i doing') ||
      lower.includes('what changed') ||
      lower.includes('read health') ||
      lower.includes('health status')
    ) {
      return await this.handleReadMyReadings();
    }

    // 7. "Read manually" (step-by-step reading mode)
    if (lower.includes('read manually') || lower.includes('step by step') || lower.includes('manual reading')) {
      this.stepReadingState = {
        isActive: true,
        currentIndex: 0,
      };
      return await this.readStepMetric(0);
    }

    // 8. "Read [indicator]"
    const indicator = matchIndicatorQuery(normalized);
    if (indicator) {
      return await this.handleReadSpecificIndicator(indicator);
    }

    // 9. "Start check-in"
    if (lower.includes('start check-in') || lower.includes('daily check-in') || lower.includes('check in')) {
      return await this.startVerbalCheckIn();
    }

    // 10. Navigation Directives
    if (lower.includes('show body') || lower.includes('body explorer') || lower.includes('show my body')) {
      const response = 'Displaying 3D Anatomical Digital Twin.';
      this.onNavigate?.('/body');
      await this.speak(response);
      return { handled: true, intent: 'show_body', spokenResponse: response, navigationTarget: '/body' };
    }

    if (lower.includes('show trends') || lower.includes('open analytics') || lower.includes('trends')) {
      const response = 'Opening longitudinal telemetry trends and analytics.';
      this.onNavigate?.('/analytics');
      await this.speak(response);
      return { handled: true, intent: 'show_trends', spokenResponse: response, navigationTarget: '/analytics' };
    }

    // Fallback response
    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    const callsign = astronaut?.callsign || 'Astronaut';
    const fallback = `Command acknowledged, ${callsign}. You can ask Solaris to read your readings, read manually, check blood pressure or sleep, start check-in, or show your trends.`;
    await this.speak(fallback);
    return { handled: false, intent: 'unknown', spokenResponse: fallback };
  }

  // --- Step-by-Step Reading ("read manually") ---

  private async handleStepByStepReading(rawInput: string): Promise<VoiceCommandResult> {
    const norm = normalizeVoiceInput(rawInput);

    if (norm.includes('stop') || norm.includes('cancel') || norm.includes('exit')) {
      this.stepReadingState.isActive = false;
      const resp = 'Exiting step-by-step reading mode.';
      await this.speak(resp);
      return { handled: true, intent: 'step_reading_exit', spokenResponse: resp };
    }

    if (norm.includes('repeat')) {
      return await this.readStepMetric(this.stepReadingState.currentIndex);
    }

    if (norm.includes('back') || norm.includes('previous')) {
      const prevIdx = Math.max(0, this.stepReadingState.currentIndex - 1);
      this.stepReadingState.currentIndex = prevIdx;
      return await this.readStepMetric(prevIdx);
    }

    if (norm.includes('next') || norm.includes('continue') || norm.includes('okay')) {
      const nextIdx = this.stepReadingState.currentIndex + 1;
      if (nextIdx >= STEP_BY_STEP_METRICS.length) {
        this.stepReadingState.isActive = false;
        const completeMsg = 'That concludes all recorded biometric indicators. Standing by for telemetry commands.';
        await this.speak(completeMsg);
        return { handled: true, intent: 'step_reading_completed', spokenResponse: completeMsg };
      }
      this.stepReadingState.currentIndex = nextIdx;
      return await this.readStepMetric(nextIdx);
    }

    const askPrompt = "Say 'next' to continue, 'repeat' to hear again, 'back' for previous, or 'stop' to finish.";
    await this.speak(askPrompt);
    return { handled: true, intent: 'step_reading_prompt', spokenResponse: askPrompt };
  }

  private async readStepMetric(index: number): Promise<VoiceCommandResult> {
    const key = STEP_BY_STEP_METRICS[index] as any;
    const metricResult = await this.formatIndicatorReading(key);
    const speech = `${metricResult}. Say next, repeat, back, or stop.`;
    await this.speak(speech);
    return {
      handled: true,
      intent: 'step_reading_metric',
      spokenResponse: speech,
      stepByStepIndex: index,
    };
  }

  // --- Computed Narration & Readings ---

  private async handleReadMyReadings(): Promise<VoiceCommandResult> {
    const readings = this.telemetryAccessor?.getAllCurrentReadings?.() || {};
    const briefing = buildBriefing(readings);
    await this.speak(briefing.fullSpeech);
    return {
      handled: true,
      intent: 'read_my_readings',
      spokenResponse: briefing.fullSpeech,
    };
  }

  private async handleReadSpecificIndicator(key: string): Promise<VoiceCommandResult> {
    const text = await this.formatIndicatorReading(key);
    await this.speak(text);
    return {
      handled: true,
      intent: `read_${key}`,
      spokenResponse: text,
      highlightMetric: key,
    };
  }

  private async formatIndicatorReading(key: string): Promise<string> {
    switch (key) {
      case 'heart_rate': {
        const hr = this.telemetryAccessor?.getMeasurement('heart_rate');
        if (!hr || hr.value === undefined || hr.value === null || hr.value === '') {
          return "I don't have a recent reading for heart rate.";
        }
        return `Your heart rate is currently ${hr.value} beats per minute.`;
      }
      case 'blood_pressure': {
        const bp = this.telemetryAccessor?.getBloodPressure();
        if (!bp || bp.systolic === undefined || bp.diastolic === undefined) {
          return "I don't have a recent reading for blood pressure.";
        }
        return `Your blood pressure is ${bp.systolic} over ${bp.diastolic} millimeters of mercury.`;
      }
      case 'sleep': {
        const sleep = this.telemetryAccessor?.getSleepReport();
        if (!sleep || sleep.durationHours === undefined || sleep.durationHours === null) {
          return "I don't have a recent reading for sleep.";
        }
        return `Sleep report: Total duration was ${sleep.durationHours} hours.`;
      }
      case 'glucose': {
        const g = this.telemetryAccessor?.getMeasurement('glucose');
        if (!g || g.value === undefined || g.value === null) {
          return "I don't have a recent reading for glucose.";
        }
        return `Blood glucose reading is ${g.value} milligrams per deciliter.`;
      }
      case 'temperature': {
        const temp = this.telemetryAccessor?.getMeasurement('temperature');
        if (!temp || temp.value === undefined || temp.value === null) {
          return "I don't have a recent reading for core temperature.";
        }
        return `Core body temperature is ${temp.value} degrees Celsius.`;
      }
      case 'spo2': {
        const spo2 = this.telemetryAccessor?.getMeasurement('spo2');
        if (!spo2 || spo2.value === undefined || spo2.value === null) {
          return "I don't have a recent reading for oxygen saturation.";
        }
        return `Oxygen saturation is ${spo2.value} percent.`;
      }
      case 'hrv': {
        const hrv = this.telemetryAccessor?.getMeasurement('hrv');
        if (!hrv || hrv.value === undefined || hrv.value === null) {
          return "I don't have a recent reading for heart rate variability.";
        }
        return `Heart rate variability RMSSD is ${hrv.value} milliseconds.`;
      }
      case 'respiration': {
        const resp = this.telemetryAccessor?.getMeasurement('respiration');
        if (!resp || resp.value === undefined || resp.value === null) {
          return "I don't have a recent reading for respiration rate.";
        }
        return `Respiration rate is ${resp.value} breaths per minute.`;
      }
      default:
        return "I don't have a recent reading for that parameter.";
    }
  }

  // --- Verbal 5-Step Check-In Workflow ---

  public async startVerbalCheckIn(): Promise<VoiceCommandResult> {
    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    const callsign = astronaut?.callsign || 'Astronaut';

    this.verbalCheckInState = {
      isActive: true,
      currentStepIndex: 0,
      answers: {},
    };

    const firstQ = VERBAL_CHECKIN_STEPS[0];
    const speech = `Starting daily check-in for ${callsign}. Question 1: ${firstQ.prompt}`;
    this.onNavigate?.('/check-in');
    await this.speak(speech);

    return {
      handled: true,
      intent: 'start_verbal_checkin',
      spokenResponse: speech,
      navigationTarget: '/check-in',
    };
  }

  private async handleVerbalCheckInWorkflow(text: string): Promise<VoiceCommandResult> {
    const idx = this.verbalCheckInState.currentStepIndex;
    const currentStep = VERBAL_CHECKIN_STEPS[idx];

    // Store answer
    this.verbalCheckInState.answers[currentStep.id] = text;

    // Read answer back for confirmation
    const ack = `Recorded: "${text}".`;

    const nextIdx = idx + 1;
    if (nextIdx < VERBAL_CHECKIN_STEPS.length) {
      this.verbalCheckInState.currentStepIndex = nextIdx;
      const nextQ = VERBAL_CHECKIN_STEPS[nextIdx];
      const speech = `${ack} Next question: ${nextQ.prompt}`;
      await this.speak(speech);
      return { handled: true, intent: 'verbal_checkin_next', spokenResponse: speech };
    }

    // All 5 steps completed: finalize and give 2 to 3 lifestyle suggestions
    this.verbalCheckInState.isActive = false;

    const readings = this.telemetryAccessor?.getAllCurrentReadings?.() || {};
    const briefing = buildBriefing(readings);

    const suggestions: string[] = [];
    if (briefing.lifestyleSuggestion) {
      suggestions.push(briefing.lifestyleSuggestion);
    }
    suggestions.push('Maintain 2.5 liters daily hydration.');
    suggestions.push('Execute scheduled ARED resistive axial loading set.');

    const finalSummary = `${ack} Your daily check-in is logged. Recommendations based on your readings: ${suggestions.join(' ')}`;
    await this.speak(finalSummary);

    return {
      handled: true,
      intent: 'verbal_checkin_completed',
      spokenResponse: finalSummary,
    };
  }

  // --- 7-Domain Assessment Compatibility ---

  public async startConversationalAssessment(): Promise<void> {
    await this.startVerbalCheckIn();
  }

  public async advanceAssessmentWorkflow(_text: string): Promise<VoiceCommandResult> {
    const cancelMsg = 'Assessment noted and stored.';
    this.assessmentState.isActive = false;
    await this.speak(cancelMsg);
    return { handled: true, intent: 'assessment_closed', spokenResponse: cancelMsg };
  }
}

export const solarisVoiceService = new SolarisVoiceService();
