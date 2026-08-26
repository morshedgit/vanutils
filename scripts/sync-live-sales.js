import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncSalesEvents() {
  console.log('🏷️ Syncing Metro Vancouver Warehouse, Sample Sales & Local Deals Radar...');

  const dataPath = path.join(__dirname, '../src/tools/sales-events/data/sales.json');

  if (!fs.existsSync(dataPath)) {
    console.error('❌ Sales data file not found:', dataPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const sales = JSON.parse(rawData);

  // Smoke-test City of Vancouver Open Data API reachability. NOTE: this dataset
  // (special-events) does not carry warehouse/sample-sale records, so no live data
  // is ingested here. This baseline is a manually curated snapshot and is NOT
  // refreshed by this script.
  try {
    const openDataRes = await fetch(
      'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/special-events/records?limit=5',
      { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
    ).catch(() => null);

    if (openDataRes && openDataRes.ok) {
      console.log('ℹ️ City of Vancouver Open Data Portal reachable (informational only; no matching sales dataset to sync).');
    } else {
      console.log('ℹ️ City of Vancouver Open Data Portal unreachable (informational only; baseline dataset unaffected).');
    }
  } catch (e) {
    console.log('ℹ️ CoV Open Data connectivity check failed (informational only; baseline dataset unaffected).');
  }

  fs.writeFileSync(dataPath, JSON.stringify(sales, null, 2), 'utf-8');
  console.log(`ℹ️ ${sales.length} curated warehouse/sample sales unchanged (no live source available; edit sales.json manually to update).`);
}

syncSalesEvents().catch((err) => {
  console.error('❌ Error syncing sales events:', err);
  process.exit(1);
});
