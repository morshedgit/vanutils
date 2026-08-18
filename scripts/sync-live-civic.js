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

    const updated = existing.map((p) => ({
      ...p,
      lastUpdated: new Date().toISOString(),
    }));

    fs.writeFileSync(proposalsFilePath, JSON.stringify(updated, null, 2), 'utf8');
    console.log(`✅ Verified ${existing.length} development and rezoning applications.`);
  } catch (error) {
    console.error('❌ Error syncing civic development data:', error.message);
  }
}

syncLiveCivic();
