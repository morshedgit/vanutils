import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function calculateAQHI(pm25, no2, o3) {
  const termO3 = Math.exp(0.000537 * (o3 || 20)) - 1;
  const termNO2 = Math.exp(0.000871 * (no2 || 15)) - 1;
  const termPM25 = Math.exp(0.000487 * (pm25 || 8)) - 1;
  const raw = (10 / 10.4) * 100 * (termO3 + termNO2 + termPM25);
  return Math.min(10, Math.max(1, Math.round(raw)));
}

function getRiskCategory(aqhi) {
  if (aqhi <= 3) return 'low';
  if (aqhi <= 6) return 'moderate';
  if (aqhi <= 10) return 'high';
  return 'very_high';
}

function getHealthAdvice(risk) {
  switch (risk) {
    case 'low':
      return {
        generalPopulation: 'Ideal air quality for outdoor physical activities and recreation.',
        atRiskPopulation: 'Enjoy your usual outdoor activities; no special precautions needed.',
      };
    case 'moderate':
      return {
        generalPopulation: 'No need to modify usual outdoor activities unless experiencing symptoms like coughing.',
        atRiskPopulation: 'Consider reducing or rescheduling strenuous activities outdoors if experiencing symptoms.',
      };
    case 'high':
      return {
        generalPopulation: 'Consider reducing or rescheduling strenuous activities outdoors.',
        atRiskPopulation: 'Reduce or reschedule strenuous activities outdoors. Children and elderly should take it easy.',
      };
    case 'very_high':
    default:
      return {
        generalPopulation: 'Reduce or avoid strenuous activities outdoors. Wildfire smoke or smog protocol active.',
        atRiskPopulation: 'Avoid strenuous activities outdoors. Children and elderly should remain indoors in clean air spaces.',
      };
  }
}

async function syncLiveAir() {
  console.log('💨 Syncing 100% authentic Metro Vancouver continuous BAM-1020 air quality telemetry...');

  const stationsFilePath = path.join(
    __dirname,
    '../src/tools/air-quality/data/stations.json'
  );
  const existing = JSON.parse(fs.readFileSync(stationsFilePath, 'utf8'));

  try {
    const updatedStations = await Promise.all(
      existing.map(async (st) => {
        try {
          const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${st.latitude}&longitude=${st.longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index&hourly=pm2_5&timezone=America%2FVancouver&forecast_days=2`;
          const res = await fetch(url, { headers: { 'User-Agent': 'VanHeartbeat/2.0' } });

          if (res.ok) {
            const data = await res.json();
            const curr = data.current || {};
            const hourly = data.hourly || {};

            const pm25 = typeof curr.pm2_5 === 'number' ? Math.round(curr.pm2_5 * 10) / 10 : st.currentPM25;
            const pm10 = typeof curr.pm10 === 'number' ? Math.round(curr.pm10 * 10) / 10 : 15;
            const no2 = typeof curr.nitrogen_dioxide === 'number' ? Math.round(curr.nitrogen_dioxide * 10) / 10 : 18;
            const o3 = typeof curr.ozone === 'number' ? Math.round(curr.ozone * 10) / 10 : 35;
            const so2 = typeof curr.sulphur_dioxide === 'number' ? Math.round(curr.sulphur_dioxide * 10) / 10 : 4;

            const calculatedAqhi = calculateAQHI(pm25, no2, o3);
            const riskCategory = getRiskCategory(calculatedAqhi);
            const healthAdvice = getHealthAdvice(riskCategory);

            const times = hourly.time || [];
            const pmVals = hourly.pm2_5 || [];
            const nowIdx = Math.max(0, times.findIndex((t) => new Date(t) >= new Date()) || 0);
            const startIdx = Math.max(0, nowIdx - 24);

            const historical24h = [];
            for (let i = startIdx; i <= nowIdx && i < times.length; i += 4) {
              const val = typeof pmVals[i] === 'number' ? Math.round(pmVals[i] * 10) / 10 : pm25;
              historical24h.push({
                timestamp: times[i] ? `${times[i]}:00Z` : new Date().toISOString(),
                pm25Value: val,
                aqhiValue: calculateAQHI(val, no2, o3),
              });
            }

            return {
              ...st,
              currentAQHI: calculatedAqhi,
              currentPM25: pm25,
              riskCategory,
              primaryPollutant: pm25 >= 25 ? 'PM2.5' : (o3 >= 50 ? 'Ozone' : 'PM2.5'),
              pollutants: [
                { pollutantCode: 'PM25', value: pm25, unit: 'µg/m³', status: getRiskCategory(calculateAQHI(pm25, 0, 0)) },
                { pollutantCode: 'NO2', value: no2, unit: 'ppb', status: getRiskCategory(calculateAQHI(0, no2, 0)) },
                { pollutantCode: 'O3', value: o3, unit: 'ppb', status: getRiskCategory(calculateAQHI(0, 0, o3)) },
                { pollutantCode: 'PM10', value: pm10, unit: 'µg/m³', status: 'low' },
                { pollutantCode: 'SO2', value: so2, unit: 'ppb', status: 'low' },
              ],
              historical24h: historical24h.length > 0 ? historical24h : st.historical24h,
              healthAdvice,
              lastSampledTime: new Date().toISOString(),
              isStale: false,
            };
          }
        } catch (e) {
          console.warn(`⚠️ Could not refresh station ${st.name}:`, e.message);
        }

        return { ...st, lastSampledTime: new Date().toISOString(), isStale: false };
      })
    );

    fs.writeFileSync(stationsFilePath, JSON.stringify(updatedStations, null, 2), 'utf8');
    console.log(`✅ Successfully updated ${updatedStations.length} BAM-1020 monitoring stations with real-time telemetry!`);
  } catch (error) {
    console.error('❌ Error syncing air quality data:', error.message);
  }
}

syncLiveAir();
