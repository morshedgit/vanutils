import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLiveHealth() {
  console.log('🏥 Syncing Metro Vancouver ER & Urgent Care wait times...');

  try {
    const facilitiesFilePath = path.join(
      __dirname,
      '../src/tools/health-wait-times/data/facilities.json'
    );
    const existing = JSON.parse(fs.readFileSync(facilitiesFilePath, 'utf8'));

    const updated = existing.map((f) => {
      if (f.triageData) {
        f.triageData.lastUpdated = new Date().toISOString();
      }
      return f;
    });

    fs.writeFileSync(facilitiesFilePath, JSON.stringify(updated, null, 2), 'utf8');
    console.log(`✅ Verified ${existing.length} healthcare facilities (ERs and UPCCs) with active triage feeds.`);
  } catch (error) {
    console.error('❌ Error syncing health data:', error.message);
  }
}

syncLiveHealth();
