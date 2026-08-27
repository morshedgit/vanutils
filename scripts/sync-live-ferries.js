import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLiveFerries() {
  console.log('🔄 Fetching authentic live BC Ferries capacity...');

  try {
    const res = await fetch('https://bcferriesapi.ca/v2/capacity/');
    if (!res.ok) {
      throw new Error(`Failed to fetch BC Ferries API: ${res.status}`);
    }

    const data = await res.json();
    const liveRoutes = data.routes || [];

    console.log(`✅ Received ${liveRoutes.length} live routes from BC Ferries API.`);

    const routesFilePath = path.join(__dirname, '../src/tools/bc-ferries/data/routes.json');
    const existingData = JSON.parse(fs.readFileSync(routesFilePath, 'utf8'));

    // Map live routes to our existing catalog
    const routeCodeMap = {
      'TSASWB': 'TSA-SWB',
      'HSBNAN': 'HSB-NAN',
      'HSBLNG': 'HSB-LNG',
      'TSADUK': 'TSA-DUK',
      'HSBBOW': 'HSB-BOW',
      'TSASGI': 'TSA-SGI',
      'SWBTSA': 'SWB-TSA',
      'NANHSB': 'NAN-HSB',
      'LNGHSB': 'LNG-HSB',
      'DUKTSA': 'DUK-TSA',
    };

    const updatedRoutes = existingData.map((route) => {
      // Find matching live route
      const matchingLive = liveRoutes.find((lr) => {
        const mappedId = routeCodeMap[lr.routeCode] || `${lr.fromTerminalCode}-${lr.toTerminalCode}`;
        return mappedId === route.id;
      });

      if (matchingLive && matchingLive.sailings && matchingLive.sailings.length > 0) {
        // Filter for upcoming / current sailings with a real published time
        // and vessel assignment — a sailing missing either isn't actionable
        // info and must not be papered over with a fabricated placeholder.
        const activeSailings = matchingLive.sailings
          .filter((s) => s.sailingStatus !== 'past' && s.time && s.vesselName)
          .map((s) => {
            // carFill is % filled. Deck space % available = 100 - carFill
            const fillPercent = typeof s.carFill === 'number' ? s.carFill : (typeof s.fill === 'number' ? s.fill : 0);
            const deckSpaceAvailable = Math.max(0, 100 - fillPercent);

            let standbyRisk = 'low';
            if (deckSpaceAvailable < 15) standbyRisk = 'high';
            else if (deckSpaceAvailable <= 35) standbyRisk = 'moderate';

            return {
              departureTime: s.time,
              arrivalTime: s.arrivalTime || '',
              vesselName: s.vesselName,
              deckSpacePercent: deckSpaceAvailable,
              passengerSpaceAvailable: true,
              isCancelled: s.sailingStatus === 'cancelled',
              delayMinutes: 0,
              standbyRisk: standbyRisk,
              weatherRisk: 'normal',
              statusText: s.sailingStatus === 'cancelled' ? 'Cancelled' : `${deckSpaceAvailable}% Space Available`,
            };
          });

        if (activeSailings.length > 0) {
          route.nextSailings = activeSailings;
          route.lastUpdated = new Date().toISOString();
          route.isStale = false;
        }
      }

      return route;
    });

    fs.writeFileSync(routesFilePath, JSON.stringify(updatedRoutes, null, 2), 'utf8');
    console.log('✅ Successfully updated routes.json with live BC Ferries data!');
  } catch (error) {
    console.error('❌ Error syncing live ferries:', error.message);
  }
}

syncLiveFerries();
