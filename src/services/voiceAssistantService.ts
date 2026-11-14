/**
 * ASTRA Native Web Speech API & Backend Bridge Service
 * 100% Offline-Capable with automatic fallback when backend is offline.
 */

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface CrewData {
  id: string;
  name: string;
  callsign: string;
  role: string;
  status: 'nominal' | 'caution' | 'critical';
  vitals: {
    heartRate: number;
    hrv: number;
    spo2: number;
    coreTemp: number;
    radiation_mSv: number;
    boneDensity_TScore: number;
    sleepHours: number;
    fatigueLevel: number;
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    category: 'exercise' | 'circadian' | 'nutrition' | 'medical';
    priority: 'high' | 'medium' | 'routine';
  }>;
}

export interface AssessmentResponse {
  insight: string;
  affectedZones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen'>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    category: 'exercise' | 'circadian' | 'nutrition' | 'medical';
    priority: 'high' | 'medium' | 'routine';
  }>;
}

class VoiceAssistantService {
  private recognition: any = null;
  private isListening: boolean = false;
  private shouldListen: boolean = false;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onStateChangeCallback: ((state: 'sleeping' | 'awake' | 'listening' | 'speaking') => void) | null = null;
  private onLoudnessCallback: ((level: number) => void) | null = null;
  private loudnessInterval: any = null;

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindowWithSpeech;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        this.recognition = new SpeechRecognitionAPI();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.onStateChangeCallback?.('listening');
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const text = final || interim;
          if (text) {
            this.onTranscriptCallback?.(text.trim(), !!final);
          }
        };

        this.recognition.onerror = (event: any) => {
          // Non-fatal recognition error (e.g. no speech detected)
          if (event.error !== 'no-speech') {
            console.warn('[ASTRA Voice] Speech recognition warning:', event.error);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          // Restart if still in active listening mode
          if (this.shouldListen) {
            setTimeout(() => {
              if (this.shouldListen && !this.isListening) {
                try {
                  this.recognition?.start();
                } catch {
                  // ignore
                }
              }
            }, 300);
          } else {
            this.onStateChangeCallback?.('awake');
          }
        };
      } catch (err) {
        console.warn('[ASTRA Voice] Speech Recognition init failed:', err);
      }
    }
  }

  public setCallbacks(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStateChange: (state: 'sleeping' | 'awake' | 'listening' | 'speaking') => void,
    onLoudness?: (level: number) => void
  ) {
    this.onTranscriptCallback = onTranscript;
    this.onStateChangeCallback = onStateChange;
    if (onLoudness) this.onLoudnessCallback = onLoudness;
  }

  public startListening() {
    this.shouldListen = true;
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        // Recognition might already be running
      }
    }
  }

  public stopListening() {
    this.shouldListen = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
  }

  /**
   * Speak text using Web Speech API Synthesis with speech modulation callbacks
   */
  public speak(
    text: string,
    onHighlightWord?: (word: string) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      // Temporarily pause recognition while speaking to prevent self-triggering
      const wasListening = this.shouldListen;
      if (wasListening) {
        this.stopListening();
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Zira')) &&
          v.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      this.onStateChangeCallback?.('speaking');

      // Start simulated speech loudness oscillation for 3D body pulsing
      let pulseStep = 0;
      this.loudnessInterval = setInterval(() => {
        pulseStep += 0.35;
        const level = 0.4 + 0.5 * Math.abs(Math.sin(pulseStep) * Math.cos(pulseStep * 0.7));
        this.onLoudnessCallback?.(level);
      }, 50);

      utterance.onboundary = (event) => {
        if (onHighlightWord && event.name === 'word') {
          const word = text.substring(event.charIndex, event.charIndex + event.charLength);
          onHighlightWord(word);
        }
      };

      utterance.onend = () => {
        clearInterval(this.loudnessInterval);
        this.onLoudnessCallback?.(0);
        this.onStateChangeCallback?.(wasListening ? 'listening' : 'awake');
        if (wasListening) {
          this.startListening();
        }
        resolve();
      };

      utterance.onerror = (e) => {
        clearInterval(this.loudnessInterval);
        this.onLoudnessCallback?.(0);
        this.onStateChangeCallback?.(wasListening ? 'listening' : 'awake');
        if (wasListening) {
          this.startListening();
        }
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      clearInterval(this.loudnessInterval);
      this.onLoudnessCallback?.(0);
    }
  }

  /**
   * Fetch crew data from FastAPI backend with deterministic local fallback
   */
  public async fetchCrewData(name: string): Promise<CrewData> {
    const cleanName = name.toLowerCase().trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`http://localhost:8000/api/crew/${encodeURIComponent(cleanName)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Backend offline, seamlessly proceed to offline mock data
    }

    // Rich local fallback mock data
    return this.generateMockCrewData(cleanName);
  }

  /**
   * Post astronaut symptoms to assessment endpoint with intelligent microgravity correlation
   */
  public async postAssessment(utterance: string, subjectId: string): Promise<AssessmentResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch('http://localhost:8000/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utterance, subjectId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend offline, generate correlated insight locally
    }

    return this.generateCorrelatedInsight(utterance);
  }

  /**
   * Generate correlated clinical insight matching microgravity physiology
   */
  private generateCorrelatedInsight(utterance: string): AssessmentResponse {
    const text = utterance.toLowerCase();
    const affectedZones: Array<'heart' | 'spine' | 'head' | 'skin' | 'lungs' | 'abdomen'> = [];
    const recommendations: AssessmentResponse['recommendations'] = [];

    const hasSpine = text.includes('spine') || text.includes('back') || text.includes('ache') || text.includes('stiff') || text.includes('lumbar');
    const hasSleep = text.includes('sleep') || text.includes('tired') || text.includes('exhausted') || text.includes('insomnia') || text.includes('fatigue');
    const hasSkin = text.includes('skin') || text.includes('rash') || text.includes('irritat') || text.includes('itch') || text.includes('dry');
    const hasChest = text.includes('chest') || text.includes('heart') || text.includes('breath') || text.includes('palpitat');

    if (hasSpine) affectedZones.push('spine');
    if (hasSleep) affectedZones.push('head');
    if (hasSkin) affectedZones.push('skin');
    if (hasChest) affectedZones.push('heart');

    if (affectedZones.length === 0) {
      affectedZones.push('head', 'heart');
    }

    let insight = '';

    if (hasSpine && hasSleep) {
      insight =
        'Because your sleep quality dropped and your spine is elongating in microgravity, your autonomic regulation and cortisol levels are shifting. I recommend 20 minutes on the ARED resistive device and a 45-minute circadian light session.';
      recommendations.push(
        {
          id: 'rec-1',
          title: 'ARED Axial Loading',
          description: '20 minutes of spinal compressive loading (squats and heel-raises at 80% 1RM).',
          category: 'exercise',
          priority: 'high',
        },
        {
          id: 'rec-2',
          title: 'Circadian Light Alignment',
          description: '45-minute 480nm blue-enriched cabin lighting session to re-anchor sleep phase.',
          category: 'circadian',
          priority: 'medium',
        }
      );
    } else if (hasSpine) {
      insight =
        'Microgravity spinal unloading causes intervertebral disc hyper-hydration and paraspinal muscle fatigue. I recommend 25 minutes on the ARED device with targeted axial deadlifts and hydration review.';
      recommendations.push({
        id: 'rec-3',
        title: 'ARED Paraspinal Loading',
        description: 'Targeted lumbar compression protocol with 3 sets of deadlifts.',
        category: 'exercise',
        priority: 'high',
      });
    } else if (hasSkin) {
      insight =
        'Dermal microflora alterations and dry smart-garment contact can elevate local skin impedance. I recommend cleansing sensor electrode sites and adjusting garment tension.';
      recommendations.push({
        id: 'rec-4',
        title: 'Dermal Electrode Cleanse',
        description: 'Sanitize contact patches with isopropyl wipes and re-align garment seams.',
        category: 'medical',
        priority: 'medium',
      });
    } else if (hasChest) {
      insight =
        'Cephalad fluid redistribution alters stroke volume and resting heart rate. Please perform oral electrolyte rehydration and log a resting 12-lead ECG.';
      recommendations.push({
        id: 'rec-5',
        title: 'Electrolyte Fluid Loading',
        description: 'Consume 500 mL sodium-citrate hydration solution before high physical tasks.',
        category: 'nutrition',
        priority: 'high',
      });
    } else {
      insight =
        'Vitals demonstrate positive adaptation to current mission sol. Continue your scheduled 30-minute CEVIS cycling protocol and maintain hydration.';
      recommendations.push({
        id: 'rec-6',
        title: 'CEVIS Aerobic Cycling',
        description: 'Standard 30-minute cardiovascular maintenance interval.',
        category: 'exercise',
        priority: 'routine',
      });
    }

    return {
      insight,
      affectedZones,
      recommendations,
    };
  }

  private generateMockCrewData(name: string): CrewData {
    if (name.includes('vance') || name.includes('commander')) {
      return {
        id: 'ASTRA-VANCE',
        name: 'Commander Vance',
        callsign: 'Valkyrie',
        role: 'Mission Commander',
        status: 'nominal',
        vitals: {
          heartRate: 68,
          hrv: 54,
          spo2: 98,
          coreTemp: 36.8,
          radiation_mSv: 42.1,
          boneDensity_TScore: -0.4,
          sleepHours: 7.4,
          fatigueLevel: 1.8,
        },
        recommendations: [
          {
            id: 'v1',
            title: 'CEVIS Interval Session',
            description: '30 min aerobic threshold cycling.',
            category: 'exercise',
            priority: 'routine',
          },
        ],
      };
    }

    if (name.includes('patel') || name.includes('specialist')) {
      return {
        id: 'ASTRA-PATEL',
        name: 'Specialist Patel',
        callsign: 'Pioneer',
        role: 'EVA Specialist',
        status: 'caution',
        vitals: {
          heartRate: 78,
          hrv: 42,
          spo2: 97,
          coreTemp: 37.1,
          radiation_mSv: 54.8,
          boneDensity_TScore: -0.8,
          sleepHours: 6.2,
          fatigueLevel: 2.8,
        },
        recommendations: [
          {
            id: 'p1',
            title: 'ARED Bone Preservation',
            description: 'Axial heel-drop and deadlift set.',
            category: 'exercise',
            priority: 'high',
          },
        ],
      };
    }

    // Default to Maya Chen (Science Officer / Flight Engineer)
    return {
      id: 'ASTRA-02',
      name: 'Maya Chen',
      callsign: 'Aura',
      role: 'Flight Engineer / Science Officer',
      status: 'caution',
      vitals: {
        heartRate: 98,
        hrv: 38,
        spo2: 98,
        coreTemp: 37.9,
        radiation_mSv: 48.6,
        boneDensity_TScore: -0.6,
        sleepHours: 5.3,
        fatigueLevel: 3.9,
      },
      recommendations: [
        {
          id: 'm1',
          title: 'ARED Spine Stabilization',
          description: '20 minutes paraspinal compression protocol.',
          category: 'exercise',
          priority: 'high',
        },
        {
          id: 'm2',
          title: 'Circadian Light Boost',
          description: '45-minute 480nm blue light exposure in work module.',
          category: 'circadian',
          priority: 'high',
        },
      ],
    };
  }
}

export const voiceAssistantService = new VoiceAssistantService();
