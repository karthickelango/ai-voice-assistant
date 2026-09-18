export type Role = 'user' | 'model' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

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

export interface MusicContext {
  state?: 'IDLE' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'ERROR';
  currentTrack?: {
    id: string;
    title: string;
    cleanTitle?: string;
  };
}

export interface ChatRequest {
  message: string;
  history?: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  sessionId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  musicContext?: MusicContext;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  suggestedActions?: string[];
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  musicCommand?: MusicCommand;
}

export interface FutureToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  status: 'planned' | 'active';
}
