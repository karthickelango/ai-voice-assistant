import type { MusicActionType, MusicContext } from '../types/index.ts';

export interface MusicIntentResult {
  isMusic: boolean;
  action?: MusicActionType;
  query?: string;
  spokenSongTarget?: string;
}

// Phrases that mean music control specifically
const PAUSE_PHRASES = [
  'pause',
  'pause the song',
  'pause the music',
  'pause music',
  'pause playback',
  'pause song',
  'hold the music',
];

const RESUME_PHRASES = [
  'resume',
  'resume the song',
  'resume the music',
  'resume music',
  'resume playback',
  'resume song',
  'continue',
  'continue the music',
  'continue playing',
  'unpause',
  'play again',
];

const STOP_PHRASES = [
  'stop the music',
  'stop music',
  'stop the song',
  'stop song',
  'stop playing',
  'stop playing music',
  'turn off the music',
  'shut off the music',
  'end the music',
];

const NEXT_PHRASES = [
  'next song',
  'next track',
  'skip',
  'skip song',
  'skip this song',
  'skip track',
  'play next song',
  'play the next song',
  'next music',
];

// Disqualifiers: queries that contain "play" but are definitely NOT music requests
const NON_MUSIC_PATTERNS = [
  /\b(?:play\s+a\s+game|play\s+games|play\s+chess|play\s+football|play\s+cricket|play\s+basketball|play\s+tennis|play\s+role)\b/i,
  /\b(?:how\s+to\s+play|rules\s+of|how\s+do\s+you\s+play|can\s+you\s+play\s+with\s+me)\b/i,
  /\b(?:in\s+a\s+theater\s+play|broadway\s+play|stage\s+play|screenplay)\b/i,
  /\b(?:roleplay|fair\s+play|foul\s+play|wordplay)\b/i,
];

/**
 * Detects if a message is a music command or request
 */
export function detectMusicIntent(
  message: string,
  musicContext?: MusicContext
): MusicIntentResult {
  const clean = message
    .trim()
    .toLowerCase()
    .replace(/^hey\s+thruv\s*,?\s*/i, '')
    .replace(/[.!?,]/g, '')
    .trim();
  const isCurrentlyPlaying = musicContext?.state === 'PLAYING';
  const isCurrentlyPaused = musicContext?.state === 'PAUSED';
  const hasActiveMusic = isCurrentlyPlaying || isCurrentlyPaused;

  // 1. Check direct playback controls
  // Check NEXT
  if (NEXT_PHRASES.includes(clean) || clean === 'next' || clean === 'skip') {
    return {
      isMusic: true,
      action: 'next',
    };
  }

  // Check PAUSE
  if (PAUSE_PHRASES.includes(clean) || (clean === 'pause' && hasActiveMusic)) {
    return {
      isMusic: true,
      action: 'pause',
    };
  }

  // Check RESUME
  if (RESUME_PHRASES.includes(clean) || ((clean === 'resume' || clean === 'continue') && isCurrentlyPaused)) {
    return {
      isMusic: true,
      action: 'resume',
    };
  }

  // Check STOP
  if (STOP_PHRASES.includes(clean) || (clean === 'stop' && hasActiveMusic)) {
    return {
      isMusic: true,
      action: 'stop',
    };
  }

  // 2. Guard against non-music phrases containing "play"
  for (const pattern of NON_MUSIC_PATTERNS) {
    if (pattern.test(clean)) {
      return { isMusic: false };
    }
  }

  // 3. Check for natural music playback intents
  // e.g. "I want to listen to Believer", "Listen to Shape of You"
  const listenMatch = message.match(
    /\b(?:i\s+want\s+to\s+listen\s+to|listen\s+to|put\s+on|queue\s+up|play\s+me)\s+(.+)$/i
  );
  if (listenMatch && listenMatch[1]) {
    const rawTarget = listenMatch[1].trim().replace(/[.!?]+$/, '');
    if (rawTarget.length > 0) {
      return {
        isMusic: true,
        action: 'play',
        query: rawTarget,
        spokenSongTarget: extractSpokenTitle(rawTarget),
      };
    }
  }

  // e.g. "Play Believer", "Play Believer by Imagine Dragons", "Play Shape of You",
  // "Play an A.R. Rahman song", "Play some Ilaiyaraaja", "Play music"
  const playMatch = message.match(
    /^(?:hey\s+thruv\s*,?\s*)?(?:please\s+)?play\s+(?:an?\s+|some\s+)?(.+)$/i
  );
  if (playMatch && playMatch[1]) {
    const rawTarget = playMatch[1].trim().replace(/[.!?]+$/, '');
    if (rawTarget.length > 0) {
      return {
        isMusic: true,
        action: 'play',
        query: rawTarget,
        spokenSongTarget: extractSpokenTitle(rawTarget),
      };
    }
  }

  // e.g. "Can you play Believer", "Could you play Believer"
  const canPlayMatch = message.match(
    /\b(?:can|could|would)\s+you\s+(?:please\s+)?play\s+(?:an?\s+|some\s+)?(.+)$/i
  );
  if (canPlayMatch && canPlayMatch[1]) {
    const rawTarget = canPlayMatch[1].trim().replace(/[.!?]+$/, '');
    if (rawTarget.length > 0) {
      return {
        isMusic: true,
        action: 'play',
        query: rawTarget,
        spokenSongTarget: extractSpokenTitle(rawTarget),
      };
    }
  }

  return { isMusic: false };
}

/**
 * Extracts a concise, clean spoken title for speech confirmation:
 * e.g. "an A.R. Rahman song" -> "A.R. Rahman"
 * "some Ilaiyaraaja" -> "Ilaiyaraaja"
 * "Believer by Imagine Dragons" -> "Believer by Imagine Dragons"
 * "music" -> "music"
 */
function extractSpokenTitle(raw: string): string {
  let cleaned = raw.replace(/\b(?:an?\s+|some\s+)/i, '').trim();
  cleaned = cleaned.replace(/\s+(?:song|music|track)$/i, '').trim();
  return cleaned || raw;
}
