import { WeatherData } from './weatherService.ts';

export interface WeatherIntentResult {
  isWeather: boolean;
  city?: string;
  isFollowUpCity: boolean;
}

const WEATHER_KEYWORDS = [
  'weather',
  'temperature',
  'temp',
  'rain',
  'raining',
  'forecast',
  'precipitation',
  'humidity',
  'how hot',
  'how cold',
  'sunny',
  'cloudy',
  'thunderstorm',
  'snow',
  'snowing',
];

/**
 * Detects if the user query is a weather-related request or answering "Which city should I check?"
 */
export function detectWeatherIntent(
  message: string,
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
): WeatherIntentResult {
  const clean = message.trim().toLowerCase();

  // 1. Check if the previous assistant turn asked "Which city should I check?"
  if (history && history.length > 0) {
    const lastTurn = history[history.length - 1];
    if (lastTurn && lastTurn.role === 'model' && Array.isArray(lastTurn.parts)) {
      const lastText = lastTurn.parts.map((p) => p.text).join(' ').toLowerCase();
      if (lastText.includes('which city should i check') || lastText.includes('which city would you like')) {
        // The user's response is the city name
        const cityCandidate = message
          .replace(/^(check|for|in|the city of|please check)\s+/i, '')
          .replace(/[.!?]/g, '')
          .trim();
        if (cityCandidate.length > 0 && cityCandidate.length < 50) {
          return {
            isWeather: true,
            city: cityCandidate,
            isFollowUpCity: true,
          };
        }
      }
    }
  }

  // 2. Check if the message contains weather keywords
  const hasKeyword = WEATHER_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(clean);
  });

  if (!hasKeyword) {
    return { isWeather: false, isFollowUpCity: false };
  }

  // 3. Check if user specified a city in this prompt
  // Patterns like: "weather in Coimbatore", "weather for London", "temperature in Tokyo", "is it raining in Paris"
  const cleanForCity = message.replace(/[?!.,;:]+$/g, '').trim();
  const cityMatch = cleanForCity.match(
    /\b(?:in|for|at|around)\s+([a-zA-Z\s.-]{2,40})(?:\s+(?:today|tomorrow|right now|outside|this evening|tonight))?$/i
  );

  let city: string | undefined = undefined;
  if (cityMatch && cityMatch[1]) {
    const candidate = cityMatch[1].trim();
    // Exclude temporal words that might accidentally match
    const invalidNames = ['today', 'tomorrow', 'now', 'the evening', 'this evening', 'the morning', 'tonight', 'here', 'outside'];
    if (!invalidNames.includes(candidate.toLowerCase())) {
      city = candidate;
    }
  }

  return {
    isWeather: true,
    city,
    isFollowUpCity: false,
  };
}

/**
 * Builds a natural, concise spoken response from real weather data
 */
export function buildConciseWeatherSpeech(weather: WeatherData, query: string): string {
  const q = query.toLowerCase();
  const locationLabel = weather.city ? `in ${weather.city}` : 'outside';

  // Rain specific inquiry: "will it rain", "is it raining", "chance of rain"
  if (q.includes('rain') || q.includes('raining')) {
    if (weather.isRaining) {
      return `Yes, it is currently raining ${locationLabel} with ${weather.conditionDescription} and a temperature of ${weather.temperatureCelsius} degrees Celsius.`;
    }
    if (weather.precipitationProbabilityMax && weather.precipitationProbabilityMax > 50) {
      return `There's a ${weather.precipitationProbabilityMax} percent chance of rain today ${locationLabel}, with ${weather.conditionDescription} and ${weather.temperatureCelsius} degrees Celsius.`;
    }
    if (weather.precipitationProbabilityMax && weather.precipitationProbabilityMax > 20) {
      return `There is a slight ${weather.precipitationProbabilityMax} percent chance of rain today ${locationLabel}. Current temperature is ${weather.temperatureCelsius} degrees Celsius.`;
    }
    return `No significant rain is expected today ${locationLabel}. Current condition is ${weather.conditionDescription} with a temperature of ${weather.temperatureCelsius} degrees Celsius.`;
  }

  // Temperature specific inquiry: "what is the temperature", "how hot", "how cold"
  if (q.includes('temperature') || q.includes('how hot') || q.includes('how cold') || q.includes('temp')) {
    return `It is currently ${weather.temperatureCelsius} degrees Celsius ${locationLabel}, with ${weather.conditionDescription}.`;
  }

  // General weather inquiry
  let rainNote = '';
  if (weather.precipitationProbabilityMax && weather.precipitationProbabilityMax >= 50) {
    rainNote = ` There is a ${weather.precipitationProbabilityMax} percent chance of rain.`;
  }

  return `It's currently ${weather.temperatureCelsius} degrees Celsius ${locationLabel} with ${weather.conditionDescription}.${rainNote}`;
}
