import { VoiceOption } from '../types/index.ts';

// Type definitions for Web Speech API
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

class VoiceService {
  private recognition: SpeechRecognitionInstance | null = null;
  private wakeWordRecognition: SpeechRecognitionInstance | null = null;
  private wakeWordBuffer = '';
  private isRecognizing = false;
  private isWakeWordActive = false;
  private wakeWordRestartTimeout: number | null = null;
  private wakeWordCallbacks: {
    onWakeWordDetected: (matchedPhrase: string, command?: string) => void;
    onError: (err: string, fatal?: boolean) => void;
    onStart?: () => void;
  } | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  public isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  // Wake Word Pattern Matcher & Command Extractor
  // Supports "Hey Jarvis", "Jarvis", and common recognition variations.
  public checkWakeWord(
    text: string
  ): {
    matched: boolean;
    phrase: string;
    command?: string;
  } {
    if (!text || typeof text !== 'string') {
      return { matched: false, phrase: '' };
    }

    // Strip punctuation, normalize whitespace, lowercase.
    const clean = text
      .toLowerCase()
      .replace(/[.,/#!$%^&\*;:{}=\\\-_`\~()?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      return { matched: false, phrase: '' };
    }

    /*
     * 1. Wake word with a prefix.
     *
     * Examples:
     *   "hey jarvis"
     *   "hi jarvis"
     *   "hello jarvis"
     *   "ok jarvis"
     *   "okay jarvis"
     *   "listen jarvis"
     *   "yo jarvis"
     *
     * We also allow common SpeechRecognition variations:
     *   jarvis
     *   jervis
     *   jarviss
     *   jarvice
     */
    const prefixPattern =
      /\b(hey|hi|hello|ok|okay|listen|yo)\s+(jarvis|jervis|jarviss|jarvice)\b/i;

    const prefixMatch = prefixPattern.exec(clean);

    if (prefixMatch) {
      const matchedPhrase = prefixMatch[0];

      const matchEnd =
        prefixMatch.index + matchedPhrase.length;

      const trailingCommand =
        clean.slice(matchEnd).trim();

      return {
        matched: true,
        phrase: matchedPhrase,
        command:
          trailingCommand.length > 1
            ? trailingCommand
            : undefined,
      };
    }

    /*
     * 2. Direct name call.
     *
     * Examples:
     *   "jarvis"
     *   "jarvis what is the weather"
     */
    const directPattern =
      /\b(jarvis|jervis|jarviss|jarvice)\b/i;

    const directMatch =
      directPattern.exec(clean);

    if (directMatch) {
      const matchedPhrase = directMatch[0];

      const matchEnd =
        directMatch.index + matchedPhrase.length;

      const trailingCommand =
        clean.slice(matchEnd).trim();

      return {
        matched: true,
        phrase: matchedPhrase,
        command:
          trailingCommand.length > 1
            ? trailingCommand
            : undefined,
      };
    }

    return {
      matched: false,
      phrase: '',
    };
  }

  public isWakeWordMatch(text: string): boolean {
    return this.checkWakeWord(text).matched;
  }

  // Audio cues using Web Audio API
  public playChime(type: 'activate' | 'done' | 'alert') {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'activate') {
        // Futuristic rising dual tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'done') {
        // Soft acknowledgement tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (type === 'alert') {
        // Gentle warning chord
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.31);
      }

