import { Router } from 'express';
import {
  handleChatMessage,
  handleHealthCheck,
  handleGetSystemStatus,
  handleSessionReset
} from '../controllers/chatController.ts';
import { handleGetWeather } from '../controllers/weatherController.ts';
import { handleLogin } from '../controllers/authController.ts';

export const apiRouter = Router();

apiRouter.get('/health', handleHealthCheck);
apiRouter.get('/status', handleGetSystemStatus);
apiRouter.post('/chat', handleChatMessage);
apiRouter.post('/session/reset', handleSessionReset);
apiRouter.get('/weather', handleGetWeather);
apiRouter.post('/auth/login', handleLogin);
