const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

const DEFAULT_LOCATION = {
  latitude: 37.7749,
  longitude: -122.4194,
  name: 'San Francisco',
  region: 'California',
  country: 'United States',
};

async function getJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'weather-app/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed with ${response.status}`);
  }

  return response.json();
}

async function findCity(query) {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set('name', query);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const data = await getJson(url);
  const match = data.results && data.results[0];

  if (!match) {
    return null;
  }

  return {
    latitude: match.latitude,
    longitude: match.longitude,
    name: match.name,
    region: match.admin1 || '',
    country: match.country || '',
  };
}

async function describeCoordinates(latitude, longitude) {
  const url = new URL(REVERSE_GEOCODE_URL);
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('localityLanguage', 'en');

  try {
    const data = await getJson(url);
    return {
      name: data.city || data.locality || data.principalSubdivision || 'Your location',
      region: data.principalSubdivision || '',
      country: data.countryName || '',
    };
  } catch {
    return { name: 'Your location', region: '', country: '' };
  }
}

function parseCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

async function getWeather(place) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set('latitude', place.latitude);
  url.searchParams.set('longitude', place.longitude);
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m'
  );
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const data = await getJson(url);
  const current = data.current;

  return {
    location: {
      name: place.name,
      region: place.region,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    },
    current: {
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
      time: current.time,
    },
    today: {
      high: data.daily.temperature_2m_max[0],
      low: data.daily.temperature_2m_min[0],
    },
    units: {
      temperature: data.current_units.temperature_2m,
      windSpeed: data.current_units.wind_speed_10m,
    },
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { city, lat, lon } = request.query;

  try {
    let place = DEFAULT_LOCATION;

    if (city) {
      const match = await findCity(String(city).trim());
      if (!match) {
        response.status(404).json({ error: `No location found for "${city}"` });
        return;
      }
      place = match;
    } else if (lat !== undefined && lon !== undefined) {
      const latitude = parseCoordinate(lat, -90, 90);
      const longitude = parseCoordinate(lon, -180, 180);

      if (latitude === null || longitude === null) {
        response.status(400).json({ error: 'Invalid latitude or longitude' });
        return;
      }

      const name = await describeCoordinates(latitude, longitude);
      place = { latitude, longitude, ...name };
    }

    const weather = await getWeather(place);

    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    response.status(200).json(weather);
  } catch (error) {
    console.error('Weather request failed:', error);
    response.status(502).json({ error: 'Could not load weather data. Please try again.' });
  }
};