      setTimeout(() => {
        ctx.close().catch(() => { });
      }, 500);
    } catch {
      // Audio context might be restricted before user gesture; fail silently
    }
  }

  // Real-time audio analyzer for mic level
  public async startAudioAnalysis(onLevelUpdate: (level: number) => void): Promise<void> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            sampleSize: 16
          }
        });
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const loop = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 80); // Scale to 0..1
        onLevelUpdate(normalized);

        this.animationFrameId = requestAnimationFrame(loop);
      };

      loop();
    } catch (err) {
      console.warn('Could not initialize audio visualizer stream:', err);
    }
  }

  public stopAudioAnalysis(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    this.analyser = null;
  }

  // Speech Recognition
  public startListening(callbacks: {
    onStart: () => void;
    onInterim: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (err: string) => void;
    onEnd: () => void;
  }): void {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError('Speech recognition is not supported in this browser. Please use Google Chrome or a supported voice browser.');
      return;
    }

    // Ensure wake-word recognition is paused/stopped before command listening
    this.stopWakeWordListening();

    if (this.isRecognizing) {
      this.stopListening();
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      let finalTranscript = '';

      this.recognition.onstart = () => {
        this.isRecognizing = true;
        callbacks.onStart();
      };

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const transcript = item[0].transcript;
          if (item.isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          callbacks.onInterim(interim);
        }

        if (finalTranscript) {
          callbacks.onFinal(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        this.isRecognizing = false;
        let errorMessage = 'Voice input encountered an issue.';
        if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech was detected. Tap the core and speak again.';
        } else if (event.error === 'network') {
          errorMessage = 'Speech service network error occurred.';
        }
        callbacks.onError(errorMessage);
      };

      this.recognition.onend = () => {
        this.isRecognizing = false;
        callbacks.onEnd();
      };

      this.recognition.start();
    } catch (err: unknown) {
      this.isRecognizing = false;
      const msg = err instanceof Error ? err.message : 'Failed to start microphone';
      callbacks.onError(msg);
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isRecognizing) {
      try {
        this.recognition.stop();
      } catch {
        this.recognition.abort();
      }
    }
    this.isRecognizing = false;
    this.stopAudioAnalysis();
  }

  // Wake Word Continuous Listening Engine
  public startWakeWordListening(callbacks: {
    onWakeWordDetected: (matchedPhrase: string, command?: string) => void;
    onError: (err: string, fatal?: boolean) => void;
    onStart?: () => void;
  }): void {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError('Speech recognition is not supported in this browser.', true);
      return;
    }

    // Stop active one-shot command recognition if running
    this.stopListening();
    this.stopWakeWordListening();

    this.wakeWordCallbacks = callbacks;
    this.isWakeWordActive = true;

    this.runWakeWordRecognition();
  }

  private scheduleWakeWordRestart(delayMs = 200): void {
    if (this.wakeWordRestartTimeout) {
      clearTimeout(this.wakeWordRestartTimeout);
      this.wakeWordRestartTimeout = null;
    }
    if (!this.isWakeWordActive || this.isSpeaking() || this.isRecognizing) {
      return;
    }
    this.wakeWordRestartTimeout = window.setTimeout(() => {
      this.wakeWordRestartTimeout = null;
      if (this.isWakeWordActive && !this.isSpeaking() && !this.isRecognizing) {
        this.runWakeWordRecognition();
      }
    }, delayMs);
  }

  private runWakeWordRecognition(): void {
    if (
      !this.isWakeWordActive ||
      this.isSpeaking() ||
      this.isRecognizing
    ) {
      return;
    }

    // Clean transcript state for a fresh recognition session.
    this.wakeWordBuffer = '';

    if (this.wakeWordRecognition) {
      const oldRec = this.wakeWordRecognition;
      this.wakeWordRecognition = null;

      try {
        oldRec.onstart = null;
        oldRec.onresult = null;
        oldRec.onerror = null;
        oldRec.onend = null;
        oldRec.abort();
      } catch {
        // Ignore abort errors.
      }
    }

    const SpeechRec =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn(
        '[VoiceService] SpeechRecognition is not supported in this browser.'
      );
      return;
    }

    try {
      const rec = new SpeechRec();

      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.lang =
        (typeof navigator !== 'undefined' && navigator.language) ||
        'en-US';

      rec.onstart = () => {
        // console.log(
        //   '[VoiceService] Wake word recognition started'
        // );

        this.wakeWordCallbacks?.onStart?.();
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        if (
          !this.isWakeWordActive ||
          this.isSpeaking() ||
          this.isRecognizing
        ) {
          return;
        }

        /*
         * IMPORTANT:
         *
         * SpeechRecognition results contain both:
         *
         *   final results
         *   interim results
         *
         * Interim results are revisions, NOT new speech.
         *
         * Therefore we must NOT append every interim result.
         */

        let finalTranscript = '';
        let interimTranscript = '';

        /*
         * Read the results returned by the browser.
         */
        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          const result = event.results[i];

          if (!result) {
            continue;
          }

          /*
           * Use the first/best alternative for the transcript.
           *
           * We'll separately test all alternatives below.
           */
          const transcript =
            result[0]?.transcript?.trim() || '';

          if (!transcript) {
            continue;
          }

          if (result.isFinal) {
            finalTranscript += ` ${transcript}`;
          } else {
            interimTranscript += ` ${transcript}`;
          }

          /*
           * Also check every alternative individually.
           *
           * This helps when Chrome returns:
           *
           * "dhruv"
           * "dur"
           * "duro"
           * etc.
           */
          for (let a = 0; a < result.length; a++) {
            const alternative =
              result[a]?.transcript?.trim() || '';

            if (!alternative) {
              continue;
            }

            // console.log(
            //   '[VoiceService] Wake candidate:',
            //   alternative,
            //   '| final:',
            //   result.isFinal
            // );

            const directCheck =
              this.checkWakeWord(alternative);

            if (directCheck.matched) {
              // console.log(
              //   '[VoiceService] Wake word matched alternative:',
              //   alternative
              // );

              this.wakeWordBuffer = '';

              this.stopWakeWordListening();

              this.wakeWordCallbacks?.onWakeWordDetected(
                directCheck.phrase || 'Hey Jarvis',
                directCheck.command
              );

              return;
            }
          }
        }

        /*
         * Add ONLY final speech to the persistent buffer.
         *
         * Interim speech is temporary and will be replaced
         * by the browser.
         */
        if (finalTranscript.trim()) {
          this.wakeWordBuffer = [
            this.wakeWordBuffer,
            finalTranscript.trim(),
          ]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          /*
           * Keep only the most recent 12 words.
           */
          const words =
            this.wakeWordBuffer.split(' ');

          if (words.length > 12) {
            this.wakeWordBuffer =
              words.slice(-12).join(' ');
          }
        }

        /*
         * For debugging, show what Chrome currently thinks
         * you are saying.
         */
        const debugTranscript = [
          this.wakeWordBuffer,
          interimTranscript.trim(),
        ]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (debugTranscript) {
          // console.log(
          //   '[VoiceService] Wake transcript:',
          //   debugTranscript
          // );
        }

        /*
         * Check the combined final + current interim transcript.
         *
         * Example:
         *
         * Final:   "hey"
         * Interim: "dur"
         *
         * Combined:
         *
         * "hey dur"
         *
         * This allows checkWakeWord() to detect the wake word
         * before the browser necessarily finalizes everything.
         */
        const combinedTranscript = [
          this.wakeWordBuffer,
          interimTranscript.trim(),
        ]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!combinedTranscript) {
          return;
        }

        const check =
          this.checkWakeWord(combinedTranscript);

        if (check.matched) {
          // console.log(
          //   '[VoiceService] Wake word detected:',
          //   check.phrase || 'Hey Jarvis'
          // );

          if (check.command) {
            // console.log(
            //   '[VoiceService] Trailing command:',
            //   check.command
            // );
          }

          this.wakeWordBuffer = '';

          this.stopWakeWordListening();

          this.wakeWordCallbacks?.onWakeWordDetected(
            check.phrase || 'Hey Jarvis',
            check.command
          );
        }
      };

      rec.onerror = (
        event: SpeechRecognitionErrorEventLike
      ) => {
        if (!this.isWakeWordActive) {
          return;
        }

        console.warn(
          '[VoiceService] Wake word recognition error:',
          event.error
        );

        if (event.error === 'not-allowed') {
          this.wakeWordCallbacks?.onError(
            'Microphone permission required. Tap anywhere to activate "Hey Jarvis".',
            false
          );
        } else if (
          event.error === 'no-speech' ||
          event.error === 'aborted'
        ) {
          // Normal Chromium behavior.
          // onend() will restart recognition.
        } else if (event.error === 'audio-capture') {
          console.warn(
            '[VoiceService] Audio capture notice, rescheduling wake word listener'
          );

          this.scheduleWakeWordRestart(600);
        } else if (event.error === 'network') {
          console.warn(
            '[VoiceService] Wake word network error, rescheduling'
          );

          this.scheduleWakeWordRestart(1000);
        } else {
          console.warn(
            '[VoiceService] Wake word notice:',
            event.error
          );
        }
      };

      rec.onend = () => {
        // console.log(
        //   '[VoiceService] Wake word recognition ended'
        // );

        if (
          this.isWakeWordActive &&
          !this.isSpeaking() &&
          !this.isRecognizing
        ) {
          this.scheduleWakeWordRestart(200);
        }
      };

      this.wakeWordRecognition = rec;

      rec.start();

      // console.log(
      //   '[VoiceService] Wake word listener started'
      // );
    } catch (err: unknown) {
      console.warn(
        '[VoiceService] Failed to start wake word instance:',
        err
      );

      if (
        this.isWakeWordActive &&
        !this.isSpeaking() &&
        !this.isRecognizing
      ) {
        this.scheduleWakeWordRestart(800);
      }
    }
  }

  public stopWakeWordListening(): void {
    this.isWakeWordActive = false;

    if (this.wakeWordRestartTimeout) {
      clearTimeout(
        this.wakeWordRestartTimeout
      );

      this.wakeWordRestartTimeout = null;
    }

    // Clear the wake-word transcript buffer.
    this.wakeWordBuffer = '';

    if (this.wakeWordRecognition) {
      const rec = this.wakeWordRecognition;

      this.wakeWordRecognition = null;

      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;

        rec.abort();
      } catch {
        // Ignore abort errors.
      }
    }
  }

  public isListeningForWakeWord(): boolean {
    return this.isWakeWordActive && this.wakeWordRecognition !== null;
  }

  public stopAll(): void {
    this.stopSpeaking();
    this.stopListening();
    this.stopWakeWordListening();
  }

  // Speech Synthesis
  public getVoices(): Promise<VoiceOption[]> {
    return new Promise(resolve => {
      if (!this.isSpeechSynthesisSupported()) {
        resolve([]);
        return;
      }

      const fetchVoices = () => {
        const synthVoices = window.speechSynthesis.getVoices();
        const formatted: VoiceOption[] = synthVoices.map(v => ({
          name: v.name,
          lang: v.lang,
          voiceURI: v.voiceURI,
          default: v.default,
        }));
        resolve(formatted);
      };

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        fetchVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = fetchVoices;
        // Fallback timeout in case onvoiceschanged does not fire
        setTimeout(fetchVoices, 600);
      }
    });
  }

  public speak(
    text: string,
    options: {
      voiceURI?: string;
      rate?: number;
      pitch?: number;
    },
    callbacks: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: string) => void;
    }
  ): void {
    if (!this.isSpeechSynthesisSupported()) {
      callbacks.onError?.('Speech synthesis is not supported on this browser.');
      return;
    }

    // Cancel any previous speech
    this.stopSpeaking();

    // Clean text for speech (remove markdown symbols or code asterisks for clean pronunciation)
    const cleanText = text
      .replace(/[*_#`~[\]()]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      callbacks.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate ?? 1.05;
    // Set pitch >= 1.15 to ensure a natural, crisp feminine vocal timbre
    utterance.pitch = Math.max(options.pitch ?? 1.15, 1.15);

    // Actively select and enforce female voice
    const voices = window.speechSynthesis.getVoices();
    let chosenVoice: SpeechSynthesisVoice | undefined;

    if (options.voiceURI) {
      const match = voices.find(v => v.voiceURI === options.voiceURI);
      // If the provided voice is known to be male, actively override with female voice
      if (match && !isMaleVoice(match.name)) {
        chosenVoice = match;
      }
    }

    // If no female voice selected yet, resolve optimal female voice from available system voices
    if (!chosenVoice && voices.length > 0) {
      const femaleOption = selectPreferredFemaleVoice(
        voices.map(v => ({
          name: v.name,
          lang: v.lang,
          voiceURI: v.voiceURI,
          default: v.default,
        }))
      );
      if (femaleOption) {
        chosenVoice = voices.find(v => v.voiceURI === femaleOption.voiceURI);
      }
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onstart = () => {
      callbacks.onStart?.();
    };

    utterance.onend = () => {
      callbacks.onEnd?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        callbacks.onError?.(e.error || 'Speech output error');
      } else {
        callbacks.onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking(): void {
    if (this.isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
  }

  public selectPreferredFemaleVoice(voices: VoiceOption[]): VoiceOption | null {
    return selectPreferredFemaleVoice(voices);
  }
}

/**
 * Checks whether a voice is a known male voice
 */
export function isMaleVoice(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();

  // If it explicitly says female, it's not male
  if (lower.includes('female')) return false;

  // Google US English is Chrome's default male synthesizer voice
  if (lower === 'google us english' || (lower.includes('google') && lower.includes('us english'))) {
    return true;
  }

  const maleIdentifiers = [
    'male',
    'david',
    'mark',
    'guy',
    'ryan',
    'alex',
    'fred',
    'daniel',
    'george',
    'oliver',
    'thomas',
    'rishi',
    'ravi',
    'james',
    'john',
    'paul',
    'matthew',
    'joey',
    'justin',
    'ralph',
    'bruce',
    'tom',
    'steffan',
    'cosimo',
    'mats',
    'pablo',
    'alva',
  ];

  return maleIdentifiers.some(m => lower.includes(m));
}

/**
 * Checks whether a voice is a known female voice
 */
export function isFemaleVoice(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();

  const femaleIdentifiers = [
    'female',
    'woman',
    'girl',
    'samantha',
    'victoria',
    'karen',
    'zira',
    'jenny',
    'aria',
    'sonia',
    'natasha',
    'clara',
    'neerja',
    'moira',
    'fiona',
    'tessa',
    'hazel',
    'susan',
    'joanna',
    'kendra',
    'kimberly',
    'salli',
    'libby',
    'maisie',
    'kate',
    'serena',
    'allison',
    'ava',
    'ivy',
    'zoe',
    'nora',
    'amira',
    'ayanda',
    'linh',
    'nour',
    'aditi',
    'ananya',
    'shruti',
    'heera',
    'veena',
  ];

  return femaleIdentifiers.some(f => lower.includes(f));
}

/**
 * Dynamic female voice selector:
 * Inspects available speechSynthesis voices, strictly filters out male voices,
 * prefers high-fidelity English female voices, and gracefully falls back to neutral female timbre.
 */
export function selectPreferredFemaleVoice(voices: VoiceOption[]): VoiceOption | null {
  if (!voices || voices.length === 0) return null;

  // 1. Prioritize English voices
  const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  // 2. Score candidate voices
  const scored = pool.map(voice => {
    const nameLower = voice.name.toLowerCase();
    let score = 0;

    const female = isFemaleVoice(voice.name);
    const male = isMaleVoice(voice.name);

    if (female) score += 300;
    if (male) score -= 2000; // Heavily penalize male voices

    // High quality indicators
    if (nameLower.includes('natural') || nameLower.includes('neural') || nameLower.includes('online')) {
      score += 50;
    }
    if (nameLower.includes('google') && female) {
      score += 100; // e.g., Google UK English Female
    }
    if (nameLower.includes('jenny') || nameLower.includes('aria') || nameLower.includes('zira')) {
      score += 90;
    }
    if (nameLower.includes('samantha') || nameLower.includes('victoria') || nameLower.includes('karen')) {
      score += 85;
    }

    // Dialect preference
    if (voice.lang.toLowerCase().startsWith('en-us') || voice.lang.toLowerCase().startsWith('en-gb')) {
      score += 20;
    }

    return { voice, score, female, male };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return the best ranked female voice
  const topFemale = scored.find(s => s.female && !s.male);
  if (topFemale) {
    return topFemale.voice;
  }

  // If no explicit female keyword matched, return the best non-male voice
  const nonMale = scored.find(s => !s.male);
  if (nonMale) {
    return nonMale.voice;
  }

  return scored[0]?.voice || voices[0] || null;
}

export const voiceService = new VoiceService();

