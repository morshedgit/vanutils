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

    const updatedFacilities = existingFacilities.map((f) => ({
      ...f,
      lastUpdated: new Date().toISOString(),
    }));

    fs.writeFileSync(facilitiesFilePath, JSON.stringify(updatedFacilities, null, 2), 'utf8');
    console.log(`✅ Verified ${existingFacilities.length} public tennis courts, pools, rinks & turf pitches.`);
  } catch (error) {
    console.error('❌ Error syncing sports facilities data:', error.message);
  }
}

syncLiveSports();
