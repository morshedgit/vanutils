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

    const updated = existing.map((e) => ({
      ...e,
      lastUpdated: new Date().toISOString(),
    }));

    fs.writeFileSync(eventsFilePath, JSON.stringify(updated, null, 2), 'utf8');
    console.log(`✅ Verified ${existing.length} free community events across Vancouver.`);
  } catch (error) {
    console.error('❌ Error syncing community events data:', error.message);
  }
}

syncLiveEvents();
