import { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantState, Message, VoiceSettings, VoiceOption, MusicState, MusicTrack } from '../types/index.ts';
import { sendChatMessage, resetSession } from '../services/apiService.ts';
import { voiceService, selectPreferredFemaleVoice, isMaleVoice } from '../services/voiceService.ts';
import { musicPlayerService } from '../services/musicPlayerService.ts';

const DEFAULT_SETTINGS: VoiceSettings = {
  wakeWordEnabled: true,
  voiceResponsesEnabled: true,
  selectedVoiceURI: '',
  speechRate: 1.0,
  speechPitch: 1.15,
  audioReactivity: true,
  soundEffects: true,
};

export interface UseVoiceAssistantOptions {
  enabled?: boolean;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = { enabled: true }) {
  const isEnabled = options.enabled !== false;
  const [state, setState] = useState<AssistantState>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('Say "Hey Thruv"');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('karthick_ai_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          speechPitch: Math.max(parsed.speechPitch ?? 1.15, 1.15),
          wakeWordEnabled: parsed.wakeWordVersion === '2.1' ? parsed.wakeWordEnabled : true,
        };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Music playback layer state
  const [musicState, setMusicState] = useState<MusicState>(() => musicPlayerService.getState());
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(() => musicPlayerService.getCurrentTrack());
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(() => musicPlayerService.isBlockedByAutoplay());

  // Subscribe to music player updates
  useEffect(() => {
    const unsubscribe = musicPlayerService.subscribe((mState, track, blocked) => {
      setMusicState(mState);
      setCurrentTrack(track);
      setIsAutoplayBlocked(blocked);
    });
    return () => unsubscribe();
  }, []);

  const sessionIdRef = useRef<string>(`sess_${Date.now()}`);
  const isSpeakingRef = useRef<boolean>(false);
  const speechSimIntervalRef = useRef<number | null>(null);
  const startCommandListeningRef = useRef<() => void>(() => {});

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(
        'karthick_ai_settings',
        JSON.stringify({ ...settings, wakeWordVersion: '2.1' })
      );
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  // Load available system voices & dynamically select preferred female English voice
  useEffect(() => {
    voiceService.getVoices().then(voices => {
      setAvailableVoices(voices);
      if (voices.length > 0) {
        const preferredFemale = selectPreferredFemaleVoice(voices);
        if (preferredFemale) {
          setSettings(prev => {
            const currentVoice = voices.find(v => v.voiceURI === prev.selectedVoiceURI);
            // If no voice selected, or current voice is male, or current voice not found -> switch to preferred female
            if (!currentVoice || isMaleVoice(currentVoice.name) || !prev.selectedVoiceURI) {
              return {
                ...prev,
                selectedVoiceURI: preferredFemale.voiceURI,
                speechPitch: Math.max(prev.speechPitch, 1.15),
              };
            }
            return prev;
          });
        }
      }
    });
  }, []);

  // Update microcopy whenever state changes if not overridden by interim transcript
  useEffect(() => {
    switch (state) {
      case 'IDLE':
        setStatusMessage('Say "Hey Thruv"');
        setInterimTranscript('');
        break;
      case 'LISTENING_FOR_WAKE_WORD':
        setStatusMessage('Say "Hey Thruv"');
        setInterimTranscript('');
        break;
      case 'WAKE_WORD_DETECTED':
        setStatusMessage('Yes?');
        setInterimTranscript('');
        break;
      case 'LISTENING':
      case 'LISTENING_FOR_COMMAND':
        setStatusMessage('Listening...');
        break;
      case 'THINKING':
        setStatusMessage('Thinking...');
        setInterimTranscript('');
        break;
      case 'SPEAKING':
        setStatusMessage('Speaking...');
        break;
      case 'ERROR':
        // statusMessage is handled explicitly by the error trigger
        break;
    }
  }, [state]);

  // Stop any active speech animation simulation
  const stopSpeechSimulation = useCallback(() => {
    if (speechSimIntervalRef.current) {
      clearInterval(speechSimIntervalRef.current);
      speechSimIntervalRef.current = null;
    }
  }, []);

  // Start speech animation simulation (modulates orb rings to the rhythm of speech)
  const startSpeechSimulation = useCallback(() => {
    stopSpeechSimulation();
    speechSimIntervalRef.current = window.setInterval(() => {
      // Harmonic undulating wave simulating speech cadence
      const time = Date.now() / 150;
      const baseWave = (Math.sin(time) + Math.cos(time * 1.7) + 2) / 4;
      const randomJitter = Math.random() * 0.25;
      const level = Math.min(1, Math.max(0.15, baseWave * 0.75 + randomJitter));
      setAudioLevel(level);
    }, 50);
  }, [stopSpeechSimulation]);

  // Stop speech synthesis & audio
  const stopSpeaking = useCallback(() => {
    voiceService.stopSpeaking();
    stopSpeechSimulation();
    isSpeakingRef.current = false;
    setAudioLevel(0);
    if (state === 'SPEAKING' || state === 'WAKE_WORD_DETECTED') {
      setState(settings.wakeWordEnabled ? 'LISTENING_FOR_WAKE_WORD' : 'IDLE');
    }
  }, [settings.wakeWordEnabled, state, stopSpeechSimulation]);

  // Send message and get Gemini response
  const handleSendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Prevent active speech or command listening from interfering
    voiceService.stopSpeaking();
    voiceService.stopListening();
    voiceService.stopWakeWordListening();
    stopSpeechSimulation();
    isSpeakingRef.current = false;

    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setState('THINKING');
    setAudioLevel(0);

    // Check browser geolocation for location-aware tools (e.g., Live Weather)
    let locationCoords: { latitude: number; longitude: number } | undefined = undefined;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const coords = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 1500, maximumAge: 300000 }
          );
        });
        if (coords) {
          locationCoords = coords;
        }
      } catch {
        // Geolocation unavailable or denied
      }
    }

    // Fallback to cached coordinates saved during login if live lookup timed out
    if (!locationCoords) {
      try {
        const cached = localStorage.getItem('thruv_last_coords');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.latitude && parsed.longitude) {
            locationCoords = { latitude: parsed.latitude, longitude: parsed.longitude };
          }
        }
      } catch {
        // ignore
      }
    }

    try {
      const musicContext = {
        state: musicPlayerService.getState(),
        currentTrack: musicPlayerService.getCurrentTrack(),
      };
      const response = await sendChatMessage(
        trimmed,
        messages,
        sessionIdRef.current,
        locationCoords,
        musicContext
      );
      sessionIdRef.current = response.sessionId;

      const assistantMessage: Message = {
        id: `msg_ast_${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const musicCmd = response.musicCommand;

      // Immediate controls: pause and stop execute immediately
      if (musicCmd?.action === 'pause') {
        musicPlayerService.pause();
      } else if (musicCmd?.action === 'stop') {
        musicPlayerService.stop();
      }

      // Playback action (play, resume, next) to execute AFTER assistant finishes spoken confirmation
      // to ensure assistant NEVER speaks over music
      const onSpeechEndMusicAction = () => {
        if (musicCmd?.action === 'play' && musicCmd.track) {
          musicPlayerService.play(musicCmd.track);
        } else if (musicCmd?.action === 'next' && musicCmd.track) {
          musicPlayerService.play(musicCmd.track);
        } else if (musicCmd?.action === 'resume') {
          musicPlayerService.resume();
        } else {
          // If no music command (e.g. weather, normal chat), restore volume if music was ducked
          musicPlayerService.unduck();
        }
      };

      // If voice responses are enabled, synthesize speech
      if (settings.voiceResponsesEnabled) {
        setState('SPEAKING');
        isSpeakingRef.current = true;
        startSpeechSimulation();

        voiceService.speak(
          response.reply,
          {
            voiceURI: settings.selectedVoiceURI,
            rate: settings.speechRate,
            pitch: settings.speechPitch,
          },
          {
            onStart: () => {
              setState('SPEAKING');
              isSpeakingRef.current = true;
              startSpeechSimulation();
            },
            onEnd: () => {
              isSpeakingRef.current = false;
              stopSpeechSimulation();
              setAudioLevel(0);

              // Trigger music action AFTER speech finishes
              onSpeechEndMusicAction();

              // If assistant asked "Which city should I check?", automatically listen for user's city
              if (response.reply.includes('Which city should I check')) {
                setTimeout(() => {
                  startCommandListeningRef.current();
                }, 300);
                return;
              }

              // After Thruv finishes speaking:
              // If Wake Word Mode is enabled -> return automatically to LISTENING_FOR_WAKE_WORD
              // If Wake Word Mode is disabled -> return to IDLE
              if (settings.wakeWordEnabled) {
                // Buffer briefly (250ms) to ensure audio output has fully dispersed
                setTimeout(() => {
                  setState('LISTENING_FOR_WAKE_WORD');
                }, 250);
              } else {
                setState('IDLE');
              }
            },
            onError: (err) => {
              console.warn('Speech synthesis error:', err);
              isSpeakingRef.current = false;
              stopSpeechSimulation();
              setAudioLevel(0);
              onSpeechEndMusicAction();
              if (settings.wakeWordEnabled) {
                setState('LISTENING_FOR_WAKE_WORD');
              } else {
                setState('IDLE');
              }
            },
          }
        );
      } else {
        // Voice responses disabled
        onSpeechEndMusicAction();
        if (settings.wakeWordEnabled) {
          setState('LISTENING_FOR_WAKE_WORD');
        } else {
          setState('IDLE');
        }
      }
    } catch (err: unknown) {
      console.error('Failed to communicate with assistant:', err);
      setState('ERROR');
      const errorMsg = err instanceof Error ? err.message : 'Unknown communication error';
      setStatusMessage(`Error: ${errorMsg}`);
      setTimeout(() => {
        setState(settings.wakeWordEnabled ? 'LISTENING_FOR_WAKE_WORD' : 'IDLE');
      }, 4000);
    }
  }, [messages, settings, startSpeechSimulation, stopSpeechSimulation]);

  // Start listening for user command (captured after wake-word detection or manual mic click)
  const startCommandListening = useCallback(() => {
    // Stop any conflicting audio or wake-word listening
    voiceService.stopWakeWordListening();

    if (settings.soundEffects) {
      voiceService.playChime('activate');
    }

    setState('LISTENING_FOR_COMMAND');
    setStatusMessage("I'm listening...");
    setInterimTranscript('');

    voiceService.startListening({
      onStart: () => {
        setState('LISTENING_FOR_COMMAND');
        if (settings.audioReactivity) {
          voiceService.startAudioAnalysis((level) => {
            setAudioLevel(level);
          });
        }
      },
      onInterim: (interim) => {
        setInterimTranscript(interim);
      },
      onFinal: (finalText) => {
        setInterimTranscript('');
        voiceService.stopListening();
        setAudioLevel(0);
        if (settings.soundEffects) {
          voiceService.playChime('done');
        }
        handleSendMessage(finalText);
      },
      onError: (errMsg) => {
        voiceService.stopListening();
        setAudioLevel(0);
        musicPlayerService.unduck();
        if (errMsg.includes('denied') || errMsg.includes('not-allowed')) {
          setState('ERROR');
          setStatusMessage('Microphone access was denied. Please allow microphone access in your browser settings.');
          setSettings(prev => ({ ...prev, wakeWordEnabled: false }));
          setTimeout(() => {
            setState('IDLE');
          }, 3500);
        } else {
          if (settings.soundEffects && !errMsg.includes('No speech')) {
            voiceService.playChime('alert');
          }
          // On non-fatal speech recognition finish or timeout, return to wake word or idle
          if (settings.wakeWordEnabled) {
            setState('LISTENING_FOR_WAKE_WORD');
          } else {
            setState('IDLE');
          }
        }
      },
      onEnd: () => {
        setAudioLevel(0);
        setState((current) => {
          if (current === 'LISTENING_FOR_COMMAND' || current === 'LISTENING') {
            musicPlayerService.unduck();
            return settings.wakeWordEnabled ? 'LISTENING_FOR_WAKE_WORD' : 'IDLE';
          }
          return current;
        });
      },
    });
  }, [handleSendMessage, settings]);

  useEffect(() => {
    startCommandListeningRef.current = startCommandListening;
  }, [startCommandListening]);

  // Handle Wake Word detection ("Hey Thruv" detected)
  const handleWakeWordDetected = useCallback((matchedPhrase: string, trailingCommand?: string) => {
    // Duck music volume so mic and voice recognition are not disrupted by song audio
    musicPlayerService.duck();

    // 1. Stop the wake-word recognition session
    voiceService.stopWakeWordListening();

    // 2. Play activation chime
    if (settings.soundEffects) {
      voiceService.playChime('activate');
    }

    // 3. If user said command in one breath with the wake word (e.g. "Hey Thruv, what's the weather?")
    const cleanCommand = trailingCommand?.trim();
    if (cleanCommand && cleanCommand.length > 2) {
      setStatusMessage(`Heard: "${cleanCommand}"`);
      handleSendMessage(cleanCommand);
      return;
    }

    // 4. Change AI state to WAKE_WORD_DETECTED
    setState('WAKE_WORD_DETECTED');
    setStatusMessage('Yes?');
    setInterimTranscript('');

    // 5. Speak exactly: "Yes?"
    // Prevent mic from listening to assistant's own speech
    voiceService.speak(
      'Yes?',
      {
        voiceURI: settings.selectedVoiceURI,
        rate: settings.speechRate,
        pitch: settings.speechPitch,
      },
      {
        onStart: () => {
          setState('WAKE_WORD_DETECTED');
          setStatusMessage('Yes?');
        },
        onEnd: () => {
          // 6. After "Yes?" finishes, immediately start listening for the user's command
          startCommandListening();
        },
        onError: () => {
          // Fallback if speech synthesis is interrupted or unsupported
          startCommandListening();
        },
      }
    );
  }, [handleSendMessage, settings, startCommandListening]);

  // Start continuous wake-word listening loop
  const startWakeWordListeningSession = useCallback(() => {
    if (!isEnabled || !settings.wakeWordEnabled) return;
    if (!voiceService.isSpeechRecognitionSupported()) return;
    if (
      isSpeakingRef.current ||
      state === 'THINKING' ||
      state === 'SPEAKING' ||
      state === 'LISTENING_FOR_COMMAND' ||
      state === 'WAKE_WORD_DETECTED'
    ) {
      return;
    }

    voiceService.startWakeWordListening({
      onStart: () => {
        setStatusMessage('Say "Hey Thruv"');
      },
      onWakeWordDetected: (matchedPhrase, trailingCommand) => {
        handleWakeWordDetected(matchedPhrase, trailingCommand);
      },
      onError: (errMsg, fatal) => {
        if (fatal) {
          setSettings(prev => ({ ...prev, wakeWordEnabled: false }));
          setState('ERROR');
          setStatusMessage(errMsg);
          setTimeout(() => {
            setState('IDLE');
          }, 3500);
        } else {
          // Non-fatal notice (such as microphone waiting for first click/gesture in iframe)
          setStatusMessage(errMsg);
        }
      },
    });
  }, [handleWakeWordDetected, isEnabled, settings.wakeWordEnabled, state]);

  // Synchronize wake-word state with settings and assistant state
  useEffect(() => {
    if (!isEnabled) {
      voiceService.stopWakeWordListening();
      if (state === 'LISTENING_FOR_WAKE_WORD') {
        setState('IDLE');
      }
      return;
    }

    if (settings.wakeWordEnabled) {
      if (state === 'IDLE') {
        setState('LISTENING_FOR_WAKE_WORD');
      } else if (state === 'LISTENING_FOR_WAKE_WORD') {
        startWakeWordListeningSession();
      }
    } else {
      voiceService.stopWakeWordListening();
      if (state === 'LISTENING_FOR_WAKE_WORD') {
        setState('IDLE');
      }
    }
  }, [isEnabled, settings.wakeWordEnabled, state, startWakeWordListeningSession]);

  // Ensure wake word starts on user gesture if browser blocked initial autoplay recognition
  useEffect(() => {
    if (!isEnabled || !settings.wakeWordEnabled) return;

    const handleUserInteraction = () => {
      if (
        isEnabled &&
        settings.wakeWordEnabled &&
        !voiceService.isListeningForWakeWord() &&
        (state === 'LISTENING_FOR_WAKE_WORD' || state === 'IDLE') &&
        !isSpeakingRef.current
      ) {
        startWakeWordListeningSession();
      }
    };

    window.addEventListener('click', handleUserInteraction, { passive: true });
    return () => {
      window.removeEventListener('click', handleUserInteraction);
    };
  }, [isEnabled, settings.wakeWordEnabled, startWakeWordListeningSession, state]);

  // Toggle voice listening (manual click / spacebar)
  const toggleListening = useCallback(() => {
    if (state === 'SPEAKING' || state === 'WAKE_WORD_DETECTED') {
      stopSpeaking();
      return;
    }

    if (state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND') {
      voiceService.stopListening();
      setAudioLevel(0);
      setInterimTranscript('');
      setState(settings.wakeWordEnabled ? 'LISTENING_FOR_WAKE_WORD' : 'IDLE');
      return;
    }

    if (state === 'THINKING') {
      // Currently processing request, don't interrupt
      return;
    }

    // Direct manual speech trigger (Preserves 100% of V1 behavior)
    startCommandListening();
  }, [settings.wakeWordEnabled, startCommandListening, state, stopSpeaking]);

  // Replay a specific assistant message
  const replayMessage = useCallback((content: string) => {
    stopSpeaking();
    setState('SPEAKING');
    isSpeakingRef.current = true;
    startSpeechSimulation();

    voiceService.speak(
      content,
      {
        voiceURI: settings.selectedVoiceURI,
        rate: settings.speechRate,
        pitch: settings.speechPitch,
      },
      {
        onStart: () => {
          setState('SPEAKING');
          isSpeakingRef.current = true;
          startSpeechSimulation();
        },
        onEnd: () => {
          isSpeakingRef.current = false;
          stopSpeechSimulation();
          setAudioLevel(0);
          setState(settings.wakeWordEnabled ? 'LISTENING_FOR_WAKE_WORD' : 'IDLE');
        },
        onError: () => {
          isSpeakingRef.current = false;
          stopSpeechSimulation();
          setAudioLevel(0);
          setState(settings.wakeWordEnabled ? 'LISTENING_FOR_WAKE_WORD' : 'IDLE');
        },
      }
    );
  }, [settings, startSpeechSimulation, stopSpeaking, stopSpeechSimulation]);

  // Clear conversation
  const clearConversation = useCallback(async () => {
    voiceService.stopAll();
    musicPlayerService.stop();
    stopSpeechSimulation();
    isSpeakingRef.current = false;
    setMessages([]);
    setState(settings.wakeWordEnabled ? 'LISTENING_FOR_WAKE_WORD' : 'IDLE');
    setInterimTranscript('');
    try {
      const res = await resetSession();
      sessionIdRef.current = res.sessionId;
    } catch {
      sessionIdRef.current = `sess_${Date.now()}`;
    }
  }, [settings.wakeWordEnabled, stopSpeechSimulation]);

  // Music controls for UI interactions
  const toggleMusicPlayPause = useCallback(() => {
    if (musicPlayerService.getState() === 'PLAYING') {
      musicPlayerService.pause();
    } else {
      musicPlayerService.resume();
    }
  }, []);

  const stopMusic = useCallback(() => {
    musicPlayerService.stop();
  }, []);

  const unlockAutoplay = useCallback(() => {
    musicPlayerService.unlockAutoplay();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeechSimulation();
      voiceService.stopAll();
      musicPlayerService.stop();
    };
  }, [stopSpeechSimulation]);

  return {
    state,
    statusMessage,
    interimTranscript,
    audioLevel,
    messages,
    availableVoices,
    settings,
    setSettings,
    toggleListening,
    handleSendMessage,
    replayMessage,
    stopSpeaking,
    clearConversation,
    // Music playback layer
    musicState,
    currentTrack,
    isAutoplayBlocked,
    toggleMusicPlayPause,
    stopMusic,
    unlockAutoplay,
  };
}
