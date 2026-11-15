/**
 * 16 kHz Mono PCM16 WAV Audio Capture & Voice Activity Detector (VAD).
 * Downsamples Web Audio to 16 kHz mono, tracks energy for silence detection (~1.2s),
 * and exports compliant WAV audio buffers for POST /api/voice/stt.
 */

export interface AudioRecorderOptions {
  silenceThresholdMs?: number;
  energyThreshold?: number;
  onSilenceDetected?: (wavBlob: Blob) => void;
  onLoudness?: (level: number) => void;
}

export class SolarisAudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private sampleBuffers: Float32Array[] = [];
  private isRecording = false;

  private silenceThresholdMs = 1200;
  private energyThreshold = 0.015;
  private lastSpeechTime = 0;
  private hasSpoken = false;
  private silenceTimer: any = null;

  private onSilenceDetected?: (wavBlob: Blob) => void;
  private onLoudness?: (level: number) => void;

  constructor(options?: AudioRecorderOptions) {
    if (options?.silenceThresholdMs) this.silenceThresholdMs = options.silenceThresholdMs;
    if (options?.energyThreshold) this.energyThreshold = options.energyThreshold;
    this.onSilenceDetected = options?.onSilenceDetected;
    this.onLoudness = options?.onLoudness;
  }

  public async start(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      this.stop();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // ScriptProcessor with 4096 buffer size
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.sampleBuffers = [];
      this.isRecording = true;
      this.hasSpoken = false;
      this.lastSpeechTime = Date.now();

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        this.sampleBuffers.push(new Float32Array(inputData));

        // Compute RMS energy
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.onLoudness?.(Math.min(1, rms * 5));

        const now = Date.now();
        if (rms > this.energyThreshold) {
          this.lastSpeechTime = now;
          this.hasSpoken = true;
        } else if (this.hasSpoken && now - this.lastSpeechTime > this.silenceThresholdMs) {
          // Silence detected after speech
          this.hasSpoken = false;
          this.commitUtterance();
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      return true;
    } catch (err) {
      console.warn('[SolarisAudioRecorder] Could not access microphone:', err);
      this.stop();
      return false;
    }
  }

  private commitUtterance() {
    if (this.sampleBuffers.length === 0) return;
    const currentInputSampleRate = this.audioContext?.sampleRate || 44100;
    const wavBlob = this.encodeWAV(this.sampleBuffers, currentInputSampleRate, 16000);
    this.sampleBuffers = [];
    this.onSilenceDetected?.(wavBlob);
  }

  public finishCurrentUtterance(): Blob | null {
    if (this.sampleBuffers.length === 0) return null;
    const currentInputSampleRate = this.audioContext?.sampleRate || 44100;
    const wavBlob = this.encodeWAV(this.sampleBuffers, currentInputSampleRate, 16000);
    this.sampleBuffers = [];
    return wavBlob;
  }

  public stop(): void {
    this.isRecording = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.sampleBuffers = [];
  }

  /**
   * Resamples PCM samples to 16 kHz mono and formats standard 16-bit PCM WAV.
   */
  private encodeWAV(
    buffers: Float32Array[],
    sourceSampleRate: number,
    targetSampleRate: number
  ): Blob {
    // 1. Flatten float buffers
    let totalLength = 0;
    for (const b of buffers) totalLength += b.length;
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
      merged.set(b, offset);
      offset += b.length;
    }

    // 2. Downsample to 16 kHz
    const resampled = this.downsample(merged, sourceSampleRate, targetSampleRate);

    // 3. Convert Float32 to Int16 PCM
    const pcm16 = new Int16Array(resampled.length);
    for (let i = 0; i < resampled.length; i++) {
      const s = Math.max(-1, Math.min(1, resampled[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // 4. Create WAV Container (44-byte header + PCM data)
    const wavBuffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(wavBuffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + pcm16.length * 2, true);
    // RIFF type & format
    this.writeString(view, 8, 'WAVEfmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format: PCM (1)
    view.setUint16(20, 1, true);
    // channel count: mono (1)
    view.setUint16(22, 1, true);
    // sample rate: 16000
    view.setUint32(24, targetSampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, targetSampleRate * 2, true);
    // block align (channels * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample: 16
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcm16.length * 2, true);

    // Copy PCM16 data into DataView
    let dataOffset = 44;
    for (let i = 0; i < pcm16.length; i++, dataOffset += 2) {
      view.setInt16(dataOffset, pcm16[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private downsample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
