const STORAGE_KEY = 'weather-now.place';
const UNIT_KEY = 'weather-now.unit';
const REFRESH_INTERVAL = 10 * 60 * 1000;

const DEFAULT_PLACE = {
  latitude: 37.7749,
  longitude: -122.4194,
  name: 'San Francisco',
  region: 'California',
  country: 'United States',
};

const WEATHER_CODES = {
  0: { label: 'Clear sky', day: '☀️', night: '🌙' },
  1: { label: 'Mainly clear', day: '🌤️', night: '🌙' },
  2: { label: 'Partly cloudy', day: '⛅', night: '☁️' },
  3: { label: 'Overcast', day: '☁️', night: '☁️' },
  45: { label: 'Fog', day: '🌫️', night: '🌫️' },
  48: { label: 'Freezing fog', day: '🌫️', night: '🌫️' },
  51: { label: 'Light drizzle', day: '🌦️', night: '🌦️' },
  53: { label: 'Drizzle', day: '🌦️', night: '🌦️' },
  55: { label: 'Heavy drizzle', day: '🌧️', night: '🌧️' },
  56: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️' },
  57: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️' },
  61: { label: 'Light rain', day: '🌦️', night: '🌧️' },
  63: { label: 'Rain', day: '🌧️', night: '🌧️' },
  65: { label: 'Heavy rain', day: '🌧️', night: '🌧️' },
  66: { label: 'Freezing rain', day: '🌧️', night: '🌧️' },
  67: { label: 'Freezing rain', day: '🌧️', night: '🌧️' },
  71: { label: 'Light snow', day: '🌨️', night: '🌨️' },
  73: { label: 'Snow', day: '❄️', night: '❄️' },
  75: { label: 'Heavy snow', day: '❄️', night: '❄️' },
  77: { label: 'Snow grains', day: '🌨️', night: '🌨️' },
  80: { label: 'Rain showers', day: '🌦️', night: '🌧️' },
  81: { label: 'Rain showers', day: '🌧️', night: '🌧️' },
  82: { label: 'Heavy showers', day: '⛈️', night: '⛈️' },
  85: { label: 'Snow showers', day: '🌨️', night: '🌨️' },
  86: { label: 'Snow showers', day: '🌨️', night: '🌨️' },
  95: { label: 'Thunderstorm', day: '⛈️', night: '⛈️' },
  96: { label: 'Thunderstorm with hail', day: '⛈️', night: '⛈️' },
  99: { label: 'Thunderstorm with hail', day: '⛈️', night: '⛈️' },
};

const elements = {
  card: document.querySelector('#weather-card'),
  form: document.querySelector('#search-form'),
  input: document.querySelector('#city-input'),
  unitButtons: Array.from(document.querySelectorAll('.unit-button')),
  locate: document.querySelector('#locate-button'),
  locationName: document.querySelector('#location-name'),
  locationDetail: document.querySelector('#location-detail'),
  icon: document.querySelector('#condition-icon'),
  temperature: document.querySelector('#temperature'),
  temperatureUnit: document.querySelector('#temperature-unit'),
  condition: document.querySelector('#condition'),
  humidity: document.querySelector('#humidity'),
  humidityFill: document.querySelector('#humidity-fill'),
  apparent: document.querySelector('#apparent'),
  highLow: document.querySelector('#high-low'),
  wind: document.querySelector('#wind'),
  updated: document.querySelector('#updated'),
  status: document.querySelector('#status'),
  statusMessage: document.querySelector('#status-message'),
  retry: document.querySelector('#retry-button'),
};

let unit = localStorage.getItem(UNIT_KEY) === 'f' ? 'f' : 'c';
let place = readSavedPlace();
let latest = null;
let isLoading = false;
let lastAction = () => loadWeather(place);
let refreshTimer = null;

function readSavedPlace() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude)) {
      return saved;
    }
  } catch {
    // Ignore corrupt storage and fall back to the default place.
  }
  return { ...DEFAULT_PLACE };
}

function savePlace(nextPlace) {
  place = nextPlace;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPlace));
  } catch {
    // Storage can be unavailable in private mode; the app still works.
  }
}

function convertTemperature(celsius) {
  return unit === 'f' ? (celsius * 9) / 5 + 32 : celsius;
}

function formatTemperature(celsius) {
  if (!Number.isFinite(celsius)) {
    return '--';
  }
  return `${Math.round(convertTemperature(celsius))}°`;
}

function weatherFor(code, isDay) {
  const entry = WEATHER_CODES[code] || { label: 'Current weather', day: '🌡️', night: '🌡️' };
  return { label: entry.label, icon: isDay ? entry.day : entry.night };
}

