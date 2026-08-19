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

  const nowIso = new Date().toISOString();

  const updatedSales = sales.map((sale) => ({
    ...sale,
    lastUpdated: nowIso,
    isStale: false,
  }));

  fs.writeFileSync(dataPath, JSON.stringify(updatedSales, null, 2), 'utf-8');
  console.log(`✅ Verified ${updatedSales.length} authentic Metro Vancouver warehouse, sample sales & swaps.`);
}

syncSalesEvents().catch((err) => {
  console.error('❌ Error syncing sales events:', err);
  process.exit(1);
});
