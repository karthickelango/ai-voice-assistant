import { Message, SystemStatus, MusicCommand, MusicState, MusicTrack } from '../types/index.ts';

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
  musicContext?: { state: MusicState; currentTrack?: MusicTrack | null }
): Promise<{ reply: string; sessionId: string; suggestedActions?: string[]; musicCommand?: MusicCommand }> {
  // Format history for the server
  const formattedHistory = history.map(item => ({
    role: (item.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    parts: [{ text: item.content }]
  }));

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history: formattedHistory,
      sessionId,
      location,
      musicContext: musicContext
        ? {
            state: musicContext.state,
            currentTrack: musicContext.currentTrack
              ? {
                  id: musicContext.currentTrack.id,
                  title: musicContext.currentTrack.title,
                  cleanTitle: musicContext.currentTrack.cleanTitle,
                }
              : undefined,
          }
        : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Communication error' }));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  const data: ChatApiResponse = await response.json();
  return {
    reply: data.reply,
    sessionId: data.sessionId,
    suggestedActions: data.suggestedActions,
    musicCommand: data.musicCommand,
  };
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const response = await fetch('/api/status');
  if (!response.ok) {
    throw new Error('Failed to retrieve system status');
  }
  return response.json();
}

export async function resetSession(): Promise<{ sessionId: string }> {
  const response = await fetch('/api/session/reset', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to reset session');
  }
  return response.json();
}
