export interface WeatherData {
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  temperatureCelsius: number;
  apparentTemperatureCelsius: number;
  humidity: number;
  weatherCode: number;
  conditionDescription: string;
  precipitationProbabilityMax?: number;
  rainCurrentMm?: number;
  windSpeedKmh: number;
  isRaining: boolean;
}

export function describeWeatherCode(code: number): string {
  switch (code) {
    case 0:
      return 'clear skies';
    case 1:
      return 'mainly clear skies';
    case 2:
      return 'partly cloudy skies';
    case 3:
      return 'overcast conditions';
    case 45:
    case 48:
      return 'foggy conditions';
    case 51:
      return 'light drizzle';
    case 53:
    case 55:
      return 'drizzle';
    case 56:
    case 57:
      return 'freezing drizzle';
    case 61:
      return 'light rain';
    case 63:
      return 'moderate rain';
    case 65:
      return 'heavy rain';
    case 66:
    case 67:
      return 'freezing rain';
    case 71:
    case 73:
    case 75:
      return 'snowfall';
    case 80:
      return 'scattered rain showers';
    case 81:
    case 82:
      return 'heavy rain showers';
    case 85:
    case 86:
      return 'snow showers';
    case 95:
      return 'thunderstorms';
    case 96:
    case 99:
      return 'thunderstorms with hail';
    default:
      return 'partly cloudy skies';
  }
}

/**
 * Geocode a city name using Open-Meteo Geocoding API
 */
export async function geocodeCity(
  city: string
): Promise<{ name: string; latitude: number; longitude: number; country?: string } | null> {
  const cleanCity = city.trim();
  if (!cleanCity) return null;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cleanCity
    )}&count=1&language=en&format=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'KarthickAI/2.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[WeatherService] Geocoding HTTP error ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country?: string;
      }>;
    };

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const first = data.results[0];
    return {
      name: first.name,
      latitude: first.latitude,
      longitude: first.longitude,
      country: first.country,
    };
  } catch (err) {
    console.error('[WeatherService] Geocoding failure for city:', cleanCity, err);
    return null;
  }
}

/**
 * Get real current weather by coordinates using Open-Meteo
 */
export async function getCurrentWeather(
  latitude: number,
  longitude: number,
  cityName?: string,
  countryName?: string
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min&timezone=auto`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': 'KarthickAI/2.0' },
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Weather API returned HTTP status ${response.status}`);
  }

  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      precipitation?: number;
      rain?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
    daily?: {
      precipitation_probability_max?: number[];
    };
  };

  const current = data.current;
  if (!current) {
    throw new Error('No current weather data returned from weather service');
  }

  const temp = Math.round(current.temperature_2m ?? 20);
  const apparent = Math.round(current.apparent_temperature ?? temp);
  const humidity = Math.round(current.relative_humidity_2m ?? 50);
  const code = current.weather_code ?? 0;
  const condition = describeWeatherCode(code);
  const rainCurrent = current.rain ?? current.precipitation ?? 0;
  const isRaining = rainCurrent > 0.1 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  const precipProb = data.daily?.precipitation_probability_max?.[0] ?? (isRaining ? 85 : 10);
  const windSpeed = Math.round(current.wind_speed_10m ?? 10);

  return {
    city: cityName,
    country: countryName,
    latitude,
    longitude,
    temperatureCelsius: temp,
    apparentTemperatureCelsius: apparent,
    humidity,
    weatherCode: code,
    conditionDescription: condition,
    precipitationProbabilityMax: precipProb,
    rainCurrentMm: rainCurrent,
    windSpeedKmh: windSpeed,
    isRaining,
  };
}

/**
 * Get real current weather for a specific city name
 */
export async function getWeatherForCity(city: string): Promise<WeatherData> {
  const geo = await geocodeCity(city);
  if (!geo) {
    throw new Error(`Could not find location for "${city}"`);
  }

  return await getCurrentWeather(geo.latitude, geo.longitude, geo.name, geo.country);
}
