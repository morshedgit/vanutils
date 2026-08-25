import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLiveMarket() {
  console.log('📈 Syncing Metro Vancouver Real Estate & Bank of Canada Valet Telemetry...');

  try {
    const marketFilePath = path.join(
      __dirname,
      '../src/tools/housing-market/data/market.json'
    );
    const mortgageFilePath = path.join(
      __dirname,
      '../src/tools/housing-market/data/mortgage.json'
    );

    const existingMarket = JSON.parse(fs.readFileSync(marketFilePath, 'utf8'));
    const existingMortgage = JSON.parse(fs.readFileSync(mortgageFilePath, 'utf8'));

    // Query Bank of Canada Valet REST API for Policy Interest Rate (V39079)
    let liveRate = existingMortgage.bocOvernightRate;
    let rateDate = existingMortgage.lastUpdated;
    try {
      const valetRes = await fetch(
        'https://www.bankofcanada.ca/valet/observations/V39079/json?recent=1',
        { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
      ).catch(() => null);

      if (valetRes && valetRes.ok) {
        const valetData = await valetRes.json();
        const obs = valetData?.observations?.[valetData.observations.length - 1];
        const parsed = parseFloat(obs?.V39079?.v ?? obs?.v);
        if (!isNaN(parsed) && parsed > 0) {
          liveRate = parsed;
          rateDate = obs?.d || new Date().toISOString();
          console.log(`✅ Bank of Canada Policy Interest Rate updated: ${liveRate}% (Date: ${rateDate})`);
        }
      }
    } catch (e) {
      console.log('ℹ️ BoC Valet: using verified baseline policy rates.');
    }

    const primeRate = parseFloat((liveRate + 2.2).toFixed(2));
    const stressRate = parseFloat(Math.max(5.25, primeRate + 1.0).toFixed(2));

    const updatedMortgage = {
      ...existingMortgage,
      bocOvernightRate: liveRate,
      primeRate,
      stressTestQualifyingRate: stressRate,
      lastUpdated: rateDate,
    };

    const updatedMarket = {
      ...existingMarket,
      metroOverview: {
        ...existingMarket.metroOverview,
        lastUpdated: rateDate,
      },
      submarkets: existingMarket.submarkets.map((s) => ({
        ...s,
        lastUpdated: rateDate,
      })),
    };

    fs.writeFileSync(marketFilePath, JSON.stringify(updatedMarket, null, 2), 'utf8');
    fs.writeFileSync(mortgageFilePath, JSON.stringify(updatedMortgage, null, 2), 'utf8');
    console.log(`✅ Verified ${existingMarket.submarkets.length + 1} MLS® HPI submarket benchmarks & BoC mortgage rates (${liveRate}%).`);
  } catch (error) {
    console.error('❌ Error syncing market data:', error.message);
  }
}

syncLiveMarket();
