import type { MusicTrack } from '../types/index.ts';

// In-memory queue of candidate tracks from recent searches for "next song" requests
let candidateQueue: MusicTrack[] = [];
let currentTrackIndex = 0;

/**
 * Cleans YouTube video titles for spoken voice synthesis
 * e.g., "Imagine Dragons - Believer (Official Music Video)" -> "Believer by Imagine Dragons" or "Believer"
 */
export function cleanTrackTitle(rawTitle: string): { displayTitle: string; spokenTitle: string } {
  let cleaned = rawTitle
    .replace(/\s*[\(\[]\s*(?:official\s*(?:music\s*)?video|official\s*audio|lyrics?|visualizer|audio|4k|hd|remastered|video|mv)[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*feat\.?.*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*ft\.?.*[\)\]]/gi, '')
    .replace(/\|\s*.*$/g, '')
    .trim();

  // If title is "Artist - Song", parse artist and song
  const dashMatch = cleaned.match(/^([^-]+)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    const artist = dashMatch[1].trim();
    const song = dashMatch[2].trim();
    return {
      displayTitle: `${song} - ${artist}`,
      spokenTitle: `${song} by ${artist}`,
    };
  }

  return {
    displayTitle: cleaned || rawTitle,
    spokenTitle: cleaned || rawTitle,
  };
}

/**
 * Search YouTube for a track or artist without needing an API key
 */
export async function searchYouTube(query: string): Promise<{ track: MusicTrack; queue: MusicTrack[] } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Optimize search terms for music results
  let searchQuery = trimmed;
  const lower = trimmed.toLowerCase();
  if (lower === 'music' || lower === 'some music' || lower === 'a song') {
    searchQuery = 'popular hit songs playlist';
  } else if (!lower.includes('song') && !lower.includes('music') && !lower.includes('track') && !lower.includes('video')) {
    // If user says "Believer" or "Shape of You", YouTube search handles it naturally
    searchQuery = trimmed;
  }

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.warn(`[Music] YouTube search HTTP status ${response.status}`);
      return null;
    }

    const html = await response.text();
    const tracks: MusicTrack[] = [];

    // Attempt 1: Parse ytInitialData JSON
    const jsonMatch =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.+?});/);

    if (jsonMatch && jsonMatch[1]) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const sections =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

        for (const section of sections) {
          const items = section.itemSectionRenderer?.contents || [];
          for (const item of items) {
            if (item.videoRenderer) {
              const vr = item.videoRenderer;
              const id = vr.videoId;
              const rawTitle = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
              const channel = vr.ownerText?.runs?.[0]?.text || '';
              const duration = vr.lengthText?.simpleText || '';

              if (id && rawTitle && typeof id === 'string' && id.length === 11) {
                const { spokenTitle } = cleanTrackTitle(rawTitle);
                tracks.push({
                  id,
                  title: rawTitle,
                  cleanTitle: spokenTitle,
                  channel,
                  duration,
                  url: `https://www.youtube.com/watch?v=${id}`,
                });
              }
            }
          }
        }
      } catch (parseErr) {
        console.warn('[Music] ytInitialData parse failed, falling back to regex:', parseErr);
      }
    }

    // Attempt 2: Fallback regex if ytInitialData yielded nothing
    if (tracks.length === 0) {
      const videoIdMatches = [...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]);
      const uniqueIds = Array.from(new Set(videoIdMatches)).slice(0, 5);

      for (const id of uniqueIds) {
        const titleRegex = new RegExp(`"videoId":"${id}"[\\s\\S]*?"title":\\{"runs":\\[\\{"text":"([^"]+)"`, 'i');
        const titleMatch = html.match(titleRegex);
        const rawTitle = titleMatch ? titleMatch[1] : trimmed;
        const { spokenTitle } = cleanTrackTitle(rawTitle);

        tracks.push({
          id,
          title: rawTitle,
          cleanTitle: spokenTitle,
          url: `https://www.youtube.com/watch?v=${id}`,
        });
      }
    }

    if (tracks.length === 0) {
      console.warn(`[Music] No tracks found for query "${query}"`);
      return null;
    }

    // Store in candidate queue
    candidateQueue = tracks;
    currentTrackIndex = 0;

    return {
      track: tracks[0],
      queue: tracks,
    };
  } catch (err) {
    console.error(`[Music] Error searching YouTube for query "${query}":`, err);
    return null;
  }
}

/**
 * Get next track from candidate queue or search
 */
export async function getNextTrack(currentTrackId?: string, fallbackQuery?: string): Promise<MusicTrack | null> {
  if (candidateQueue.length > 0) {
    // Advance index
    if (currentTrackId) {
      const idx = candidateQueue.findIndex((t) => t.id === currentTrackId);
      if (idx !== -1 && idx + 1 < candidateQueue.length) {
        currentTrackIndex = idx + 1;
        return candidateQueue[currentTrackIndex];
      }
    } else if (currentTrackIndex + 1 < candidateQueue.length) {
      currentTrackIndex++;
      return candidateQueue[currentTrackIndex];
    }
  }

  // If queue exhausted and fallback query exists, search related
  if (fallbackQuery) {
    const result = await searchYouTube(`${fallbackQuery} next song hits`);
    if (result && result.queue.length > 1) {
      return result.queue[1] || result.track;
    }
  }

  return null;
}
