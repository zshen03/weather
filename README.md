# Weather Now

A small Vercel app that shows the current temperature and humidity for a city.
Weather data comes from [Open-Meteo](https://open-meteo.com/) and needs no API key.

## Features

- Current temperature, humidity, feels-like temperature, wind, and today's high/low
- Search for any city
- "Use my location" via the browser geolocation API
- Celsius / Fahrenheit toggle (saved in `localStorage`)
- Auto-refresh every 10 minutes
- One serverless function (`api/weather.js`), no runtime dependencies

## Develop locally

```bash
npm run dev
```

Then open <http://localhost:3000>. The included `dev.js` serves the static files and
mounts the serverless function locally, so no Vercel CLI is required.

## Deploy to Vercel

Import the repository in [Vercel](https://vercel.com/new) and deploy. There is no build
step and no environment variables are required. Vercel serves `index.html` statically and
deploys `api/weather.js` as a Node serverless function.

Production deployments follow the `main` branch, so push changes there.

## API

`GET /api/weather`

| Query        | Description                                  |
| ------------ | -------------------------------------------- |
| `city`       | City name, for example `?city=Tokyo`         |
| `lat` + `lon`| Coordinates, for example `?lat=51.5&lon=-0.12` |

With no query parameters the app falls back to San Francisco.
