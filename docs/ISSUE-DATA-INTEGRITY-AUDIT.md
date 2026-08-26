# ISSUE #104: [AUDIT] Comprehensive Platform-Wide Data Integrity, Stale Telemetry & Mock/Seed Data Audit

**Status**: Open / Critical Priority  
**Labels**: `data-integrity`, `anti-fake-violation`, `edge-ssr`, `audit`  
**Target Domain**: `https://vanheartbeats.com` (`https://vanheartbeat.ca`)  
**Applicable Rules**: [`AGENTS.md`](file:///users/sadeq/projects/vanutils/AGENTS.md) (100% Real-Data Mandate & Anti-Fake Protocols)

---

## 1. Executive Summary

A comprehensive forensic audit was performed across **all 16 utility modules**, landing pages, subpages, API routes, edge ingestion services, background sync scripts, and JSON data files on `https://vanheartbeats.com`.

The audit identified widespread conflicts with the platform's **100% Real-Data Mandate**:
1. **10 Timestamp-Only Sync Scripts**: Scripts in `scripts/` that do not fetch/parse authentic public telemetry, but merely touch `lastUpdated = new Date().toISOString()`.
2. **Expired / Stale Gameday & Event Records**: Pro sports fixtures locked in **March 2026** (5 months in the past) being presented as "Tonight's Matchup", and community events that passed days ago.
3. **Severe Runtime Edge Ingestion Bugs**:
   - **Housing Market**: Bank of Canada Valet ingestion failing on 100% of SSR requests due to an object key traversal bug (`latestObs.v` vs `latestObs.V39079.v`), serving stale 4.25% mortgage rates instead of the authentic 2.25%.
   - **Local News**: Environment Canada Alert feed requesting a 404 URL (`/rss/warning/bc-74_e.xml`), causing a permanent fake "Coastal Gale Warning" to render.
   - **Civic & Events**: Arbitrary array-index zipping in Civic Development and Community Events, creating corrupted "Frankenstein" records.
4. **Widespread Hardcoded Card Fluff**: 14 of 16 mini-charts and gauges in [`ToolCard.astro`](file:///users/sadeq/projects/vanutils/src/components/shared/ToolCard.astro) on the home page bypass live telemetry and render hardcoded SVG curves, static percentages, and hardcoded text numbers.
5. **Synthetic Math Calculations**: Patient counts in ER wait times generated via division formulas (`waitMinutes / 12`, `waitMinutes / 8`), and duplicate weekly E. coli data points generated for beach sparklines.

---

## 2. Comprehensive Tool-by-Tool Audit Findings

### 🏒 Tool 1: Major Sports Teams Radar (`/sports-teams`, `[team].astro`)
* **Severity**: 🔴 Critical
* **Affected Files**:
  - [`src/tools/sports-teams/data/teams.json`](file:///users/sadeq/projects/vanutils/src/tools/sports-teams/data/teams.json#L66-L86)
  - [`src/tools/sports-teams/services/sportsTeamsService.ts`](file:///users/sadeq/projects/vanutils/src/tools/sports-teams/services/sportsTeamsService.ts#L58-L76)
  - [`scripts/sync-live-sports-teams.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-sports-teams.js#L18-L34)
  - [`src/config/tools.ts`](file:///users/sadeq/projects/vanutils/src/config/tools.ts#L35-L39)
* **Issues Identified**:
  1. **5-Month-Old Stale Fixtures**: Every team in `teams.json` (Canucks, Whitecaps, BC Lions, Canadians) has its `nextGame.date` set to **March 2026** (e.g. Canucks vs Flames on March 27, 2026; Whitecaps on March 28, 2026; BC Lions on March 27, 2026). In August 2026, these are 5 months in the past.
  2. **Inverted Imminent Game Selector**: In `sportsTeamsService.ts` (`getGameDaySummary`), the fallback sorting `dateA - dateB` selects the oldest expired game from March 2026 and displays it as "Next Matchup Tonight" across the platform.
  3. **Stale Registry Preview Stat**: `tools.ts` displays `Canucks vs CGY • Next Game • 7:00 PM` which has been expired since March.
  4. **No-Op Sync Script**: `scripts/sync-live-sports-teams.js` tests if the NHL API is reachable, but then runs `fs.writeFileSync(teamsFilePath, JSON.stringify(existingTeams, null, 2))` without updating or parsing team schedules or standings.

---

### 📈 Tool 2: Real Estate & Rental Pulse (`/market`, `[submarket].astro`)
* **Severity**: 🔴 Critical
* **Affected Files**:
  - [`src/tools/housing-market/services/marketService.ts`](file:///users/sadeq/projects/vanutils/src/tools/housing-market/services/marketService.ts#L16-L34)
  - [`src/tools/housing-market/data/mortgage.json`](file:///users/sadeq/projects/vanutils/src/tools/housing-market/data/mortgage.json#L1-L8)
  - [`scripts/sync-live-market.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-market.js#L26-L56)
* **Issues Identified**:
  1. **Broken Bank of Canada Valet Ingestion**: The Bank of Canada Valet API endpoint (`https://www.bankofcanada.ca/valet/observations/V39079/json?recent=1`) returns observation objects structured as `{ d: "2026-08-24", V39079: { v: "2.25" } }`. In `marketService.ts` (L22), the code parses `latestObs.v`, which evaluates to `undefined` (`parseFloat(undefined) => NaN`). Consequently, the live rate update fails silently on 100% of Edge SSR requests.
  2. **Stale Interest Rates Served**: Because live ingestion fails, users receive the hardcoded 4.25% BoC rate and 6.89% stress test rate in `mortgage.json` instead of the actual 2.25% policy rate.
  3. **Wrong Endpoint in Sync Script**: `scripts/sync-live-market.js` queries `FX_RATES_DAILY` (Foreign Exchange Currency Rates) instead of mortgage/policy rates, ignores the response, and writes `lastUpdated = nowIso` over static data.

---

### 📰 Tool 3: Local News & Alerts (`/news`, `[slug].astro`)
* **Severity**: 🔴 Critical
* **Affected Files**:
  - [`src/tools/local-news/services/newsService.ts`](file:///users/sadeq/projects/vanutils/src/tools/local-news/services/newsService.ts#L13-L39)
  - [`src/tools/local-news/data/alerts.json`](file:///users/sadeq/projects/vanutils/src/tools/local-news/data/alerts.json#L1-L13)
  - [`scripts/sync-live-news.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-news.js#L24-L52)
* **Issues Identified**:
  1. **404 Environment Canada Alert Feed**: `getLiveBreakingAlerts()` queries `https://weather.gc.ca/rss/warning/bc-74_e.xml` which returns an HTTP 404 error (ECCC feed is located under `/rss/city/bc-74_e.xml` or `/rss/battleboard/bc42_e.xml`).
  2. **Phantom Emergency Warning**: Because the live alert fetch always fails, it falls back to `BASELINE_ALERTS` in `alerts.json`. This hardcoded "Coastal Gale & Marine Wind Warning in Effect" is perpetually displayed as an active alert, even during clear weather.
  3. **Timestamp-Only News Sync**: `scripts/sync-live-news.js` pings CBC RSS, ignores the payload, and overwrites publication timestamps on old static articles with `new Date().toISOString()`.

---

### 🌊 Tool 4: Can I Swim? Water Quality Radar (`/swim`, `[slug].astro`)
* **Severity**: 🟠 Major
* **Affected Files**:
  - [`src/tools/can-i-swim/services/vchScraper.ts`](file:///users/sadeq/projects/vanutils/src/tools/can-i-swim/services/vchScraper.ts#L12-L55)
  - [`src/tools/can-i-swim/services/ingestionService.ts`](file:///users/sadeq/projects/vanutils/src/tools/can-i-swim/services/ingestionService.ts#L41-L58)
  - [`scripts/scrape-official-data.js`](file:///users/sadeq/projects/vanutils/scripts/scrape-official-data.js#L606-L649)
  - [`scripts/sync-data.js`](file:///users/sadeq/projects/vanutils/scripts/sync-data.js#L1-L45)
* **Issues Identified**:
  1. **ArcGIS Layer Misattribution**: `vchScraper.ts` queries Metro Vancouver GIS `Beach_Site/FeatureServer/8` expecting `attr.EColi`. However, Layer 8 contains only static point geometries and site names (`["beachname", "municipality", "geometry"]`), with no E. coli sampling attributes. The code always falls back to static baseline values while setting `isStale: false`.
  2. **Duplicated Flat Sparklines**: `scripts/scrape-official-data.js` constructs 5 weekly historical records by replicating the static `baseEColi` value across 5 dates (`2026-07-18`, `2026-07-25`, `2026-08-01`, `2026-08-08`, `2026-08-14`), resulting in artificial flat trendlines and identical rows in the history table.
  3. **Mock Scraper in Ingestion Service**: `scrapeVCHWaterQuality()` in `ingestionService.ts` returns a static array of mock beach samples stamped with `new Date().toISOString()`.
  4. **Non-Functional Sync Script**: `scripts/sync-data.js` simply reads `beaches.json`, counts the status flags, and prints to console without updating any data.

---

### 🏷️ Tool 5: Warehouse & Sample Sales (`/sales`, `[sale].astro`)
* **Severity**: 🟠 Major
* **Affected Files**:
  - [`src/tools/sales-events/services/salesService.ts`](file:///users/sadeq/projects/vanutils/src/tools/sales-events/services/salesService.ts#L33-L79)
  - [`scripts/sync-live-sales.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-sales.js#L8-L31)
* **Issues Identified**:
  1. **Disguised Static Fallback**: `getLiveSalesEvents()` calls City of Vancouver `special-events` API, ignores the response, and returns static records from `sales.json`.
  2. **Timestamp-Only Sync**: `scripts/sync-live-sales.js` only updates `lastUpdated = nowIso` on static records without authentic scraping.
  3. **Hardcoded Stats**: `getSalesOverviewStats()` hardcodes `avgDiscountPercent: 65`.

---

### 🎒 Tool 6: School Catchment & Childcare (`/schools`, `[school].astro`)
* **Severity**: 🟠 Major
* **Affected Files**:
  - [`src/tools/school-catchment/services/catchmentService.ts`](file:///users/sadeq/projects/vanutils/src/tools/school-catchment/services/catchmentService.ts#L12-L32)
  - [`src/tools/school-catchment/data/schools.json`](file:///users/sadeq/projects/vanutils/src/tools/school-catchment/data/schools.json)
  - [`scripts/sync-live-schools.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-schools.js#L8-L28)
  - [`src/config/tools.ts`](file:///users/sadeq/projects/vanutils/src/config/tools.ts#L313-L318)
* **Issues Identified**:
  1. **Disguised Open Data Request**: `getLiveSchools()` queries Open Data records, ignores them, and returns `BASELINE_SCHOOLS` mapped with `lastUpdated = now.toISOString()` and `isStale: false` (even on error).
  2. **Timestamp-Only Sync**: `sync-live-schools.js` merely touches timestamps.
  3. **Registry Discrepancy**: `tools.ts` advertises `18 Catchments`, but `schools.json` contains only 9 schools.

---

### 🏛️ Tool 7: Development & Rezoning (`/civic`, `[id].astro`)
* **Severity**: 🔴 Critical
* **Affected Files**:
  - [`src/tools/civic-development/services/civicService.ts`](file:///users/sadeq/projects/vanutils/src/tools/civic-development/services/civicService.ts#L10-L42)
  - [`scripts/sync-live-civic.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-civic.js#L8-L28)
  - [`src/config/tools.ts`](file:///users/sadeq/projects/vanutils/src/config/tools.ts#L334-L339)
* **Issues Identified**:
  1. **Corrupting Array-Index Zipping**: `getLiveProposals()` maps `BASELINE_PROPOSALS[idx]` to `liveRecords[idx]` by array index. If the first record from City Open Data is a low-rise in East Van, it overwrites the address of a 40-storey Downtown proposal while retaining the Downtown units, storeys, and architect.
  2. **Silent Failure Stale Flag**: When the API fails, it sets `isStale: false` and `lastUpdated = now.toISOString()`.
  3. **Timestamp-Only Sync**: `sync-live-civic.js` merely updates timestamps.
  4. **Registry Discrepancy**: `tools.ts` displays `38 Towers`, but `proposals.json` only contains 7 proposals (and only 4 towers $\ge 20$ storeys).

---

### 🎉 Tool 8: Free & Local Community Events (`/events`, `[event].astro`)
* **Severity**: 🔴 Critical
* **Affected Files**:
  - [`src/tools/community-events/services/eventService.ts`](file:///users/sadeq/projects/vanutils/src/tools/community-events/services/eventService.ts#L10-L43)
  - [`src/tools/community-events/data/events.json`](file:///users/sadeq/projects/vanutils/src/tools/community-events/data/events.json#L1-L90)
  - [`scripts/sync-live-events.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-events.js#L8-L28)
* **Issues Identified**:
  1. **Corrupting Array-Index Zipping**: `getLiveEvents()` zips `BASELINE_EVENTS[idx]` with `liveRecords[idx]`, overwriting event titles and locations with unrelated events while keeping baseline descriptions, coordinates, and dates.
  2. **Past Events in Seed Data**: `events.json` includes expired events:
     - *Car-Free Day Commercial Drive*: `startDateTime: 2026-08-23T19:00:00Z` (expired).
     - *Kitsilano Farmers Market*: `startDateTime: 2026-08-23T17:00:00Z` (expired).
     - *Stanley Park Summer Cinema*: `startDateTime: 2026-08-25T03:30:00Z` (expired).
  3. **Timestamp-Only Sync**: `sync-live-events.js` merely touches timestamps.

---

### 🏅 Tool 9: Sports, Courts & Rec Radar (`/sports`, `[facility].astro`)
* **Severity**: 🟠 Major
* **Affected Files**:
  - [`src/tools/sports-facilities/services/sportsService.ts`](file:///users/sadeq/projects/vanutils/src/tools/sports-facilities/services/sportsService.ts#L10-L34)
  - [`scripts/sync-live-sports.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-sports.js#L8-L29)
  - [`src/config/tools.ts`](file:///users/sadeq/projects/vanutils/src/config/tools.ts#L228-L233)
* **Issues Identified**:
  1. **Heuristic Open/Closed Status**: `sportsService.ts` ignores Park Board facility feeds and calculates `isOpenNow` using a fixed rule (`hour >= 6 && hour < 22`) for all indoor rinks, pools, and courts regardless of actual session schedules.
  2. **Timestamp-Only Sync**: `sync-live-sports.js` only touches timestamps.
  3. **Registry Discrepancy**: `tools.ts` displays `84 Courts`, but `facilities.json` contains only 51 courts across 9 facilities.

---

### 💨 Tool 10: Wildfire Smoke & AQHI (`/air`, `[station].astro`)
* **Severity**: 🟠 Major
* **Affected Files**:
  - [`src/tools/air-quality/services/airQualityService.ts`](file:///users/sadeq/projects/vanutils/src/tools/air-quality/services/airQualityService.ts#L12-L48)
* **Issues Identified**:
  1. **Regional Station Homogenization**: `getLiveStations()` queries Open-Meteo for Downtown Vancouver coordinates only (`lat 49.2827, lng -123.1207`) and broadcasts the exact same PM2.5 and AQHI reading across all 11 stations in Metro Vancouver (North Van, Richmond, Langley, Abbotsford, Hope).
  2. **Silent Failure Overwrite**: Returns `isStale: false` and `lastSampledTime: now.toISOString()` when edge fetch fails.

---

### 🏥 Tool 11: ER & Urgent Care Radar (`/health`, `[facility].astro`)
* **Severity**: 🟠 Major
* **Affected Files**:
  - [`scripts/sync-live-health.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-health.js#L88-L96)
  - [`src/tools/health-wait-times/services/healthService.ts`](file:///users/sadeq/projects/vanutils/src/tools/health-wait-times/services/healthService.ts#L25-L60)
* **Issues Identified**:
  1. **Synthetic Mathematical Patient Counts**: In `sync-live-health.js`, patient counts are fabricated using mathematical formulas (`Math.round(waitMinutes / 12)` for waiting, `Math.round(waitMinutes / 8)` for treating), violating Rule 1 of `AGENTS.md`.
  2. **Unsynchronized Patient Counts at Runtime**: `healthService.ts` updates wait times on the edge SSR but leaves the static/synthetic patient counts untouched.

---

### 🚗 Tool 12: Car-Share Safe Parking (`/parking`, `[neighbourhood].astro`)
* **Severity**: 🟡 Moderate
* **Affected Files**:
  - [`src/tools/carshare-parking/services/parkingEvaluator.ts`](file:///users/sadeq/projects/vanutils/src/tools/carshare-parking/services/parkingEvaluator.ts#L84-L127)
  - [`scripts/sync-live-parking.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-parking.js#L8-L34)
* **Issues Identified**:
  1. **Synthetic Street Sweeping Object**: `parkingEvaluator.ts` generates sweeping records with `nextSweepStart = date.toISOString()`, `nextSweepEnd = date.toISOString()`, and hardcoded `isWithin24Hours: false`.
  2. **Hardcoded Coordinates in Evaluator**: `evaluateNeighbourhoodSpot` hardcodes `latitude: 49.2827, longitude: -123.1207` for all neighbourhoods.
  3. **No-Op Sync Script**: `sync-live-parking.js` pings Open Data but never writes or updates dataset.

---

### 🚢 Tool 13: Ferry Standby Radar (`/ferries`, `[route].astro`)
* **Severity**: 🟡 Moderate
* **Affected Files**:
  - [`src/tools/bc-ferries/services/ferryService.ts`](file:///users/sadeq/projects/vanutils/src/tools/bc-ferries/services/ferryService.ts#L89-L127)
* **Issues Identified**:
  1. **Hardcoded SeaBus Departures**: `getSeaBusLiveStatus()` hardcodes departure strings ("In 6 mins", "In 4 mins") and static vessel names (`Burrard Otter II`, `Burrard Chinook`).
  2. **Fabricated Marine Weather**: `getMarineWeatherStatus()` returns hardcoded weather numbers (12 knots NW, 0.6m waves, 13.5°C water) with `lastUpdated = now.toISOString()`.

---

### 🌉 Tool 14: Bridges & Tunnel Radar (`/bridges`, `[crossing].astro`)
* **Severity**: 🟡 Moderate
* **Affected Files**:
  - [`scripts/sync-live-bridges.js`](file:///users/sadeq/projects/vanutils/scripts/sync-live-bridges.js#L19-L38)
  - [`src/tools/bridge-traffic/services/bridgeService.ts`](file:///users/sadeq/projects/vanutils/src/tools/bridge-traffic/services/bridgeService.ts#L144-L160)
* **Issues Identified**:
  1. **Timestamp-Only Sync**: `sync-live-bridges.js` checks Open511 but simply updates `lastUpdated` on static crossing delays.
  2. **Synthesized Delays from Baseline**: `bridgeService.ts` adds fixed penalties (+14m for major, +6m for minor) to hardcoded baseline delay numbers from `crossings.json`.

---

### ❄️ Tool 15: Mountain Snow Line (`/snow`, `[mountain].astro`)
* **Severity**: 🟢 Minor / Clean Telemetry
* **Affected Files**:
  - [`src/tools/mountain-snow/data/mountains.json`](file:///users/sadeq/projects/vanutils/src/tools/mountain-snow/data/mountains.json#L45)
* **Status**: Open-Meteo atmospheric soundings are 100% authentic and working. Only minor observation: access road `lastReported` timestamp is static (`2026-08-17`).

---

### 🌦️ Tool 16: Microclimate Weather Radar (`/weather`, `[station].astro`)
* **Severity**: 🟢 Minor / Clean Telemetry
* **Affected Files**:
  - [`src/pages/weather/index.astro`](file:///users/sadeq/projects/vanutils/src/pages/weather/index.astro#L51)
* **Status**: Open-Meteo per-station weather ingestion is 100% authentic and working. Only minor observation: FAQ copy claims direct ingestion from ECCC weather stations when Open-Meteo HRDPS is used.

---

## 3. Homepage Card Telemetry Audit (`src/components/shared/ToolCard.astro`)

The mini-charts and gauges rendered inside [`ToolCard.astro`](file:///users/sadeq/projects/vanutils/src/components/shared/ToolCard.astro) on `https://vanheartbeats.com` exhibit severe hardcoded mock implementations:

| Utility Card | Card Header Badge | Mini-Chart / Visual Telemetry in Card | Real Data vs Mock |
| :--- | :--- | :--- | :--- |
| **Can I Swim** | Dynamic safe count | Hardcoded "Avg 32 CFU", hardcoded SVG bezier path | ❌ Mock Wave |
| **BC Ferries** | "Live Deck %" | Hardcoded 72%, 86%, 40% progress bars (ignores live route data) | ❌ Mock Bars |
| **Mountain Snow** | Dynamic freezing level | Elevation comparison chart | ⚠️ Static heights |
| **Car-Share Parking** | Hardcoded "8/8 Safe Zones" | Hardcoded 35/25/40% timeline, hardcoded "In 4 days (Zone 8A)" | ❌ Mock Timeline |
| **ER & Urgent Care** | Hardcoded "1h 15m Min ER" | Hardcoded 1h 15m (25%), 2h 10m (55%), 3h 05m (80%) wait bars | ❌ Mock Bars |
| **Bridges & Crossings** | Hardcoded "2 NB Active" | Hardcoded "2 Lanes NB", "Massey: 1 Tube SB", "Oak St: +4m" | ❌ Mock Strings |
| **Air Quality** | Hardcoded "AQHI 2 (Low)" | Hardcoded "AQHI 2", static SVG curve, fixed needle at 15% | ❌ Mock Sparkline |
| **Civic Development** | Hardcoded "38 Towers" | Hardcoded 6 silhouette bars, hardcoded "Avg 28st / 11.5 FSR" | ❌ Mock Chart |
| **Community Events** | Hardcoded "6 Free This Wk" | Hardcoded "6 This Weekend", static 7-bar activity chart | ❌ Mock Chart |
| **School Catchment** | "VSB SD39" | Hardcoded 60% English, 25% French, 15% Annex bars | ❌ Mock Proportion |
| **Local News** | "Live Wire" | Static decorative audio pulse bars | ❌ Mock Wave |
| **Housing Market** | Hardcoded "18.4% SAR" | Hardcoded "18.4% Balanced", "Condo $780k", "Rent $2,650" | ❌ Mock Gauge |
| **Sports Courts** | Hardcoded "84 Courts" | Hardcoded 84 hubs, 45% / 25% / 18% / 12% static breakdown | ❌ Mock Donut |
| **Warehouse Sales** | Dynamic sales count | Hardcoded "🔥 Aritzia Annual Warehouse Sale", "Aug 27–Sep 1" | ❌ Mock Banner |
| **Sports Teams** | Dynamic team count | Selects expired March 2026 game as "Next Matchup Tonight" | ❌ Expired Match |
| **Weather Radar** | Dynamic avg temp | Embedded Windy.com iframe + dynamic station rows | 🟢 Authentic |

---

## 4. Platform Pages & Global Metadata Audit

- **[`src/pages/about.astro`](file:///users/sadeq/projects/vanutils/src/pages/about.astro#L53)** (L53): Copy states *"Every metric displayed across all 13 tools..."* while platform has 16 active tools.
- **Canonical & Domain References**: Inconsistent mixing of `https://vanheartbeat.ca` (canonical in layout/schemas) and `https://vanheartbeat.com` (in `astro.config.mjs` and contact page).
- **Public API Route Handlers (`src/pages/api/*`)**: API endpoints reflect their underlying service implementations (e.g. `/api/market` reflects the Valet parsing failure; `/api/civic` and `/api/events` reflect array zipping).

---

## 5. Remediation Action Plan

### Phase 1: Fix Live Runtime Ingestion Bugs (Critical)
- [x] **Housing Market**: Fix Valet API traversal in `marketService.ts` to inspect `latestObs.V39079?.v || latestObs.v`. Update `mortgage.json` baseline to authentic current rate (2.25%).
- [x] **Sports Teams**: Update `teams.json` with active current season schedules (MLS, CFL, CPL, Canadians) and ensure offseason teams (Canucks/NHL) display authentic standings and preseason schedules instead of expired March fixtures.
- [x] **Local News**: Ingest live CBC British Columbia news wire and purge phantom gale warning from `alerts.json`.
- [x] **Civic & Events**: Replace corrupting array-index zipping with authentic ID/slug matching or pure catalog filtering. Purge expired events from `events.json`.
- [x] **Air Quality**: Implement per-station coordinate queries in `airQualityService.ts` rather than broadcasting Downtown Vancouver telemetry to all stations.

### Phase 2: Eliminate Hardcoded Mock UI in `ToolCard.astro`
- [x] Bind all card badges, progress bars, and stats to the computed `getLive...()` data passed into `ToolCard.astro`.
- [x] Remove hardcoded static percentages, fake SVG curves, and hardcoded text strings.

### Phase 3: Replace Timestamp-Only Sync Scripts with Authentic Ingestion
- [x] Implement authentic scrapers in `scripts/sync-live-sales.js`, `scripts/sync-live-schools.js`, `scripts/sync-live-civic.js`, `scripts/sync-live-events.js`, `scripts/sync-live-sports.js`, `scripts/sync-live-news.js`, and `scripts/sync-live-bridges.js`.
- [x] Eliminate mathematical patient count generators from `sync-live-health.js`.
- [x] Fix `scrape-official-data.js` and `ingestionService.ts` to eliminate synthetic randomizers and mock returns.

### Phase 4: Verification & Audit Compliance
- [x] Run `npm run data:sync:all` and verify all 16 tools ingest authentic public feeds.
- [x] Audit `grep -rn "Math.sin"` and `grep -rn "Math.random"` across `src/` and `scripts/`.
- [x] Verify `npm run check` and `npm run build` pass on Cloudflare Pages SSR.
