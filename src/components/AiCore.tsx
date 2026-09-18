import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { AssistantState } from '../types/index.ts';

interface AiCoreProps {
  state: AssistantState;
  statusMessage: string;
  interimTranscript: string;
  audioLevel: number;
  onCoreClick: () => void;
}

export const AiCore: React.FC<AiCoreProps> = ({
  state,
  statusMessage,
  interimTranscript,
  audioLevel,
  onCoreClick,
}) => {
  // Audio reactivity scale for listening/speaking
  const dynamicScale = useMemo(() => {
    if (state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND') {
      return 1 + audioLevel * 0.18;
    }
    if (state === 'WAKE_WORD_DETECTED') {
      return 1.12;
    }
    if (state === 'SPEAKING') {
      return 1 + audioLevel * 0.14;
    }
    return 1;
  }, [state, audioLevel]);

  // Ring 1 (outermost reactive audio ripple ring)
  const outerRingScale = useMemo(() => {
    if (state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND') return 1.25 + audioLevel * 0.35;
    if (state === 'WAKE_WORD_DETECTED') return 1.28;
    if (state === 'SPEAKING') return 1.2 + audioLevel * 0.25;
    if (state === 'THINKING') return 1.15;
    if (state === 'LISTENING_FOR_WAKE_WORD') return 1.12;
    return 1.08;
  }, [state, audioLevel]);

  // Color scheme based on state
  const colors = useMemo(() => {
    switch (state) {
      case 'WAKE_WORD_DETECTED':
        return {
          glow: 'rgba(34, 211, 238, 0.7)',
          coreFrom: '#a5f3fc',
          coreMid: '#22d3ee',
          coreTo: '#0284c7',
          ringBorder: 'rgba(103, 232, 249, 0.75)',
          accentText: 'text-cyan-200',
        };
      case 'LISTENING_FOR_COMMAND':
      case 'LISTENING':
        return {
          glow: 'rgba(6, 182, 212, 0.5)',
          coreFrom: '#22d3ee',
          coreMid: '#0891b2',
          coreTo: '#0369a1',
          ringBorder: 'rgba(34, 211, 238, 0.5)',
          accentText: 'text-cyan-400',
        };
      case 'LISTENING_FOR_WAKE_WORD':
        return {
          glow: 'rgba(6, 182, 212, 0.35)',
          coreFrom: '#38bdf8',
          coreMid: '#0891b2',
          coreTo: '#0f2b48',
          ringBorder: 'rgba(56, 189, 248, 0.35)',
          accentText: 'text-cyan-300',
        };
      case 'THINKING':
        return {
          glow: 'rgba(99, 102, 241, 0.45)',
          coreFrom: '#38bdf8',
          coreMid: '#6366f1',
          coreTo: '#4338ca',
          ringBorder: 'rgba(129, 140, 248, 0.45)',
          accentText: 'text-sky-300',
        };
      case 'SPEAKING':
        return {
          glow: 'rgba(14, 165, 233, 0.45)',
          coreFrom: '#67e8f9',
          coreMid: '#0284c7',
          coreTo: '#0f172a',
          ringBorder: 'rgba(56, 189, 248, 0.4)',
          accentText: 'text-cyan-300',
        };
      case 'ERROR':
        return {
          glow: 'rgba(244, 63, 94, 0.35)',
          coreFrom: '#fb7185',
          coreMid: '#e11d48',
          coreTo: '#881337',
          ringBorder: 'rgba(251, 113, 133, 0.4)',
          accentText: 'text-rose-400',
        };
      case 'IDLE':
      default:
        return {
          glow: 'rgba(6, 182, 212, 0.25)',
          coreFrom: '#06b6d4',
          coreMid: '#0e7490',
          coreTo: '#082f49',
          ringBorder: 'rgba(6, 182, 212, 0.25)',
          accentText: 'text-cyan-400/90',
        };
    }
  }, [state]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCoreClick();
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center my-6 select-none">
      {/* Central Interactive Orb Anchor */}
      <div
        id="karthick-ai-core"
        role="button"
        tabIndex={0}
        aria-label={`Thruv AI Core. Current status: ${state}. Click or press space to ${
          state === 'LISTENING' ? 'stop listening' : state === 'SPEAKING' ? 'stop speaking' : 'start listening'
        }`}
        onClick={onCoreClick}
        onKeyDown={handleKeyDown}
        className="relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 rounded-full transition-transform active:scale-95"
      >
        {/* Outermost Atmospheric Glow */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: state === 'LISTENING' ? [0.4, 0.7, 0.4] : [0.25, 0.38, 0.25],
          }}
          transition={{
            duration: state === 'LISTENING' ? 1.8 : 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -inset-16 rounded-full blur-3xl pointer-events-none transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          }}
        />

        {/* Audio Reactive Outer Ring */}
        <motion.div
          animate={{
            scale: outerRingScale,
            opacity: state === 'LISTENING' || state === 'SPEAKING' ? 0.75 : 0.35,
          }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 24,
          }}
          className="absolute -inset-8 rounded-full border border-dashed pointer-events-none transition-colors duration-500"
          style={{
            borderColor: colors.ringBorder,
            borderWidth: '1px',
          }}
        />

        {/* Outer Orbit Gyroscopic Rings */}
        <motion.div
          animate={{
            rotate: state === 'THINKING' ? 360 : 180,
          }}
          transition={{
            duration: state === 'THINKING' ? 6 : 28,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -inset-5 rounded-full border border-cyan-500/20 pointer-events-none"
        >
          {/* Subtle orbital markers */}
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full bg-cyan-400/50" />
        </motion.div>

        {/* Inner Counter-Rotating Precision Ring (active during thinking) */}
        <motion.div
          animate={{
            rotate: state === 'THINKING' ? -360 : -90,
          }}
          transition={{
            duration: state === 'THINKING' ? 8 : 40,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -inset-2 rounded-full border border-dotted border-cyan-400/30 pointer-events-none"
        />

        {/* Core Sphere Container */}
        <motion.div
          animate={{
            scale: dynamicScale,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }}
          className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full p-1.5 shadow-2xl flex items-center justify-center backdrop-blur-md overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, rgba(8,15,30,0.85) 60%, rgba(2,6,23,0.95) 100%)',
            boxShadow: `0 0 45px -10px ${colors.glow}, inset 0 0 35px rgba(255,255,255,0.08)`,
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Atmospheric Inner Fluid/Luminous Core */}
          <motion.div
            animate={{
              rotate: state === 'THINKING' ? [0, 360] : [0, 180, 0],
              scale: state === 'IDLE' ? [0.94, 1.02, 0.94] : [0.98, 1.04, 0.98],
            }}
            transition={{
              rotate: {
                duration: state === 'THINKING' ? 4 : 18,
                repeat: Infinity,
                ease: 'linear',
              },
              scale: {
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
            className="w-full h-full rounded-full transition-all duration-700 opacity-90 blur-[2px]"
            style={{
              background: `radial-gradient(circle at 45% 45%, ${colors.coreFrom} 0%, ${colors.coreMid} 45%, ${colors.coreTo} 85%)`,
            }}
          />

          {/* Holographic Concentric Depth Rings inside Core */}
          <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none" />
          <div className="absolute inset-8 rounded-full border border-cyan-300/15 pointer-events-none" />
          <div className="absolute inset-12 rounded-full border border-cyan-300/10 pointer-events-none" />

          {/* Inner Light Flare / Specular Highlight */}
          <div className="absolute top-4 left-6 w-16 h-8 rounded-full bg-white/20 blur-md transform -rotate-25 pointer-events-none" />

          {/* Center Visual Icon / Status Graphic */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <motion.div
              animate={{
                scale: state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND' || state === 'WAKE_WORD_DETECTED' ? [1, 1.15, 1] : 1,
                opacity: state === 'THINKING' ? [0.5, 1, 0.5] : 1,
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white shadow-lg transition-transform group-hover:scale-110"
            >
              {state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND' ? (
                <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300 animate-pulse" />
              ) : state === 'WAKE_WORD_DETECTED' ? (
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-200 animate-pulse" />
              ) : state === 'THINKING' ? (
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-sky-200" />
              ) : state === 'SPEAKING' ? (
                <Volume2 className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300" />
              ) : state === 'ERROR' ? (
                <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-rose-300" />
              ) : state === 'LISTENING_FOR_WAKE_WORD' ? (
                <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300/90" />
              ) : (
                <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-100/80 group-hover:text-cyan-300 transition-colors" />
              )}
            </motion.div>

            {/* Subtle tap cue */}
            <span className="mt-2 text-[10px] tracking-widest uppercase font-mono text-cyan-100/60 group-hover:text-cyan-200 transition-colors">
              {state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND'
                ? 'Listening'
                : state === 'WAKE_WORD_DETECTED'
                ? 'Awake'
                : state === 'LISTENING_FOR_WAKE_WORD'
                ? 'Wake Word Active'
                : state === 'THINKING'
                ? 'Thinking'
                : state === 'SPEAKING'
                ? 'Tap to Mute'
                : 'Tap to Speak'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Cinematic State Microcopy */}
      <div className="mt-8 flex flex-col items-center text-center px-4 max-w-lg z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND'
                ? 'bg-cyan-400 animate-ping'
                : state === 'WAKE_WORD_DETECTED'
                ? 'bg-cyan-300 animate-pulse'
                : state === 'LISTENING_FOR_WAKE_WORD'
                ? 'bg-sky-400/80 animate-pulse'
                : state === 'THINKING'
                ? 'bg-sky-400 animate-pulse'
                : state === 'SPEAKING'
                ? 'bg-cyan-300 animate-bounce'
                : state === 'ERROR'
                ? 'bg-rose-500'
                : 'bg-cyan-400/60'
            }`}
          />
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-white/40">
            {state === 'LISTENING_FOR_WAKE_WORD'
              ? 'WAKE WORD ACTIVE'
              : state === 'WAKE_WORD_DETECTED'
              ? 'ACTIVATED'
              : state === 'LISTENING_FOR_COMMAND'
              ? 'LISTENING'
              : state}
          </span>
        </div>

        {/* Live Interim Transcript or State Microcopy */}
        <AnimatePresence mode="wait">
          {interimTranscript ? (
            <motion.div
              key="interim"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="px-4 py-2 rounded-full bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md"
            >
              <p className="text-sm sm:text-base text-cyan-200 font-light tracking-wide italic">
                "{interimTranscript}..."
              </p>
            </motion.div>
          ) : (
            <motion.p
              key={statusMessage}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`text-base sm:text-lg font-light tracking-wide transition-colors ${
                state === 'ERROR' ? 'text-rose-300' : 'text-white/90'
              }`}
            >
              {statusMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Audio Waveform Bars (During speaking or listening) */}
        {(state === 'LISTENING' || state === 'LISTENING_FOR_COMMAND' || state === 'SPEAKING') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 mt-4"
          >
            {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 0.3].map((multiplier, idx) => {
              const barHeight = Math.max(4, Math.min(24, audioLevel * 30 * multiplier));
              return (
                <span
                  key={idx}
                  className="w-1 rounded-full bg-cyan-400/80 transition-all duration-75"
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};