function setUnit(nextUnit) {
  unit = nextUnit;
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {
    // Ignores storage failures.
  }

  elements.unitButtons.forEach((button) => {
    const active = button.dataset.unit === unit;
    button.setAttribute('aria-pressed', String(active));
  });

  elements.temperatureUnit.textContent = unit === 'f' ? '°F' : '°C';

  if (latest) {
    render(latest);
  }
}

function showStatus(message, showRetry = true) {
  elements.statusMessage.textContent = message;
  elements.retry.hidden = !showRetry;
  elements.status.hidden = false;
}

function hideStatus() {
  elements.status.hidden = true;
}

function setLoading(loading) {
  isLoading = loading;
  elements.card.classList.toggle('is-loading', loading);
  elements.card.setAttribute('aria-busy', String(loading));
  elements.locate.disabled = loading;
  elements.input.disabled = loading;
  elements.form.querySelector('button').disabled = loading;
}

function render(data) {
  const { current, today } = data;
  const weather = weatherFor(current.weatherCode, current.isDay);

  elements.locationName.textContent = data.location.name || 'Your location';
  const detail = [data.location.region, data.location.country].filter(Boolean).join(', ');
  elements.locationDetail.textContent = detail || 'Current conditions';

  elements.icon.textContent = weather.icon;
  elements.temperature.textContent = String(Math.round(convertTemperature(current.temperature)));
  elements.condition.textContent = weather.label;

  elements.humidity.textContent = Number.isFinite(current.humidity)
    ? String(Math.round(current.humidity))
    : '--';
  elements.humidityFill.style.width = `${Math.min(100, Math.max(0, current.humidity || 0))}%`;

  elements.apparent.textContent = formatTemperature(current.apparentTemperature);
  elements.highLow.textContent = `${formatTemperature(today.high)} / ${formatTemperature(today.low)}`;

  const windValue = Number.isFinite(current.windSpeed)
    ? `${Math.round(current.windSpeed)} km/h`
    : '--';
  elements.wind.textContent = windValue;

  const time = typeof current.time === 'string' && current.time.length >= 16 ? current.time.slice(11, 16) : '';
  elements.updated.textContent = time ? `Updated ${time} local time` : 'Just updated';
}

async function loadWeather(nextPlace) {
  if (isLoading) {
    return;
  }

  lastAction = () => loadWeather(place);
  setLoading(true);
  hideStatus();

  try {
    const params = new URLSearchParams({
      lat: String(nextPlace.latitude),
      lon: String(nextPlace.longitude),
    });

    const response = await fetch(`/api/weather?${params}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load weather data.');
    }

    latest = data;
    savePlace({
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      name: data.location.name,
      region: data.location.region,
      country: data.location.country,
    });
    render(data);
  } catch (error) {
    showStatus(
      latest
        ? `Couldn't refresh the latest reading. ${error.message}`
        : error.message || 'Could not load weather data. Please try again.'
    );
  } finally {
    setLoading(false);
    scheduleRefresh();
  }
}

async function searchCity(query) {
  if (isLoading || !query.trim()) {
    return;
  }

  lastAction = () => searchCity(query);
  setLoading(true);
  hideStatus();

  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(query.trim())}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not find that city.');
    }

    latest = data;
    savePlace({
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      name: data.location.name,
      region: data.location.region,
      country: data.location.country,
    });
    render(data);
    elements.input.value = '';
  } catch (error) {
    showStatus(error.message || 'Could not find that city. Try another search.');
  } finally {
    setLoading(false);
    scheduleRefresh();
  }
}

function useMyLocation() {
  if (isLoading) {
    return;
  }

  if (!('geolocation' in navigator)) {
    showStatus('Location access is not available in this browser. Search for a city instead.');
    return;
  }

  lastAction = useMyLocation;
  setLoading(true);
  showStatus('Finding your location…', false);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      hideStatus();
      setLoading(false);
      loadWeather({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        name: '',
        region: '',
        country: '',
      });
    },
    (error) => {
      setLoading(false);
      showStatus(
        error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Search for a city instead.'
          : 'Could not get your location. Search for a city instead.'
      );
    },
    { timeout: 10000, maximumAge: 300000 }
  );
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (document.visibilityState === 'visible') {
      loadWeather(place);
    }
  }, REFRESH_INTERVAL);
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  searchCity(elements.input.value);
});

elements.unitButtons.forEach((button) => {
  button.addEventListener('click', () => setUnit(button.dataset.unit));
});

elements.locate.addEventListener('click', useMyLocation);
elements.retry.addEventListener('click', () => lastAction());

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    scheduleRefresh();
  }
});

setUnit(unit);
loadWeather(place);
