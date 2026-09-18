export type AssistantState =
  | 'IDLE'
  | 'LISTENING'
  | 'LISTENING_FOR_WAKE_WORD'
  | 'WAKE_WORD_DETECTED'
  | 'LISTENING_FOR_COMMAND'
  | 'THINKING'
  | 'SPEAKING'
  | 'ERROR';

export type MusicState =
  | 'IDLE'
  | 'LOADING'
  | 'PLAYING'
  | 'PAUSED'
  | 'ERROR';

export type MusicActionType = 'play' | 'pause' | 'resume' | 'stop' | 'next';

export interface MusicTrack {
  id: string; // YouTube videoId
  title: string;
  cleanTitle: string;
  channel?: string;
  duration?: string;
  url: string;
}

export interface MusicCommand {
  action: MusicActionType;
  track?: MusicTrack;
  query?: string;
  message?: string;
}

export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  audioDuration?: number;
}

export interface VoiceSettings {
  wakeWordEnabled: boolean;
  voiceResponsesEnabled: boolean;
  selectedVoiceURI: string;
  speechRate: number;
  speechPitch: number;
  audioReactivity: boolean;
  soundEffects: boolean;
}

export interface SystemStatus {
  assistant: string;
  version: string;
  coreEngine: string;
  status: string;
  roadmap: Array<{
    version: string;
    name: string;
    active: boolean;
  }>;
  futureTools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    status: 'planned' | 'active';
  }>;
}

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
}
