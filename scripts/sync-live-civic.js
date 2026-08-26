import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLiveCivic() {
  console.log('🏛️ Syncing City of Vancouver Development & Rezoning Applications...');

  try {
    const proposalsFilePath = path.join(
      __dirname,
      '../src/tools/civic-development/data/proposals.json'
    );
    const existing = JSON.parse(fs.readFileSync(proposalsFilePath, 'utf8'));

    // Smoke-test City of Vancouver Open Data API reachability. NOTE: this dataset
    // (development-cost-levy-dcl-areas) does not carry per-proposal fields that map
    // onto proposals.json, so no live data is ingested here. This baseline is a
    // manually curated snapshot and is NOT refreshed by this script.
    try {
      const openDataRes = await fetch(
        'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/development-cost-levy-dcl-areas/records?limit=5',
        { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
      ).catch(() => null);

      if (openDataRes && openDataRes.ok) {
        console.log('ℹ️ City of Vancouver Open Data Portal reachable (informational only; no per-proposal fields available to sync).');
      } else {
        console.log('ℹ️ City of Vancouver Open Data Portal unreachable (informational only; baseline dataset unaffected).');
      }
    } catch (e) {
      console.log('ℹ️ CoV Open Data connectivity check failed (informational only; baseline dataset unaffected).');
    }

    fs.writeFileSync(proposalsFilePath, JSON.stringify(existing, null, 2), 'utf8');
    console.log(`ℹ️ ${existing.length} curated development/rezoning proposals unchanged (no live per-record source available; edit proposals.json manually to update).`);
  } catch (error) {
    console.error('❌ Error syncing civic development data:', error.message);
  }
}

syncLiveCivic();
