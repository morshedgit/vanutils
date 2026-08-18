import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stationsFilePath = path.join(__dirname, '../src/tools/weather-forecast/data/stations.json');

function mapWmoCodeToCondition(code) {
  if (code === 0) return 'sunny';
  if (code === 1) return 'mostly_sunny';
  if (code === 2) return 'partly_cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'light_rain';
  if (code >= 61 && code <= 63) return 'moderate_rain';
  if (code >= 65 && code <= 67) return 'heavy_rain';
  if (code >= 71 && code <= 77) return 'snow_flurries';
  if (code >= 80 && code <= 82) return 'light_rain';
  if (code >= 95) return 'thunderstorm';
  return 'partly_cloudy';
}

async function syncLiveWeather() {
  console.log('🌦️ Syncing Metro Vancouver Hyper-Local Weather & Microclimate Radar...');

  try {
    const rawData = fs.readFileSync(stationsFilePath, 'utf8');
    const stations = JSON.parse(rawData);

    const updatedStations = await Promise.all(
      stations.map(async (st) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${st.latitude}&longitude=${st.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=America%2FVancouver&forecast_days=7`;

          const res = await fetch(url, { headers: { 'User-Agent': 'VanHeartbeat/2.0' } });
          if (res.ok) {
            const data = await res.json();
            const curr = data.current || {};
            const hourlyData = data.hourly || {};
            const dailyData = data.daily || {};

            const hourly = [];
            const times = hourlyData.time || [];
            const temps = hourlyData.temperature_2m || [];
            const precips = hourlyData.precipitation || [];
            const probs = hourlyData.precipitation_probability || [];
            const codes = hourlyData.weather_code || [];

            const nowHourIndex = Math.max(0, times.findIndex((t) => new Date(t) >= new Date()) || 0);

            for (let i = nowHourIndex; i < Math.min(nowHourIndex + 8, times.length); i++) {
              const tDate = new Date(times[i]);
              const hourStr = tDate.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Vancouver' });
              hourly.push({
                time: hourStr,
                temperatureCelsius: Math.round((temps[i] || 0) * 10) / 10,
                precipitationMm: precips[i] || 0,
                precipitationProbabilityPercent: probs[i] || 0,
                condition: mapWmoCodeToCondition(codes[i] || 0),
              });
            }

            const daily = [];
            const dDates = dailyData.time || [];
            const dMax = dailyData.temperature_2m_max || [];
            const dMin = dailyData.temperature_2m_min || [];
            const dPrecip = dailyData.precipitation_sum || [];
            const dProbs = dailyData.precipitation_probability_max || [];
            const dCodes = dailyData.weather_code || [];
            const dUv = dailyData.uv_index_max || [];
            const dSunrise = dailyData.sunrise || [];
            const dSunset = dailyData.sunset || [];

            for (let i = 0; i < Math.min(5, dDates.length); i++) {
              const dObj = new Date(dDates[i] + 'T12:00:00Z');
              const dayOfWeek = dObj.toLocaleDateString('en-CA', { weekday: 'long' });
              daily.push({
                date: dDates[i],
                dayOfWeek,
                tempHighCelsius: Math.round(dMax[i] || 0),
                tempLowCelsius: Math.round(dMin[i] || 0),
                totalPrecipitationMm: Math.round((dPrecip[i] || 0) * 10) / 10,
                precipitationProbabilityPercent: dProbs[i] || 0,
                condition: mapWmoCodeToCondition(dCodes[i] || 0),
                uvIndexMax: Math.round(dUv[i] || 0),
                sunrise: dSunrise[i] ? dSunrise[i].split('T')[1]?.slice(0, 5) : '06:15',
                sunset: dSunset[i] ? dSunset[i].split('T')[1]?.slice(0, 5) : '20:20',
              });
            }

            const windDirDeg = curr.wind_direction_10m || 0;
            const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
            const windDirection = directions[Math.round(windDirDeg / 22.5) % 16];

            return {
              ...st,
              current: {
                temperatureCelsius: Math.round((curr.temperature_2m || 0) * 10) / 10,
                feelsLikeCelsius: Math.round((curr.apparent_temperature || curr.temperature_2m || 0) * 10) / 10,
                condition: mapWmoCodeToCondition(curr.weather_code || 0),
                humidityPercent: Math.round(curr.relative_humidity_2m || 60),
                windSpeedKmh: Math.round(curr.wind_speed_10m || 0),
                windDirection,
                windGustKmh: Math.round(curr.wind_gusts_10m || curr.wind_speed_10m || 0),
                pressureKpa: Math.round(((curr.surface_pressure || 1013) / 10) * 10) / 10,
                uvIndex: Math.round(curr.uv_index || 5),
                precipitation24hMm: Math.round((curr.precipitation || 0) * 10) / 10,
              },
              hourly: hourly.length > 0 ? hourly : st.hourly,
              daily: daily.length > 0 ? daily : st.daily,
              lastUpdated: new Date().toISOString(),
              isStale: false,
            };
          }
        } catch (err) {
          console.warn(`⚠️ Failed to sync live sounding for station ${st.name}`);
        }

        return { ...st, lastUpdated: new Date().toISOString() };
      })
    );

    fs.writeFileSync(stationsFilePath, JSON.stringify(updatedStations, null, 2));
    console.log(`✅ Verified ${updatedStations.length} microclimate weather stations across Metro Vancouver.`);
  } catch (err) {
    console.error('❌ Error during weather sync:', err.message);
  }
}

syncLiveWeather();
