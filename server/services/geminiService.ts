import { GoogleGenAI } from '@google/genai';
import type { ChatRequest, ChatResponse, FutureToolDeclaration } from '../types/index.ts';
import { getCurrentWeather, getWeatherForCity, WeatherData } from './weatherService.ts';
import { detectWeatherIntent, buildConciseWeatherSpeech } from './weatherIntent.ts';
import { searchYouTube, getNextTrack } from './musicService.ts';
import { detectMusicIntent } from './musicIntent.ts';

// Tools architecture - Live Weather & YouTube Music Playback are now ACTIVE
export const FUTURE_TOOLS: FutureToolDeclaration[] = [
  {
    name: 'getWeather',
    description: 'Retrieve live real-time weather and forecast for a given location or coordinates',
    parameters: { type: 'OBJECT', properties: { location: { type: 'STRING' } } },
    status: 'active'
  },
  {
    name: 'playMusic',
    description: 'Search YouTube and stream music or songs requested by the user',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Song name, artist, or genre' }
      },
      required: ['query']
    },
    status: 'active'
  },
  {
    name: 'controlMusic',
    description: 'Control music playback like pause, resume, stop, or next track',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', enum: ['pause', 'resume', 'stop', 'next'] }
      },
      required: ['action']
    },
    status: 'active'
  },
  {
    name: 'searchWeb',
    description: 'Search the live web for breaking information or factual queries',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } } },
    status: 'planned'
  },
  {
    name: 'createReminder',
    description: 'Set a timed reminder or scheduled notification for Karthick',
    parameters: { type: 'OBJECT', properties: { title: { type: 'STRING' }, time: { type: 'STRING' } } },
    status: 'planned'
  },
  {
    name: 'getCalendarEvents',
    description: 'Fetch upcoming schedule and calendar commitments',
    parameters: { type: 'OBJECT', properties: { timeframe: { type: 'STRING' } } },
    status: 'planned'
  },
  {
    name: 'sendEmail',
    description: 'Draft or dispatch an email to a recipient',
    parameters: { type: 'OBJECT', properties: { recipient: { type: 'STRING' }, subject: { type: 'STRING' }, body: { type: 'STRING' } } },
    status: 'planned'
  },
  {
    name: 'addExpense',
    description: 'Log a personal expense or financial transaction',
    parameters: { type: 'OBJECT', properties: { amount: { type: 'NUMBER' }, category: { type: 'STRING' }, note: { type: 'STRING' } } },
    status: 'planned'
  },
  {
    name: 'getExpenses',
    description: 'Summarize or query logged expenses',
    parameters: { type: 'OBJECT', properties: { category: { type: 'STRING' } } },
    status: 'planned'
  },
  {
    name: 'openWebsite',
    description: 'Open a target web URL or application',
    parameters: { type: 'OBJECT', properties: { url: { type: 'STRING' } } },
    status: 'planned'
  },
  {
    name: 'controlSmartHomeDevice',
    description: 'Control smart lighting, thermostat or connected devices',
    parameters: { type: 'OBJECT', properties: { device: { type: 'STRING' }, action: { type: 'STRING' } } },
    status: 'planned'
  }
];

const SYSTEM_INSTRUCTION = `You are Karthick's personal AI voice assistant.

Your assistant system identity is Karthick AI, and your wake name is Thruv.
The user speaks to you by saying "Hey Thruv".
When awakened, you acknowledge with "Yes?".

Personality and Voice Characteristics:
- Female voice, friendly, intelligent, natural, concise, and helpful.
- Speak in a natural conversational tone tailored for voice synthesis.
- Keep answers concise (typically 1 to 3 spoken sentences) so they are enjoyable and effortless to listen to.
- Explain concepts clearly without unnecessary jargon or monologue.
- Never invent real-time weather information: live weather is handled directly by the real weather tool.
- If a capability is not yet implemented (like email sending or smart home devices), courteously let Karthick know it is on the roadmap.`;

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Multi-model resilience pool for high availability
// If a model encounters a 503 high-demand spike or 429 rate limit, the service seamlessly falls back
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

