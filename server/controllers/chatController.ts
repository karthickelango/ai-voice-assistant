import { Request, Response } from 'express';
import { generateAssistantReply, FUTURE_TOOLS } from '../services/geminiService.ts';
import type { ChatRequest } from '../types/index.ts';

// Simple in-memory rate limiting map (timestamp per IP)
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  validTimestamps.push(now);
  requestTimestamps.set(ip, validTimestamps);
  return false;
}

export async function handleChatMessage(req: Request, res: Response): Promise<void> {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || 'anonymous';
    
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        error: 'Too many requests. Please pause for a moment before speaking again.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
      return;
    }

    const { message, history, sessionId, location, musicContext } = req.body as ChatRequest;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        error: 'Message text is required and cannot be empty.',
        code: 'INVALID_REQUEST'
      });
      return;
    }

    const sanitizedMessage = message.trim().slice(0, 1500); // Guard against giant payload attacks

    const result = await generateAssistantReply({
      message: sanitizedMessage,
      history: Array.isArray(history) ? history : [],
      sessionId: typeof sessionId === 'string' ? sessionId : `sess_${Date.now()}`,
      location: location && typeof location.latitude === 'number' && typeof location.longitude === 'number'
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined,
      musicContext: musicContext && typeof musicContext === 'object' ? musicContext : undefined,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Unhandled error in chat controller:', error);
    // Never expose stack trace to client
    res.status(500).json({
      error: 'An internal error occurred in the assistant service.',
      code: 'SERVER_ERROR'
    });
  }
}

export function handleHealthCheck(req: Request, res: Response): void {
  res.json({
    status: 'online',
    assistant: 'Karthick AI',
    wakeName: 'Thruv',
    version: '2.2.0',
    model: 'gemini-3.6-flash',
    voiceProvider: 'browser-speech-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}

export function handleGetSystemStatus(req: Request, res: Response): void {
  res.json({
    assistant: 'Karthick AI',
    wakeName: 'Thruv',
    version: '2.2.0',
    coreEngine: 'Google Gemini 3.6 Flash (Resilient Multi-Model Pool)',
    status: 'operational',
    roadmap: [
      { version: 'v1.0', name: 'Cinematic Voice & Text Core', active: true },
      { version: 'v2.0', name: 'Wake Word Mode ("Hey Thruv")', active: true },
      { version: 'v2.1', name: 'Voice-Only UI & Live Weather Tool', active: true },
      { version: 'v2.2', name: 'YouTube Music Playback & Voice Controls', active: true },
      { version: 'v3.0', name: 'Gemini Function Calling & Real-Time Web', active: false },
      { version: 'v4.0', name: 'Personal Tools (Reminders, Calendar)', active: false },
      { version: 'v5.0', name: 'Persistent MongoDB Memory & Profiles', active: false },
      { version: 'v6.0', name: 'Email & Calendar Integration', active: false },
      { version: 'v7.0', name: 'Desktop Agent Integration', active: false },
      { version: 'v8.0', name: 'Raspberry Pi / Hardware Core', active: false },
    ],
    futureTools: FUTURE_TOOLS
  });
}

export function handleSessionReset(req: Request, res: Response): void {
  res.json({
    message: 'Session conversation context reset successfully.',
    sessionId: `sess_${Date.now()}`
  });
}
