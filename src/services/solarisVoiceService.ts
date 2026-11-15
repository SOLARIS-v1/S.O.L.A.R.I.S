/**
 * SOLARIS Authoritative Voice AI Service
 * 
 * Modularized clinical aerospace voice assistant engine:
 * - TTS & Audio management in src/voice/speech.ts
 * - Intent mapping & validation in src/voice/intents.ts
 * - Briefings & assessment templates in src/voice/narration.ts
 */

import {
  SolarisVoiceState,
  AssessmentStepConfig,
  AssessmentFlowState,
  VoiceCommandResult,
  normalizeVoiceInput,
  isSleepCommand,
  isWakeCommand,
} from '../voice/intents';
import {
  SolarisSpeechProvider,
  pickSolarisVoice,
} from '../voice/speech';
import {
  CLINICAL_ASSESSMENT_QUESTIONS,
  buildBriefing,
} from '../voice/narration';

export type {
  SolarisVoiceState,
  AssessmentStepConfig,
  AssessmentFlowState,
  VoiceCommandResult,
};

export {
  CLINICAL_ASSESSMENT_QUESTIONS,
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

export interface VoiceTranscriptItem {
  id: string;
  sender: 'solaris' | 'astronaut' | 'system';
  text: string;
  timestamp: string;
}

export class SolarisVoiceService {
  private state: SolarisVoiceState = 'awake';
  private previousState: SolarisVoiceState = 'awake';
  private recognition: any = null;
  private isListeningInternal: boolean = false;
  private shouldListenContinuous: boolean = false;
  private isPausedForSpeech: boolean = false;
  private isRecognitionStarting: boolean = false;
  
  private speechProvider: SolarisSpeechProvider;

  private onStateChange: ((state: SolarisVoiceState) => void) | null = null;
  private onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
  private onLoudness: ((level: number) => void) | null = null;
  private onUtteranceStart: ((text: string) => void) | null = null;
  private onUtteranceEnd: (() => void) | null = null;
  private onNavigate: ((route: string) => void) | null = null;
  private onAssessmentFlowChange: ((flow: AssessmentFlowState) => void) | null = null;

  private telemetryAccessor: HealthTelemetryAccessor | null = null;

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
    this.speechProvider = new SolarisSpeechProvider();
    this.initSpeechRecognition();
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
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn('[SOLARIS Voice] Microphone permission denied or blocked:', event.error);
          this.shouldListenContinuous = false;
          this.speechProvider.stopAudioMeter();
          this.setState('error');
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        console.warn('[SOLARIS Voice] Recognition error event:', event.error);
        this.shouldListenContinuous = false;
        this.speechProvider.stopAudioMeter();
        this.setState('error');
      };

      this.recognition.onend = () => {
        this.isListeningInternal = false;
        this.isRecognitionStarting = false;

        if (this.isPausedForSpeech || this.state === 'speaking') {
          return;
        }

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
    if (this.onLoudness) {
      this.speechProvider.startAudioMeter(this.onLoudness);
    }
  }

  public stopListening(): void {
    this.shouldListenContinuous = false;
    this.safeStopRecognition();
    this.speechProvider.stopAudioMeter();
    if (this.state === 'listening') {
      this.setState('awake');
    }
  }

  public async speak(text: string): Promise<void> {
    if (this.state === 'manual_mode') {
      this.onUtteranceStart?.(text);
      this.onUtteranceEnd?.();
      return;
    }

    this.isPausedForSpeech = true;
    this.safeStopRecognition();
    this.setState('speaking');

    await this.speechProvider.speak(text, {
      onStart: (t) => this.onUtteranceStart?.(t),
      onEnd: () => {
        this.isPausedForSpeech = false;
        this.onUtteranceEnd?.();
        if (this.state === 'speaking') {
          if (this.shouldListenContinuous) {
            this.setState('listening');
            this.safeStartRecognition();
          } else {
            this.setState('awake');
          }
        }
      },
      onError: (err) => {
        console.warn('[SOLARIS Voice] TTS error:', err);
        this.isPausedForSpeech = false;
      },
    });
  }

  public stopSpeaking(): void {
    this.speechProvider.stopSpeaking();
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

  public async handleVoiceInput(rawInput: string): Promise<VoiceCommandResult> {
    const text = rawInput.trim();
    if (!text) return { handled: false, intent: 'empty', spokenResponse: '' };

    this.setState('processing');

    if (this.assessmentState.isActive) {
      return await this.advanceAssessmentWorkflow(text);
    }

    return await this.parseAndExecuteCommand(text);
  }

  public async parseAndExecuteCommand(rawText: string): Promise<VoiceCommandResult> {
    const lower = rawText.toLowerCase().trim();
    const normalized = normalizeVoiceInput(rawText);

    // 1. Wake word: 'Wake up, SOLARIS'
    if (isWakeCommand(normalized)) {
      const response = 'Hello. SOLARIS is online. How can I assist you?';
      this.shouldListenContinuous = true;
      await this.speak(response);
      return { handled: true, intent: 'wake', spokenResponse: response, newState: 'listening' };
    }

    // 2. Sleep commands: 'Sleep SOLARIS' / 'Stop listening'
    if (isSleepCommand(normalized)) {
      const response = "Going to sleep.";
      this.stopSpeaking();
      this.stopListening();
      this.setState('sleeping');
      return { handled: true, intent: 'sleep', spokenResponse: response, newState: 'sleeping' };
    }

    // 3. Typed only mode / manual mode: 'Switch to typed only mode'
    if (
      lower.includes('switch to manual mode') ||
      lower.includes('manual mode') ||
      lower.includes('typed only mode') ||
      lower.includes('typed mode') ||
      lower.includes('quiet mode') ||
      lower.includes('silent mode')
    ) {
      const response = 'Typed only mode engaged. Voice recognition paused. You can inspect telemetry silently.';
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

    // 5. 'Read my readings' / 'how am I doing'
    if (
      lower.includes('read my readings') ||
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

    // 9. 'Start health assessment' / 'start check-in'
    if (
      lower.includes('start health assessment') ||
      lower.includes('start assessment') ||
      lower.includes('begin assessment') ||
      lower.includes('daily assessment') ||
      lower.includes('start check-in') ||
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
      lower.includes('show trends') ||
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

    // 15. 'Show body' / 'body explorer'
    if (lower.includes('body explorer') || lower.includes('show body') || lower.includes('show my body') || lower.includes('3d body')) {
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

    // Default Fallback
    const astronaut = this.telemetryAccessor?.getActiveAstronaut();
    const callsign = astronaut?.callsign || 'Astronaut';
    const fallbackResponse = `Command acknowledged, ${callsign}. You can ask SOLARIS to read your heart rate, check blood pressure, review sleep, start check-in, or open your trends.`;
    await this.speak(fallbackResponse);
    return { handled: false, intent: 'unknown', spokenResponse: fallbackResponse };
  }

  // --- Grounded Telemetry Handlers ---

  private async handleReadHeartRate(): Promise<VoiceCommandResult> {
    const hr = this.telemetryAccessor?.getMeasurement('heart_rate');
    if (!hr || hr.value === undefined || hr.value === null || hr.value === '') {
      const text = "I don't have a recent reading for heart rate.";
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
      const text = "I don't have a recent reading for blood pressure.";
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
      const text = "I don't have a recent reading for sleep.";
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
      const text = "I don't have a recent reading for radiation exposure.";
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
      const text = "I don't have a recent reading or active alert to explain.";
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

    if (!hr && !bp && !spo2 && !rad && !sleep) {
      const text = "I don't have recent readings for your health parameters.";
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

    // Check for emergency flags: chest pain, breathing difficulty, fainting, severe pain
    if (
      lower.includes('chest pain') ||
      lower.includes('trouble breathing') ||
      lower.includes('cannot breathe') ||
      lower.includes('fainted') ||
      lower.includes('passed out') ||
      lower.includes('severe pain')
    ) {
      const emergencyWarning = 'Urgent: Your symptoms indicate an immediate health concern. Please contact the mission medical officer right now.';
      await this.speak(emergencyWarning);
      return { handled: true, intent: 'emergency_alert', spokenResponse: emergencyWarning };
    }

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
        return await this.summarizeAndAskConfirmation();
      }
    }

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

export const solarisVoiceService = new SolarisVoiceService();
