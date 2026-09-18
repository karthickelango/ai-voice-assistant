import { Request, Response } from 'express';

const VALID_USERNAME = 'Assistant_AI';
const VALID_PASSWORD = 'Thruv@2023';

/**
 * Handle user authentication for Karthick AI / Thruv
 */
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
      return;
    }

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      res.status(200).json({
        success: true,
        message: 'Access granted. Welcome to Karthick AI.',
        user: {
          username: VALID_USERNAME,
          role: 'authorized_user',
          authenticatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Invalid username or password. Access denied.',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An internal authentication error occurred',
    });
  }
}
