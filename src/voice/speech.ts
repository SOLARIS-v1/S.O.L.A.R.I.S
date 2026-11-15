/**
 * SOLARIS Speech Engine: TTS & Audio Device Management
 */

export interface SpeechOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  onStart?: (text: string) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function pickSolarisVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices() || [];
  if (voices.length === 0) return null;

  // Filter for localService === true voices where available (offline safe)
  const localVoices = voices.filter(v => (v as any).localService === true);
  const candidates = localVoices.length > 0 ? localVoices : voices;

  const preferredNames = [
    'Google UK English Female',
    'Google US English',
    'Microsoft Zira',
    'Microsoft David',
    'Samantha',
    'Victoria',
    'Karen',
    'Oliver',
    'Natural',
    'Neural',
  ];

  for (const name of preferredNames) {
    const match = candidates.find(v => v.lang.startsWith('en') && v.name.includes(name));
    if (match) return match;
  }

  const englishVoice = candidates.find(v => v.lang.startsWith('en'));
  return englishVoice || candidates[0] || null;
}

export class SolarisSpeechProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private loudnessInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public speak(text: string, options?: SpeechOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        options?.onStart?.(text);
        setTimeout(() => {
          options?.onEnd?.();
          resolve();
        }, Math.min(1000, Math.max(300, text.length * 35)));
        return;
      }

      try {
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options?.rate ?? 1.0;
        utterance.pitch = options?.pitch ?? 1.0;

        const voice = options?.voice || pickSolarisVoice(this.synth);
        if (voice) utterance.voice = voice;

        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          this.currentUtterance = null;
          options?.onEnd?.();
          resolve();
        };

        utterance.onstart = () => {
          options?.onStart?.(text);
        };
        utterance.onend = finish;
        utterance.onerror = (err) => {
          options?.onError?.(err);
          finish();
        };

        const wordCount = text.split(/\s+/).length;
        const expectedDurationMs = Math.max(1000, (wordCount / 2.5) * 1000 + 1500);
        setTimeout(finish, expectedDurationMs);

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
      } catch (err) {
        options?.onError?.(err);
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
    this.currentUtterance = null;
  }

  public async startAudioMeter(onLoudness: (level: number) => void): Promise<void> {
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
        if (!this.analyser) {
          onLoudness(0);
          return;
        }
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        onLoudness(normalized);
      }, 100);
    } catch {
      // Audio meter is non-fatal
    }
  }

  public stopAudioMeter(): void {
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
}
