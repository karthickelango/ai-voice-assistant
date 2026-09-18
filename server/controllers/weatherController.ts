import { Request, Response } from 'express';
import { getCurrentWeather, getWeatherForCity } from '../services/weatherService.ts';

export async function handleGetWeather(req: Request, res: Response): Promise<void> {
  try {
    const { city, lat, lon } = req.query;

    if (typeof city === 'string' && city.trim()) {
      const weather = await getWeatherForCity(city.trim());
      res.json({ success: true, weather });
      return;
    }

    if (typeof lat === 'string' && typeof lon === 'string') {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      if (isNaN(latitude) || isNaN(longitude)) {
        res.status(400).json({ error: 'Invalid latitude or longitude coordinates' });
        return;
      }

      const weather = await getCurrentWeather(latitude, longitude);
      res.json({ success: true, weather });
      return;
    }

    res.status(400).json({
      error: 'Either city or lat/lon coordinates are required',
      code: 'MISSING_PARAMETERS',
    });
  } catch (error: unknown) {
    console.error('[WeatherController] Error fetching weather:', error);
    const msg = error instanceof Error ? error.message : 'Failed to retrieve weather';
    res.status(500).json({
      error: msg,
      code: 'WEATHER_FETCH_FAILED',
    });
  }
}
