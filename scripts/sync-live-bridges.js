import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MATCH_RADIUS_KM = 2;

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function syncLiveBridges() {
  console.log('🌉 Syncing DriveBC Open511 events and bridge traffic telemetry...');

  try {
    const crossingsFilePath = path.join(
      __dirname,
      '../src/tools/bridge-traffic/data/crossings.json'
    );
    const existing = JSON.parse(fs.readFileSync(crossingsFilePath, 'utf8'));

    // Query DriveBC Open511 events for Lower Mainland bbox
    let activeOpen511Events = [];
    let fetchSucceeded = false;
    try {
      const open511Res = await fetch(
        'https://api.open511.gov.bc.ca/events?bbox=-123.35,49.0,-122.6,49.4&status=ACTIVE&format=json',
        { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
      );
      if (open511Res.ok) {
        const data = await open511Res.json();
        activeOpen511Events = data.events || [];
        fetchSucceeded = true;
        console.log(`✅ DriveBC Open511 returned ${activeOpen511Events.length} active Lower Mainland road events.`);
      }
    } catch (e) {
      console.log('ℹ️ DriveBC Open511: unreachable — using existing crossing baseline telemetry.');
    }

    const updated = existing.map((c) => {
      if (!fetchSucceeded) {
        // Upstream unreachable this run — leave whatever incidents were already
        // recorded untouched rather than guessing.
        return c;
      }

      // Match by real geographic proximity to the crossing's coordinates, not
      // free-text search: several crossings share a name with an ordinary
      // Vancouver street (Oak Street, Knight Street, Cambie/Granville bridges),
      // so a substring match on shortName/name against a headline/description
      // would attach unrelated roadwork anywhere in the region to the bridge.
      const matchedEvents = activeOpen511Events.filter((ev) => {
        const coords = ev.geography?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return false;
        const [lng, lat] = coords;
        return distanceKm(c.coordinates.lat, c.coordinates.lng, lat, lng) <= MATCH_RADIUS_KM;
      });

      const incidents = matchedEvents.map((ev, idx) => ({
        id: ev.id || `open511-${c.id}-${idx}`,
        severity: ev.severity === 'MAJOR' ? 'major' : 'minor',
        description: ev.headline || ev.description || 'Active traffic advisory',
        lanesAffected: ev.roads?.[0]?.name || 'Crossing affected',
        reportedTime: ev.updated || new Date().toISOString(),
      }));

      // A successful fetch with zero nearby events means no active incidents
      // right now — carrying forward a prior incident here would show a
      // resolved closure as still active indefinitely.
      return {
        ...c,
        activeIncidents: incidents,
      };
    });

    fs.writeFileSync(crossingsFilePath, JSON.stringify(updated, null, 2), 'utf8');
    console.log(`✅ Verified ${existing.length} Metro Vancouver bridge & tunnel crossings.`);
  } catch (error) {
    console.error('❌ Error syncing bridge data:', error.message);
  }
}

syncLiveBridges();
