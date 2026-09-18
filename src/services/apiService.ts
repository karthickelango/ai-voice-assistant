import api from '../../services/api.ts';
import {
  Message,
  SystemStatus,
  MusicCommand,
  MusicState,
  MusicTrack,
} from '../types/index.ts';

interface ChatApiResponse {
  reply: string;
  sessionId: string;
  suggestedActions?: string[];
  musicCommand?: MusicCommand;
  error?: string;
}

export async function sendChatMessage(
  message: string,
  history: Message[],
  sessionId?: string,
  location?: { latitude: number; longitude: number },
  musicContext?: {
    state: MusicState;
    currentTrack?: MusicTrack | null;
  }
): Promise<{
  reply: string;
  sessionId: string;
  suggestedActions?: string[];
  musicCommand?: MusicCommand;
}> {
  // Format history for the server
  const formattedHistory = history.map((item) => ({
    role: (item.role === 'user'
      ? 'user'
      : 'model') as 'user' | 'model',
    parts: [{ text: item.content }],
  }));

  try {
    const response = await api.post<ChatApiResponse>(
      '/chat',
      {
        message,
        history: formattedHistory,
        sessionId,
        location,
        musicContext: musicContext
          ? {
              state: musicContext.state,
              currentTrack:
                musicContext.currentTrack
                  ? {
                      id: musicContext.currentTrack.id,
                      title:
                        musicContext.currentTrack.title,
                      cleanTitle:
                        musicContext.currentTrack
                          .cleanTitle,
                    }
                  : undefined,
            }
          : undefined,
      }
    );

    const data = response.data;

    return {
      reply: data.reply,
      sessionId: data.sessionId,
      suggestedActions:
        data.suggestedActions,
      musicCommand: data.musicCommand,
    };
  } catch (error: any) {
    console.error(
      'Failed to communicate with assistant:',
      error
    );

    throw new Error(
      error.response?.data?.error ||
        error.message ||
        'Communication error'
    );
  }
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const response =
      await api.get<SystemStatus>('/status');

    return response.data;
  } catch (error: any) {
    console.error(
      'Failed to retrieve system status:',
      error
    );

    throw new Error(
      error.response?.data?.error ||
        error.message ||
        'Failed to retrieve system status'
    );
  }
}

export async function resetSession(): Promise<{
  sessionId: string;
}> {
  try {
    const response =
      await api.post<{ sessionId: string }>(
        '/session/reset'
      );

    return response.data;
  } catch (error: any) {
    console.error(
      'Failed to reset session:',
      error
    );

    throw new Error(
      error.response?.data?.error ||
        error.message ||
        'Failed to reset session'
    );
  }
}