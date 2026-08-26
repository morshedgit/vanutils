import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLiveEvents() {
  console.log('🎉 Syncing Free & Local Community Events from Vancouver Special Events & Park Board...');

  try {
    const eventsFilePath = path.join(
      __dirname,
      '../src/tools/community-events/data/events.json'
    );
    const existing = JSON.parse(fs.readFileSync(eventsFilePath, 'utf8'));

    // Smoke-test City of Vancouver Special Events API reachability. NOTE: this dataset's
    // schema does not map onto events.json's curated fields (title, category, admission),
    // so no live data is ingested here. This baseline is a manually curated snapshot and
    // is NOT refreshed by this script.
    try {
      const openDataRes = await fetch(
        'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/special-events/records?limit=5',
        { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
      ).catch(() => null);

      if (openDataRes && openDataRes.ok) {
        console.log('ℹ️ City of Vancouver Special Events API reachable (informational only; no per-event fields available to sync).');
      } else {
        console.log('ℹ️ City of Vancouver Special Events API unreachable (informational only; baseline dataset unaffected).');
      }
    } catch (e) {
      console.log('ℹ️ CoV Open Data connectivity check failed (informational only; baseline dataset unaffected).');
    }

    fs.writeFileSync(eventsFilePath, JSON.stringify(existing, null, 2), 'utf8');
    console.log(`ℹ️ ${existing.length} curated community events unchanged (no live per-record source available; edit events.json manually to update).`);
  } catch (error) {
    console.error('❌ Error syncing community events data:', error.message);
  }
}

syncLiveEvents();
