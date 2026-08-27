import type { APIRoute } from 'astro';
import { getLiveWeather } from '../tools/weather-forecast/services/weatherService';
import { getLiveMountains } from '../tools/mountain-snow/services/snowService';
import { getLiveRoutes } from '../tools/bc-ferries/services/ferryService';
import { getLiveCrossings } from '../tools/bridge-traffic/services/bridgeService';
import { getLiveFacilities } from '../tools/health-wait-times/services/healthService';
import { getLiveStations as getLiveAirStations } from '../tools/air-quality/services/airQualityService';
import { getLiveSportsTeams } from '../tools/sports-teams/services/sportsTeamsService';
import { getLiveSalesEvents } from '../tools/sales-events/services/salesService';
import { getLiveMarketHeartbeat } from '../tools/housing-market/services/marketService';
import { getLiveProposals } from '../tools/civic-development/services/civicService';
import { getLiveEvents } from '../tools/community-events/services/eventService';
import { getAllBeaches } from '../tools/can-i-swim/services/vchScraper';
import { getAllNeighbourhoods, evaluateNeighbourhoodSpot } from '../tools/carshare-parking/services/parkingEvaluator';

export const GET: APIRoute = async ({ request }) => {
  const reqUrl = new URL(request.url);
  const host = reqUrl.host;
  const protocol = reqUrl.protocol;
  const baseUrl = host ? `${protocol}//${host}` : 'https://vanheartbeat.ca';
  const nowIso = new Date().toISOString();

  // Concurrent telemetry fetches
  const [
    weather,
    mountainsResult,
    ferriesResult,
    crossingsResult,
    healthResult,
    airResult,
    sportsTeamsResult,
    sales,
    marketResult,
    proposalsResult,
    communityEventsResult,
  ] = await Promise.all([
    getLiveWeather().catch(() => []),
    getLiveMountains(),
    getLiveRoutes(),
    getLiveCrossings(),
    getLiveFacilities(),
    getLiveAirStations(),
    getLiveSportsTeams(),
    getLiveSalesEvents().catch(() => []),
    getLiveMarketHeartbeat(),
    getLiveProposals(),
    getLiveEvents(),
  ]);

  const air = airResult.ok ? airResult.data : [];
  const mountains = mountainsResult.ok ? mountainsResult.data : [];
  const ferries = ferriesResult.ok ? ferriesResult.data : [];
  const crossings = crossingsResult.ok ? crossingsResult.data : [];
  const health = healthResult.ok ? healthResult.data : [];
  const market = marketResult.ok ? marketResult.data : null;
  const sportsTeamsData = sportsTeamsResult.ok ? sportsTeamsResult.data : { teams: [], gameDaySummary: { gamesTodayCount: 0, imminentGame: null } };
  const proposals = proposalsResult.ok ? proposalsResult.data : [];
  const communityEvents = communityEventsResult.ok ? communityEventsResult.data : [];

  const beaches = getAllBeaches();
  const neighbourhoods = getAllNeighbourhoods();

  let markdown = `# VanHeartbeat — Full Live Civic Telemetry & Open Data Feed
> Generated: ${nowIso}
> Canonical URL: ${baseUrl}/llms-full.txt
> Source: Official Municipal, Provincial & Federal Real-Time Data Feeds

---

## 1. Hyper-Local Weather & Microclimates (/weather)
${weather.map((w) => `- **${w.name}** (${w.region}): ${w.current.temperatureCelsius}°C, Feels like ${w.current.feelsLikeCelsius}°C, Condition: ${w.current.condition.replace(/_/g, ' ')}, Wind: ${w.current.windSpeedKmh} km/h ${w.current.windDirection}, Humidity: ${w.current.humidityPercent}%, 24h Rain: ${w.current.precipitation24hMm}mm`).join('\n')}

---

## 2. Mountain Freezing Level & Snow Radar (/snow)
${mountains.map((m) => `- **${m.name}**: 0°C Freezing Level at ${m.currentFreezingLevelMeters}m | Summit Temp: ${m.elevationBands[m.elevationBands.length - 1]?.temperatureCelsius ?? 'N/A'}°C | 24h Snow: ${m.snowfall.last24HoursCm}cm | Base Depth: ${m.snowfall.baseDepthCm}cm`).join('\n')}

---

## 3. BC Ferries Standby Radar (/ferries)
${ferries.map((f) => {
  const nextSailing = f.nextSailings?.[0];
  return `- **${f.name}** (${f.id}): ${nextSailing ? `Next Sailing @ ${nextSailing.departureTime} on ${nextSailing.vesselName} (${nextSailing.deckSpacePercent}% Space Available, Standby Risk: ${nextSailing.standbyRisk.toUpperCase()})` : 'Sailings Concluded for the Day'}`;
}).join('\n')}

---

## 4. Bridge & Tunnel Traffic Radar (/bridges)
${crossings.map((c) => {
  const incCount = c.activeIncidents?.length || 0;
  const p = c.directions.primary;
  return `- **${c.name}** (${c.region}): Status: ${p.status.toUpperCase()} | Travel Time: ${p.travelTimeMinutes} min (+${p.delayMinutes}m delay) | Incidents: ${incCount > 0 ? `${incCount} Active (${c.activeIncidents?.map(i => i.description).join('; ')})` : 'None'}`;
}).join('\n')}

---

## 5. Emergency Room & Urgent Care Wait Times (/health)
${health.map((h) => `- **${h.name}** (${h.facilityType === 'emergency_department' ? 'ER' : 'UPCC'}, ${h.municipality}): Wait Time: ${h.triageData?.waitTimeMinutes !== undefined ? `${h.triageData.waitTimeMinutes} mins (${h.triageData.patientCountWaiting ?? 0} waiting)` : 'Unavailable'} | Address: ${h.address}`).join('\n')}

---

## 6. Vancouver Major Sports Teams Radar (/sports-teams)
${sportsTeamsData.teams.map((t) => `- **${t.name}** (${t.league} - ${t.venue.name}): Record: ${t.standings.record} (${t.standings.points} pts, ${t.standings.streak} streak) | Next Game: ${t.nextGame ? `${t.nextGame.date} vs ${t.nextGame.opponent.name} @ ${t.nextGame.startTimePST} (${t.nextGame.broadcast.tv})` : 'Not yet confirmed'}`).join('\n')}

---

## 7. Car-Share Parking & Towing Clearance (/parking)
${neighbourhoods.map((n) => {
  const evalResult = evaluateNeighbourhoodSpot(n);
  return `- **${n.name}**: Status: ${evalResult.clearanceStatus.toUpperCase()} (${evalResult.primaryReason}) | Permit Zone: ${n.residentialPermitRules.permitZoneCode || 'None'} (Evo Exempt: ${n.residentialPermitRules.evoExempt ? 'Yes' : 'No'})`;
}).join('\n')}

---

## 8. Air Quality & Smoke Radar (/air)
${air.map((a) => `- **${a.name}** (${a.region}): AQHI: ${a.currentAQHI} (${a.riskCategory.toUpperCase()}) | PM2.5: ${a.currentPM25} µg/m³`).join('\n')}

---

## 9. Beach Water Quality & Swimming Safety (/swim)
${beaches.slice(0, 15).map((b) => `- **${b.name}** (${b.municipality}): Status: ${b.currentStatus.toUpperCase()} | E. coli Geometric Mean: ${b.latestSample.eColiCount} CFU/100mL (Safe Limit: 200)`).join('\n')}

---

## 10. Real Estate HPI & Bank of Canada Mortgage Benchmarks (/market)
${market ? `- **Metro Vancouver Composite**: Benchmark Price: $${market.metroOverview.benchmarks[0]?.benchmarkPrice.toLocaleString() || 'N/A'} | Sales-to-Active Ratio: ${market.metroOverview.salesToActiveRatio}% (${market.metroOverview.marketCondition}) | Rental Vacancy: ${market.metroOverview.rental.vacancyRatePercent}%
- **Mortgage Rates**: 5-Year Fixed: ${market.mortgage.fixed5YearBenchmark}% | 5-Year Variable: ${market.mortgage.variable5YearBenchmark}% | Bank of Canada Policy Rate: ${market.mortgage.bocOvernightRate}%` : '- Telemetry syncing'}

---

## 11. Warehouse & Sample Sales Radar (/sales)
${sales.map((s) => `- **${s.name}** (${s.brand}): ${s.startDate} to ${s.endDate} @ ${s.venueName} | Discount: ${s.discountRange} | Entry: ${s.entryType.replace(/_/g, ' ')}`).join('\n')}

---

## 12. Civic Rezoning & Broadway Plan Radar (/civic)
${proposals.map((p) => `- **${p.address}** (${p.neighbourhood}): ${p.storeys} Storeys | ${p.proposedFSR} FSR | ${p.units.totalUnits} Units (${p.units.belowMarketRental} Below-Market) | Status: ${p.status.toUpperCase()}`).join('\n')}

---

## 13. Free Community Events (/events)
${communityEvents.map((e) => `- **${e.title}**: ${e.startDateTime.split('T')[0]} @ ${e.venueName} (${e.neighbourhood}) | Free Admission: Yes | All Ages: ${e.isAllAges ? 'Yes' : 'No'}`).join('\n')}
`;

  return new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
};
