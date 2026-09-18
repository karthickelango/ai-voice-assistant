import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, Music } from 'lucide-react';
import { MusicState, MusicTrack } from '../types/index.ts';
import { musicPlayerService } from '../services/musicPlayerService.ts';

interface MinimalMusicIndicatorProps {
  musicState: MusicState;
  currentTrack: MusicTrack | null;
  isAutoplayBlocked: boolean;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onUnlockAutoplay: () => void;
}

export const MinimalMusicIndicator: React.FC<MinimalMusicIndicatorProps> = ({
  musicState,
  currentTrack,
  isAutoplayBlocked,
  onTogglePlayPause,
  onStop,
  onUnlockAutoplay,
}) => {
  useEffect(() => {
    // Ensure YouTube player attaches to the container
    musicPlayerService.attachContainer('thruv-youtube-player');
  }, []);

  if (musicState === 'IDLE' && !currentTrack) {
    return (
      <div
        id="thruv-youtube-player"
        className="fixed bottom-0 right-0 w-2 h-2 opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      {/* Hidden container where the YouTube IFrame player attaches */}
      <div
        id="thruv-youtube-player"
        className="fixed bottom-0 right-0 w-2 h-2 opacity-0 pointer-events-none"
        aria-hidden="true"
      />

      <AnimatePresence>
        {musicState !== 'IDLE' && (
          <motion.div
            id="minimal-music-indicator"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-6 flex flex-col items-center z-20"
          >
            <div className="relative group px-4 py-2.5 rounded-full bg-slate-950/80 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_24px_rgba(6,182,212,0.15)] flex items-center gap-3.5 max-w-md">
              {/* Pulsing indicator badge */}
              <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] tracking-widest uppercase">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    musicState === 'PLAYING'
                      ? 'bg-cyan-400 animate-ping'
                      : musicState === 'PAUSED'
                      ? 'bg-amber-400'
                      : musicState === 'LOADING'
                      ? 'bg-sky-400 animate-pulse'
                      : 'bg-rose-400'
                  }`}
                />
                <span
                  className={
                    musicState === 'PLAYING'
                      ? 'text-cyan-300'
                      : musicState === 'PAUSED'
                      ? 'text-amber-300'
                      : musicState === 'LOADING'
                      ? 'text-sky-300'
                      : 'text-rose-300'
                  }
                >
                  {musicState}
                </span>
              </div>

              {/* Vertical divider */}
              <div className="w-px h-3.5 bg-white/10 shrink-0" />

              {/* Musical Note & Song Title */}
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <Music className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span
                  className="text-xs sm:text-sm font-medium text-white/90 truncate tracking-wide max-w-[200px] sm:max-w-[260px]"
                  title={currentTrack?.title}
                >
                  {currentTrack?.cleanTitle || currentTrack?.title || 'Unknown Track'}
                </span>
              </div>

              {/* Autoplay unlock button if browser restricted automatic playback */}
              {isAutoplayBlocked ? (
                <button
                  type="button"
                  id="music-unlock-autoplay-btn"
                  onClick={onUnlockAutoplay}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-[11px] font-mono text-cyan-200 tracking-wider flex items-center gap-1 transition-colors animate-pulse"
                >
                  <Play className="w-3 h-3 fill-cyan-200" />
                  <span>Tap to Play</span>
                </button>
              ) : (
                /* Discreet Play/Pause and Stop Controls */
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    id="music-toggle-play-pause-btn"
                    onClick={onTogglePlayPause}
                    aria-label={musicState === 'PLAYING' ? 'Pause music' : 'Resume music'}
                    className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-cyan-300 transition-colors"
                  >
                    {musicState === 'PLAYING' ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>
                  <button
                    type="button"
                    id="music-stop-btn"
                    onClick={onStop}
                    aria-label="Stop music"
                    className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-rose-400 transition-colors"
                  >
                    <Square className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