interface ContentPart {
  text: string;
}

interface ContentItem {
  role: 'user' | 'model';
  parts: ContentPart[];
}

async function callGeminiWithFailover(
  ai: GoogleGenAI,
  contents: ContentItem[]
): Promise<{ text: string; modelUsed: string }> {
  let lastError: unknown = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
            topP: 0.9,
          },
        });

        const replyText = response.text?.trim();
        if (replyText) {
          return { text: replyText, modelUsed: model };
        }
      } catch (err: unknown) {
        lastError = err;
        const errObj = err as Record<string, unknown>;
        const errMessage = err instanceof Error ? err.message : String(err);
        const isTransient =
          errObj.status === 503 ||
          errObj.status === 429 ||
          errMessage.includes('503') ||
          errMessage.includes('high demand') ||
          errMessage.includes('UNAVAILABLE') ||
          errMessage.includes('Resource exhausted');

        console.warn(`[Gemini Resiliency] Model "${model}" attempt ${attempt + 1} failed: ${errMessage}`);

        // If transient spike and first attempt, wait briefly before retrying
        if (isTransient && attempt === 0) {
          await new Promise((res) => setTimeout(res, 500));
          continue;
        }

        // Otherwise move to next candidate model immediately
        break;
      }
    }
  }

  throw lastError || new Error('All candidate models in the failover pool were exhausted.');
}

