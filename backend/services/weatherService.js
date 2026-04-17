/**
 * weatherService.js — OpenWeatherMap Integration
 * 
 * Fetches live weather + air quality data and converts it into
 * numeric risk factors consumed by the risk scoring pipeline.
 * 
 * Cache: 10-minute TTL per location to avoid hammering the API.
 */

const axios = require('axios');
const { OPENWEATHER_API_KEY } = require('../config/env');

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ─── Weather condition → risk severity mapping ──────────────────────────────
// Returns 1-10 scale: 1=clear, 5=rain, 8=heavy rain, 10=extreme storm
const weatherToRisk = (weatherId, windSpeed) => {
  // OpenWeather condition codes: https://openweathermap.org/weather-conditions
  if (weatherId >= 200 && weatherId < 300) return 9;   // Thunderstorm
  if (weatherId >= 300 && weatherId < 400) return 4;   // Drizzle
  if (weatherId >= 500 && weatherId < 505) return 6;   // Rain
  if (weatherId === 511) return 8;                       // Freezing rain
  if (weatherId >= 520 && weatherId < 600) return 7;   // Heavy shower rain
  if (weatherId >= 600 && weatherId < 700) return 7;   // Snow
  if (weatherId >= 700 && weatherId < 800) return 5;   // Fog/Haze/Dust
  if (weatherId === 800) return 1;                       // Clear sky
  if (weatherId >= 801 && weatherId <= 804) return 2;   // Clouds
  
  // Wind multiplier (gig workers on two-wheelers)
  if (windSpeed > 15) return Math.min(10, 7);
  
  return 3; // Default moderate
};

// AQI → pollution risk (1-10 scale)
const aqiToRisk = (aqi) => {
  // OpenWeather AQI: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
  const map = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 10 };
  return map[aqi] || 3;
};

// ─── Main Fetch ─────────────────────────────────────────────────────────────
const getWeatherData = async (lat = 28.7041, lng = 77.1025) => {
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (!OPENWEATHER_API_KEY) {
    console.warn('⚠️ OPENWEATHER_API_KEY not set — returning defaults');
    return getDefaultWeather();
  }

  try {
    // Parallel fetch: weather + air pollution
    const [weatherRes, aqiRes] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat, lon: lng, appid: OPENWEATHER_API_KEY, units: 'metric' },
        timeout: 5000,
      }),
      axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
        params: { lat, lon: lng, appid: OPENWEATHER_API_KEY },
        timeout: 5000,
      }).catch(() => null), // AQI is optional — don't fail if unavailable
    ]);

    const w = weatherRes.data;
    const weatherId = w.weather?.[0]?.id || 800;
    const windSpeed = w.wind?.speed || 0;

    const result = {
      // Raw data for display
      condition: w.weather?.[0]?.main || 'Clear',
      description: w.weather?.[0]?.description || 'clear sky',
      icon: w.weather?.[0]?.icon || '01d',
      temp: Math.round(w.main?.temp || 30),
      feelsLike: Math.round(w.main?.feels_like || 30),
      humidity: w.main?.humidity || 50,
      windSpeed: Math.round(windSpeed * 3.6), // m/s → km/h
      visibility: Math.round((w.visibility || 10000) / 1000), // meters → km
      
      // Risk factors (1-10 scale for the scoring engine)
      weatherRisk: weatherToRisk(weatherId, windSpeed),
      pollutionRisk: aqiRes ? aqiToRisk(aqiRes.data?.list?.[0]?.main?.aqi || 1) : 2,
      aqi: aqiRes?.data?.list?.[0]?.main?.aqi || null,
      
      // Metadata
      city: w.name || 'Unknown',
      country: w.sys?.country || 'IN',
      source: 'openweathermap',
      fetchedAt: new Date().toISOString(),
    };

    CACHE.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log(`🌦️  Weather fetched: ${result.city} — ${result.condition} (${result.temp}°C), Risk: ${result.weatherRisk}/10`);
    return result;

  } catch (err) {
    console.error('❌ OpenWeather API error:', err.message);
    return getDefaultWeather();
  }
};

// Fallback when API is unavailable
const getDefaultWeather = () => ({
  condition: 'Clear',
  description: 'clear sky',
  icon: '01d',
  temp: 32,
  feelsLike: 34,
  humidity: 55,
  windSpeed: 12,
  visibility: 8,
  weatherRisk: 2,
  pollutionRisk: 3,
  aqi: null,
  city: 'Delhi NCR',
  country: 'IN',
  source: 'fallback',
  fetchedAt: new Date().toISOString(),
});

module.exports = { getWeatherData };
