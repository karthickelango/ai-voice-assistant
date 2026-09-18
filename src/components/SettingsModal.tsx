import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Sliders, Sparkles, CheckCircle2, Play, RefreshCw, Mic, MapPin, ShieldCheck } from 'lucide-react';
import { VoiceSettings, VoiceOption } from '../types/index.ts';
import { voiceService, selectPreferredFemaleVoice, isFemaleVoice, isMaleVoice } from '../services/voiceService.ts';
import { checkCurrentPermissions, requestMicrophoneAccess, requestLocationAccess } from '../services/permissionService.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: VoiceSettings) => void;
  availableVoices: VoiceOption[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  availableVoices,
}) => {
  const [testPlaying, setTestPlaying] = useState(false);
  const [permStatus, setPermStatus] = useState<{ mic: string; loc: string }>({ mic: 'prompt', loc: 'prompt' });
  const [isCalibrating, setIsCalibrating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkCurrentPermissions().then((res) => {
        setPermStatus({ mic: res.microphone, loc: res.location });
      });
    }
  }, [isOpen]);

  const handleRecalibratePermissions = async () => {
    setIsCalibrating(true);
    await requestMicrophoneAccess();
    await requestLocationAccess();
    const updated = await checkCurrentPermissions();
    setPermStatus({ mic: updated.microphone, loc: updated.location });
    setIsCalibrating(false);
  };

  if (!isOpen) return null;

  const handleTestVoice = () => {
    setTestPlaying(true);
    voiceService.speak(
      "Hello Karthick, I am Thruv. Here is how I sound.",
      {
        voiceURI: settings.selectedVoiceURI,
        rate: settings.speechRate,
        pitch: settings.speechPitch,
      },
      {
        onEnd: () => setTestPlaying(false),
        onError: () => setTestPlaying(false),
      }
    );
  };

  const sortedVoices = useMemo(() => {
    return [...availableVoices].sort((a, b) => {
      const aFemale = isFemaleVoice(a.name);
      const bFemale = isFemaleVoice(b.name);
      if (aFemale && !bFemale) return -1;
      if (!aFemale && bFemale) return 1;
      const aMale = isMaleVoice(a.name);
      const bMale = isMaleVoice(b.name);
      if (!aMale && bMale) return -1;
      if (aMale && !bMale) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [availableVoices]);

  const handleSetBestFemaleVoice = () => {
    const bestFemale = selectPreferredFemaleVoice(availableVoices);
    if (bestFemale) {
      onUpdateSettings({
        ...settings,
        selectedVoiceURI: bestFemale.voiceURI,
        speechPitch: Math.max(settings.speechPitch, 1.15),
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-2xl bg-[#080d19] border border-white/10 p-6 shadow-2xl text-white max-h-[88vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-medium tracking-wide">Assistant Configuration</h3>
                <p className="text-xs font-mono text-white/40">Karthick AI Settings</p>
              </div>
            </div>

            <button
              id="settings-btn-close"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {/* V2 Feature: Wake Word Mode Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
              <div className="flex flex-col pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Wake Word Mode</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    V2.1
                  </span>
                </div>
                <span className="text-xs text-white/60 mt-1">
                  Say <strong className="text-cyan-300 font-mono font-medium">"Hey Thruv"</strong> for continuous hands-free activation. Assistant answers "Yes?" and listens for your command.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  id="settings-wake-word-enabled"
                  checked={Boolean(settings.wakeWordEnabled)}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, wakeWordEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            {/* Voice Responses Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white/90">Voice Responses</span>
                <span className="text-xs text-white/40">Speak answers automatically aloud</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="settings-voice-enabled"
                  checked={settings.voiceResponsesEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, voiceResponsesEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            {/* Voice Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="settings-voice-select" className="text-xs font-mono uppercase tracking-wider text-white/60">
                    Voice (Female Preferred)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="settings-reset-female-voice"
                    onClick={handleSetBestFemaleVoice}
                    className="flex items-center gap-1 text-[11px] font-mono text-pink-300 hover:text-pink-200 transition-colors cursor-pointer"
                    title="Auto-select highest quality female voice"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Auto Female
                  </button>
                  <span className="text-white/20">•</span>
                  <button
                    type="button"
                    id="settings-test-voice"
                    onClick={handleTestVoice}
                    disabled={testPlaying}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Play className="w-3 h-3" />
                    {testPlaying ? 'Playing...' : 'Test Voice'}
                  </button>
                </div>
              </div>

              <select
                id="settings-voice-select"
                value={settings.selectedVoiceURI}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, selectedVoiceURI: e.target.value })
                }
                className="w-full bg-[#0d1424] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/90 focus:outline-none focus:border-cyan-400/60"
              >
                {sortedVoices.length === 0 ? (
                  <option value="">Default System Female Voice</option>
                ) : (
                  sortedVoices.map((v) => {
                    const female = isFemaleVoice(v.name);
                    const male = isMaleVoice(v.name);
                    const prefix = female ? '🌸 [Female] ' : male ? '👤 [Male] ' : '';
                    return (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {prefix}{v.name} ({v.lang})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Speech Rate & Pitch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/70">Pacing (Rate)</span>
                  <span className="text-xs font-mono text-cyan-400">{settings.speechRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  id="settings-speech-rate"
                  min="0.7"
                  max="1.4"
                  step="0.1"
                  value={settings.speechRate}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, speechRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/70">Modulation (Pitch)</span>
                  <span className="text-xs font-mono text-cyan-400">{settings.speechPitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  id="settings-speech-pitch"
                  min="0.8"
                  max="1.3"
                  step="0.1"
                  value={settings.speechPitch}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, speechPitch: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Visual Reactivity & Sound Chimes */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white/90">Audio Reactivity</span>
                  <span className="text-xs text-white/40">Pulsing orb rings respond to microphone and speech volume</span>
                </div>
                <input
                  type="checkbox"
                  id="settings-reactivity-toggle"
                  checked={settings.audioReactivity}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, audioReactivity: e.target.checked })
                  }
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white/90">Activation Sound Cues</span>
                  <span className="text-xs text-white/40">Play subtle futuristic synth chimes on activation</span>
                </div>
                <input
                  type="checkbox"
                  id="settings-sound-cues"
                  checked={settings.soundEffects}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, soundEffects: e.target.checked })
                  }
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Hardware & System Permissions */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Hardware & Sensors
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-recalibrate-permissions"
                  onClick={handleRecalibratePermissions}
                  disabled={isCalibrating}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-950/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isCalibrating ? 'animate-spin' : ''}`} />
                  <span>{isCalibrating ? 'Testing...' : 'Test / Request Access'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-black/20 border border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/70">
                    <Mic className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Microphone</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      permStatus.mic === 'granted'
                        ? 'text-emerald-400'
                        : permStatus.mic === 'denied'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {permStatus.mic}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/20 border border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/70">
                    <MapPin className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Location</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      permStatus.loc === 'granted'
                        ? 'text-emerald-400'
                        : permStatus.loc === 'denied'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {permStatus.loc}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Theme Info */}
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-200">Theme Profile</span>
              </div>
              <span className="text-xs font-mono text-white/50">Cinematic Dark Obsidian</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