export async function generateAssistantReply(request: ChatRequest): Promise<ChatResponse> {
  const { message, history = [], sessionId = `session_${Date.now()}`, location } = request;

  // 1. Detect and handle real live weather tool requests
  const weatherIntent = detectWeatherIntent(message, history);

  if (weatherIntent.isWeather) {
    try {
      let weatherData: WeatherData | null = null;

      if (weatherIntent.city) {
        // User provided or answered with a city
        try {
          weatherData = await getWeatherForCity(weatherIntent.city);
        } catch (cityErr) {
          console.warn(`[Weather] Could not find city "${weatherIntent.city}":`, cityErr);
          return {
            reply: `I couldn't find weather for ${weatherIntent.city}. Which city should I check?`,
            sessionId,
          };
        }
      } else if (
        location &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number' &&
        !isNaN(location.latitude) &&
        !isNaN(location.longitude)
      ) {
        // Coordinates provided via browser geolocation
        try {
          weatherData = await getCurrentWeather(location.latitude, location.longitude);
        } catch (geoErr) {
          console.warn('[Weather] Coordinates weather lookup failed:', geoErr);
          return {
            reply: 'Which city should I check?',
            sessionId,
          };
        }
      } else {
        // No city and no browser geolocation -> ask user for city
        return {
          reply: 'Which city should I check?',
          sessionId,
        };
      }

      if (weatherData) {
        const defaultSpeech = buildConciseWeatherSpeech(weatherData, message);

        if (process.env.GEMINI_API_KEY) {
          try {
            const ai = getAiClient();
            const formatPrompt: ContentItem[] = [
              {
                role: 'user',
                parts: [
                  {
                    text: `You are Thruv, Karthick's personal AI voice assistant.
The user asked: "${message}".
Here is the VERIFIED REAL-TIME LIVE WEATHER DATA:
- Location: ${weatherData.city || 'local area'}
- Temperature: ${weatherData.temperatureCelsius}°C (Feels like: ${weatherData.apparentTemperatureCelsius}°C)
- Condition: ${weatherData.conditionDescription}
- Humidity: ${weatherData.humidity}%
- Currently Raining: ${weatherData.isRaining ? 'Yes' : 'No'}
- Chance of rain today: ${weatherData.precipitationProbabilityMax ?? 0}%
- Wind Speed: ${weatherData.windSpeedKmh} km/h

Instruction:
Respond directly to the user in 1 or 2 concise, natural spoken sentences.
STRICT RULE: Do NOT invent numbers or conditions. Only speak the real data provided above. Be conversational and clear for female speech synthesis.`,
                  },
                ],
              },
            ];
            const { text: geminiFormatted } = await callGeminiWithFailover(ai, formatPrompt);
            if (geminiFormatted && geminiFormatted.length > 10 && geminiFormatted.length < 320) {
              return {
                reply: geminiFormatted,
                sessionId,
              };
            }
          } catch (formatErr) {
            console.warn('[Weather] Gemini formatting fallback:', formatErr);
          }
        }

        return {
          reply: defaultSpeech,
          sessionId,
        };
      }
    } catch (weatherErr) {
      console.error('[Weather] Unexpected error handling weather intent:', weatherErr);
      return {
        reply: "I'm having trouble getting the latest weather right now.",
        sessionId,
      };
    }
  }

  // 2. Detect and handle YouTube music tool requests & playback controls
  const musicIntent = detectMusicIntent(message, request.musicContext);

  if (musicIntent.isMusic) {
    if (musicIntent.action === 'pause') {
      return {
        reply: 'Paused.',
        sessionId,
        musicCommand: { action: 'pause' },
      };
    }

    if (musicIntent.action === 'resume') {
      return {
        reply: 'Resuming.',
        sessionId,
        musicCommand: { action: 'resume' },
      };
    }

    if (musicIntent.action === 'stop') {
      return {
        reply: 'Stopping the music.',
        sessionId,
        musicCommand: { action: 'stop' },
      };
    }

    if (musicIntent.action === 'next') {
      try {
        const nextTrack = await getNextTrack(
          request.musicContext?.currentTrack?.id,
          request.musicContext?.currentTrack?.cleanTitle
        );
        if (nextTrack) {
          return {
            reply: 'Playing next song.',
            sessionId,
            musicCommand: { action: 'next', track: nextTrack },
          };
        }
        return {
          reply: 'There are no more songs in the queue.',
          sessionId,
        };
      } catch (nextErr) {
        console.warn('[Music] Error skipping track:', nextErr);
        return {
          reply: 'Music search is unavailable right now.',
          sessionId,
        };
      }
    }

    if (musicIntent.action === 'play') {
      const query = musicIntent.query || 'music';
      try {
        const result = await searchYouTube(query);
        if (!result || !result.track) {
          return {
            reply: "I couldn't find that song.",
            sessionId,
          };
        }

        const spokenTarget = musicIntent.spokenSongTarget || result.track.cleanTitle;
        return {
          reply: `Playing ${spokenTarget}.`,
          sessionId,
          musicCommand: {
            action: 'play',
            track: result.track,
            query,
          },
        };
      } catch (musicErr) {
        console.error('[Music] Unexpected error in search:', musicErr);
        return {
          reply: 'Music search is unavailable right now.',
          sessionId,
        };
      }
    }
  }

  // 3. Standard Gemini AI response for general inquiries
  if (!process.env.GEMINI_API_KEY) {
    return {
      reply: "I am ready, but my Gemini API key has not been configured in the environment yet. Please verify your API key in the AI Studio settings.",
      sessionId,
      suggestedActions: ["What can you do?", "Tell me about Karthick AI"]
    };
  }

  try {
    const ai = getAiClient();

    // Prepare contents array preserving conversation context
    const contents: ContentItem[] = [];

    // Append prior history (capped to last 10 turns to maintain responsiveness and avoid overflow)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const item of recentHistory) {
        if (item && item.role && Array.isArray(item.parts) && item.parts.length > 0) {
          contents.push({
            role: item.role,
            parts: item.parts.map(p => ({ text: String(p.text || '') }))
          });
        }
      }
    }

    // Append the latest user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const { text: replyText } = await callGeminiWithFailover(ai, contents);

    return {
      reply: replyText || "I heard you, but I wasn't able to form a response. Could you please repeat that?",
      sessionId,
    };
  } catch (error: unknown) {
    console.error('Error generating response with Gemini after all failovers:', error);
    
    // Provide a graceful spoken-friendly response for errors
    return {
      reply: "I encountered a momentary connection difficulty with the intelligence network. Please ask me again in just a moment.",
      sessionId,
      suggestedActions: ["Try asking again", "What is JavaScript?"]
    };
  }
}
