import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLiveSports() {
  console.log('🏅 Syncing Vancouver Park Board Sports, Courts & Rec Facilities...');

  try {
    const facilitiesFilePath = path.join(
      __dirname,
      '../src/tools/sports-facilities/data/facilities.json'
    );

    const existingFacilities = JSON.parse(fs.readFileSync(facilitiesFilePath, 'utf8'));

    // Smoke-test City of Vancouver Parks & Facilities API reachability. NOTE: this
    // dataset does not carry the curated court/pool detail fields used in
    // facilities.json, so no live data is ingested here. This baseline is a
    // manually curated snapshot and is NOT refreshed by this script (live
    // open/closed status is computed separately at request time by
    // getLiveSportsFacilities()).
    try {
      const openDataRes = await fetch(
        'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parks-facilities/records?limit=5',
        { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
      ).catch(() => null);

      if (openDataRes && openDataRes.ok) {
        console.log('ℹ️ City of Vancouver Parks & Facilities API reachable (informational only; no per-facility fields available to sync).');
      } else {
        console.log('ℹ️ City of Vancouver Parks & Facilities API unreachable (informational only; baseline dataset unaffected).');
      }
    } catch (e) {
      console.log('ℹ️ CoV Open Data connectivity check failed (informational only; baseline dataset unaffected).');
    }

    fs.writeFileSync(facilitiesFilePath, JSON.stringify(existingFacilities, null, 2), 'utf8');
    console.log(`ℹ️ ${existingFacilities.length} curated sports facilities unchanged (no live per-record source available; edit facilities.json manually to update).`);
  } catch (error) {
    console.error('❌ Error syncing sports facilities data:', error.message);
  }
}

syncLiveSports();
