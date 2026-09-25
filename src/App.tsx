import React, { useState, useEffect } from 'react';
import { AtmosphericBackground } from './components/AtmosphericBackground.tsx';
import { TopNav } from './components/TopNav.tsx';
import { AiCore } from './components/AiCore.tsx';
import { MinimalMusicIndicator } from './components/MinimalMusicIndicator.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { RoadmapModal } from './components/RoadmapModal.tsx';
import { useVoiceAssistant } from './hooks/useVoiceAssistant.ts';

interface AuthUser {
  username: string;
}

export default function App() {
  // Authentication state initialized from localStorage
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('thruv_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username === 'Assistant_AI') {
          return { username: parsed.username };
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  const {
    state,
    statusMessage,
    interimTranscript,
    audioLevel,
    availableVoices,
    settings,
    setSettings,
    toggleListening,
    stopSpeaking,
    musicState,
    currentTrack,
    isAutoplayBlocked,
    toggleMusicPlayPause,
    stopMusic,
    unlockAutoplay,
  } = useVoiceAssistant({ enabled: isAuthenticated });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  // Logout / Lock session
  const handleLogout = () => {
    stopSpeaking();
    stopMusic();
    try {
      localStorage.removeItem('thruv_auth');
    } catch {
      // ignore
    }
    setUser(null);
  };

  // Global hotkeys (Space to toggle voice listening, Esc to close modals or stop speaking)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isRoadmapOpen) setIsRoadmapOpen(false);
        if (state === 'SPEAKING') stopSpeaking();
        return;
      }

      // Check if user is typing in an input (e.g. inside settings search)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.code === 'Space' && !isInput && !isSettingsOpen && !isRoadmapOpen) {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAuthenticated, isRoadmapOpen, isSettingsOpen, state, stopSpeaking, toggleListening]);

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-white selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      {/* Cinematic Atmospheric Background Canvas */}
      <AtmosphericBackground state={isAuthenticated ? state : 'IDLE'} audioLevel={isAuthenticated ? audioLevel : 0} />

      {!isAuthenticated ? (
        /* Secure Terminal Login Screen */
        <LoginPage
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
          }}
        />
      ) : (
        /* Authenticated Voice Assistant Experience */
        <>
          {/* Minimal Top Navigation */}
          <TopNav
            state={state}
            username={user?.username}
            wakeWordEnabled={Boolean(settings.wakeWordEnabled)}
            onToggleWakeWord={() =>
              setSettings(prev => ({
                ...prev,
                wakeWordEnabled: !prev.wakeWordEnabled,
              }))
            }
            voiceResponsesEnabled={settings.voiceResponsesEnabled}
            onToggleVoiceResponses={() =>
              setSettings(prev => ({
                ...prev,
                voiceResponsesEnabled: !prev.voiceResponsesEnabled,
              }))
            }
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenRoadmap={() => setIsRoadmapOpen(true)}
            onLogout={handleLogout}
          />

          {/* Primary Voice Experience Screen */}
          <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto px-4 py-8">
            {/* Central AI Core / Assistant Orb & State Communication */}
            <AiCore
              state={state}
              statusMessage={statusMessage}
              interimTranscript={interimTranscript}
              audioLevel={audioLevel}
              onCoreClick={toggleListening}
            />

            {/* Minimal Music Playback Indicator */}
            <MinimalMusicIndicator
              musicState={musicState}
              currentTrack={currentTrack}
              isAutoplayBlocked={isAutoplayBlocked}
              onTogglePlayPause={toggleMusicPlayPause}
              onStop={stopMusic}
              onUnlockAutoplay={unlockAutoplay}
            />
          </main>

          {/* Voice Assistant Minimal Guidance Footer */}
          <footer className="relative z-10 w-full pb-6 pt-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 text-xs font-mono text-white/30 tracking-wider select-none">
              <span>Say "Hey Jarvis"</span>
              <span className="text-white/10">•</span>
              <span>"Play Believer"</span>
              <span className="text-white/10">•</span>
              <span>Tap Orb or Spacebar to Speak</span>
            </div>
          </footer>

          {/* Modals */}
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onUpdateSettings={setSettings}
            availableVoices={availableVoices}
          />

          <RoadmapModal
            isOpen={isRoadmapOpen}
            onClose={() => setIsRoadmapOpen(false)}
          />
        </>
      )}
    </div>
  );
}
