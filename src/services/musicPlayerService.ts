import { MusicState, MusicTrack } from '../types/index.ts';

// YouTube IFrame API declarations
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type MusicPlayerListener = (
  state: MusicState,
  currentTrack: MusicTrack | null,
  autoplayBlocked: boolean
) => void;

class MusicPlayerService {
  private player: any = null;
  private isApiReady = false;
  private isPlayerReady = false;
  private state: MusicState = 'IDLE';
  private currentTrack: MusicTrack | null = null;
  private listeners: Set<MusicPlayerListener> = new Set();
  private pendingTrackToPlay: MusicTrack | null = null;
  private isAutoplayBlocked = false;
  private previousVolume = 100;
  private isDucked = false;
  private autoplayCheckTimeout: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadYouTubeIframeAPI();
    }
  }

  public subscribe(listener: MusicPlayerListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.state, this.currentTrack, this.isAutoplayBlocked);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state, this.currentTrack, this.isAutoplayBlocked);
      } catch (err) {
        console.error('[MusicPlayer] Listener error:', err);
      }
    });
  }

  public getState(): MusicState {
    return this.state;
  }

  public getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  public isBlockedByAutoplay(): boolean {
    return this.isAutoplayBlocked;
  }

  private loadYouTubeIframeAPI() {
    if (window.YT && window.YT.Player) {
      this.isApiReady = true;
      return;
    }

    // Assign global callback
    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      this.isApiReady = true;
      if (this.pendingTrackToPlay) {
        this.initializePlayer(this.pendingTrackToPlay);
      }
    };

    // Inject iframe API script if not already present
    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }

  public attachContainer(containerId: string) {
    if (this.isApiReady && !this.player && this.pendingTrackToPlay) {
      this.initializePlayer(this.pendingTrackToPlay, containerId);
    }
  }

  private initializePlayer(track: MusicTrack, containerId = 'thruv-youtube-player') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[MusicPlayer] Container #${containerId} not found yet; will retry on attach.`);
      return;
    }

    try {
      this.player = new window.YT.Player(containerId, {
        height: '120',
        width: '120',
        videoId: track.id,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            this.isPlayerReady = true;
            this.isAutoplayBlocked = false;
            try {
              event.target.setVolume(100);
              event.target.playVideo();
            } catch (err) {
              console.warn('[MusicPlayer] onReady playVideo warning:', err);
            }
          },
          onStateChange: (event: any) => {
            this.handlePlayerStateChange(event.data);
          },
          onError: (event: any) => {
            console.warn('[MusicPlayer] YouTube Player error:', event.data);
            this.state = 'ERROR';
            this.notify();
          },
        },
      });
    } catch (err) {
      console.error('[MusicPlayer] Failed to instantiate YT.Player:', err);
      this.state = 'ERROR';
      this.notify();
    }
  }

  private handlePlayerStateChange(playerState: number) {
    if (this.autoplayCheckTimeout) {
      clearTimeout(this.autoplayCheckTimeout);
      this.autoplayCheckTimeout = null;
    }

    // window.YT.PlayerState
    // -1: UNSTARTED, 0: ENDED, 1: PLAYING, 2: PAUSED, 3: BUFFERING, 5: VIDEO CUED
    switch (playerState) {
      case 1: // PLAYING
        this.state = 'PLAYING';
        this.isAutoplayBlocked = false;
        break;
      case 2: // PAUSED
        this.state = 'PAUSED';
        break;
      case 3: // BUFFERING
        this.state = 'LOADING';
        break;
      case 0: // ENDED
        this.state = 'IDLE';
        break;
      case -1: // UNSTARTED
        // If unstarted for more than 2.5s, autoplay might be blocked by browser policy
        this.autoplayCheckTimeout = window.setTimeout(() => {
          if (this.state === 'LOADING') {
            this.isAutoplayBlocked = true;
            this.notify();
          }
        }, 2500);
        break;
      default:
        break;
    }
    this.notify();
  }

  /**
   * Play a track
   */
  public play(track: MusicTrack): void {
    this.currentTrack = track;
    this.pendingTrackToPlay = track;
    this.state = 'LOADING';
    this.isAutoplayBlocked = false;
    this.notify();

    if (!this.isApiReady || !window.YT || !window.YT.Player) {
      this.loadYouTubeIframeAPI();
      return;
    }

    if (!this.player || !this.isPlayerReady) {
      this.initializePlayer(track);
      return;
    }

    try {
      if (this.isDucked) {
        this.player.setVolume(100);
        this.isDucked = false;
      }
      this.player.loadVideoById(track.id);
      this.player.playVideo();

      // Autoplay blocker guard
      this.autoplayCheckTimeout = window.setTimeout(() => {
        if (this.state === 'LOADING') {
          // If still loading or player unstarted, mark autoplay blocked so user can click to unlock
          this.isAutoplayBlocked = true;
          this.notify();
        }
      }, 3000);
    } catch (err) {
      console.warn('[MusicPlayer] Error during loadVideoById:', err);
      this.isAutoplayBlocked = true;
      this.notify();
    }
  }

  /**
   * Pause music
   */
  public pause(): void {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.pauseVideo();
      } catch (err) {
        console.warn('[MusicPlayer] pause error:', err);
      }
    }
    this.state = 'PAUSED';
    this.notify();
  }

  /**
   * Resume music
   */
  public resume(): void {
    if (this.player && this.isPlayerReady) {
      try {
        if (this.isDucked) {
          this.player.setVolume(100);
          this.isDucked = false;
        }
        this.player.playVideo();
        this.state = 'PLAYING';
      } catch (err) {
        console.warn('[MusicPlayer] resume error:', err);
        this.isAutoplayBlocked = true;
      }
    }
    this.notify();
  }

  /**
   * Stop music
   */
  public stop(): void {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.stopVideo();
      } catch (err) {
        console.warn('[MusicPlayer] stop error:', err);
      }
    }
    this.state = 'IDLE';
    this.currentTrack = null;
    this.pendingTrackToPlay = null;
    this.isAutoplayBlocked = false;
    this.notify();
  }

  /**
   * Lower volume while assistant is listening or speaking to prevent mic feedback
   */
  public duck(): void {
    if (this.player && this.isPlayerReady && this.state === 'PLAYING') {
      try {
        this.previousVolume = this.player.getVolume?.() || 100;
        this.player.setVolume(15);
        this.isDucked = true;
      } catch (err) {
        console.warn('[MusicPlayer] duck error:', err);
      }
    }
  }

  /**
   * Restore volume when assistant finished listening or speaking
   */
  public unduck(): void {
    if (this.player && this.isPlayerReady && this.isDucked) {
      try {
        this.player.setVolume(this.previousVolume || 100);
        this.isDucked = false;
      } catch (err) {
        console.warn('[MusicPlayer] unduck error:', err);
      }
    }
  }

  /**
   * User interaction callback to satisfy browser autoplay restriction if blocked
   */
  public unlockAutoplay(): void {
    this.isAutoplayBlocked = false;
    if (this.player && this.isPlayerReady) {
      try {
        this.player.playVideo();
      } catch (err) {
        console.warn('[MusicPlayer] unlockAutoplay error:', err);
      }
    }
    this.notify();
  }
}

export const musicPlayerService = new MusicPlayerService();
