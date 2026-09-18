import React from 'react';
import { Volume2, VolumeX, Settings, Compass, Trash2, Radio, LogOut } from 'lucide-react';
import { AssistantState } from '../types/index.ts';

interface TopNavProps {
  state: AssistantState;
  wakeWordEnabled?: boolean;
  onToggleWakeWord?: () => void;
  voiceResponsesEnabled: boolean;
  onToggleVoiceResponses: () => void;
  onOpenSettings: () => void;
  onOpenRoadmap: () => void;
  onLogout?: () => void;
  username?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  state,
  wakeWordEnabled,
  onToggleWakeWord,
  voiceResponsesEnabled,
  onToggleVoiceResponses,
  onOpenSettings,
  onOpenRoadmap,
  onLogout,
  username,
}) => {
  return (
    <header className="w-full px-6 py-4 z-30 flex items-center justify-between border-b border-white/[0.04] backdrop-blur-md bg-[#05070c]/50">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
              state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND'
                ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)] animate-ping'
                : state === 'WAKE_WORD_DETECTED'
                ? 'bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,1)] animate-pulse'
                : state === 'LISTENING_FOR_WAKE_WORD'
                ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse'
                : state === 'THINKING'
                ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)] animate-pulse'
                : state === 'SPEAKING'
                ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]'
                : state === 'ERROR'
                ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                : 'bg-cyan-500/70 shadow-[0_0_6px_rgba(6,182,212,0.5)]'
            }`}
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-[0.2em] uppercase text-white">
              Karthick AI
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              Voice Assistant • Thruv
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/30 tracking-wider">
            {username ? `User: ${username}` : 'Voice-Only Smart Assistant'}
          </span>
        </div>
      </div>

      {/* Minimal Top-Right Controls */}
      <div className="flex items-center gap-2">
        {/* Quick Wake Word Toggle */}
        {onToggleWakeWord && (
          <button
            id="nav-btn-wake-word-toggle"
            onClick={onToggleWakeWord}
            title={
              wakeWordEnabled
                ? 'Wake Word Mode ACTIVE (Listening for "Hey Thruv") — Click to disable'
                : 'Wake Word Mode OFF — Click to enable hands-free "Hey Thruv"'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              wakeWordEnabled
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]'
                : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70'
            }`}
            aria-label="Toggle Wake Word mode"
          >
            <Radio className={`w-3.5 h-3.5 ${wakeWordEnabled ? 'animate-pulse text-cyan-300' : ''}`} />
            <span className="hidden sm:inline">
              {wakeWordEnabled ? 'Wake Word ON' : 'Wake Word'}
            </span>
          </button>
        )}

        {/* Voice Audio Responses Toggle */}
        <button
          id="nav-btn-voice-toggle"
          onClick={onToggleVoiceResponses}
          title={voiceResponsesEnabled ? 'Voice responses active (Click to mute)' : 'Voice responses muted (Click to enable)'}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            voiceResponsesEnabled
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
              : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70'
          }`}
          aria-label="Toggle voice responses"
        >
          {voiceResponsesEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        {/* System Architecture & Roadmap */}
        <button
          id="nav-btn-roadmap"
          onClick={onOpenRoadmap}
          title="Capabilities & Roadmap"
          className="p-2 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-white/60 hover:text-cyan-300 transition-all cursor-pointer"
          aria-label="View system capabilities and roadmap"
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          id="nav-btn-settings"
          onClick={onOpenSettings}
          title="Assistant Settings"
          className="p-2 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-white/60 hover:text-cyan-300 transition-all cursor-pointer"
          aria-label="Open settings panel"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Lock Terminal / Logout Button */}
        {onLogout && (
          <button
            id="nav-btn-logout"
            onClick={onLogout}
            title="Lock Terminal & Sign Out"
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-white/60 hover:text-rose-300 transition-all cursor-pointer"
            aria-label="Lock terminal and sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

