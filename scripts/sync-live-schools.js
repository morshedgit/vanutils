import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLiveSchools() {
  console.log('🎒 Syncing Vancouver School Board (SD39) Catchments & Childcares...');

  try {
    const schoolsFilePath = path.join(
      __dirname,
      '../src/tools/school-catchment/data/schools.json'
    );
    const existing = JSON.parse(fs.readFileSync(schoolsFilePath, 'utf8'));

    // Smoke-test City of Vancouver Schools Open Data API reachability. NOTE: this
    // dataset does not carry the curated catchment/program fields used in
    // schools.json (feeder patterns, program offerings), so no live data is
    // ingested here. This baseline is a manually curated snapshot and is NOT
    // refreshed by this script.
    try {
      const openDataRes = await fetch(
        'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/schools/records?limit=5',
        { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
      ).catch(() => null);

      if (openDataRes && openDataRes.ok) {
        console.log('ℹ️ City of Vancouver Schools Open Data API reachable (informational only; no per-catchment fields available to sync).');
      } else {
        console.log('ℹ️ City of Vancouver Schools Open Data API unreachable (informational only; baseline dataset unaffected).');
      }
    } catch (e) {
      console.log('ℹ️ CoV Open Data connectivity check failed (informational only; baseline dataset unaffected).');
    }

    fs.writeFileSync(schoolsFilePath, JSON.stringify(existing, null, 2), 'utf8');
    console.log(`ℹ️ ${existing.length} curated VSB SD39 schools unchanged (no live per-record source available; edit schools.json manually to update).`);
  } catch (error) {
    console.error('❌ Error syncing school catchment data:', error.message);
  }
}

syncLiveSchools();
