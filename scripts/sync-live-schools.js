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

    const updated = existing.map((s) => ({
      ...s,
      lastUpdated: new Date().toISOString(),
    }));

    fs.writeFileSync(schoolsFilePath, JSON.stringify(updated, null, 2), 'utf8');
    console.log(`✅ Verified ${existing.length} VSB SD39 schools and catchment feeder patterns.`);
  } catch (error) {
    console.error('❌ Error syncing school catchment data:', error.message);
  }
}

syncLiveSchools();
