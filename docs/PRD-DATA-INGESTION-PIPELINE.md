# Product Requirements Document (PRD) — VanUtils: Unified Real-Data Ingestion & Autonomous Edge Telemetry Pipeline

## 1. Executive Summary & Problem Statement

### 1.1 Objective
Upgrade all 13 VanUtils micro-utilities from static baseline snapshots to **100% authentic, end-to-end live edge ingestion and automated scheduled synchronization**, strictly enforcing the **100% Real-Data Mandate** and the **1.2-Second Dynamic Edge Loader Protocol**.

### 1.2 The Problem
While VanUtils has established robust TypeScript schemas, responsive Tailwind UI components, and Edge SSR routing, an audit of the codebase reveals that several data feeds currently:
1. Rely on build-time timestamp stamping (`new Date().toISOString()`) on static baseline JSON rather than fully parsing and mapping upstream payloads.
2. Lack dynamic runtime Edge fetch loaders (`getLive<ToolData>()`) with 1.2s fast timeouts and fallback protocols.
3. Lack automated edge parsers for public government XML/RSS feeds (CBC, ECCC Weather, City of Vancouver Notices) and GeoJSON datasets (Metro Vancouver ArcGIS, Open511, City Open Data).

### 1.3 The Solution
Implement a **Unified Ingestion & Edge Telemetry Pipeline** that:
- Connects directly to verified municipal, provincial, and federal open endpoints.
- Implements lightweight, zero-dependency Edge parsers for GeoJSON, RSS/XML, and REST payloads.
- Enforces runtime Edge loaders (`AbortSignal.timeout(1200)`) with graceful failover to verified snapshots (`isStale: true`).
- Provides automated cron synchronization scripts to keep offline snapshots continuously refreshed.

---

## 2. Ingestion Architecture & Standards

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                LIVE UPSTREAM DATA SOURCES (100% REAL DATA)                         |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
  [Metro Van ArcGIS Server]    [DriveBC Open511 REST]    [Bank of Canada Valet]   [ECCC CAP Weather]
  [BC Ferries Capacity API]    [Open-Meteo Soundings]    [City of Van Open Data]  [CBC Vancouver RSS]
  [EnvistaWeb BAM-1020 Air]    [VCH / Fraser Health]     [VSB SD39 GIS Portal]    [CMHC HMIP Open Data]
                                                 │
                                                 ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                CLOUDFLARE EDGE INGESTION LAYER                                    |
|  - Fast 1.2s Fast Timeout Loader Protocol (`AbortSignal.timeout(1200)`)                           |
|  - Lightweight Edge Parsers: `xmlParser.ts`, `geoJsonNormalizer.ts`, `tableExtractor.ts`          |
|  - In-Memory YVR Edge Cache with Tiered SWR (`public, s-maxage=..., stale-while-revalidate=...`)  |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                 │
                                                 ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                RESILIENT REAL-DATA SNAPSHOT FALLBACK                              |
|  - Primary: Live Upstream Response (0ms - 1200ms)                                                 |
|  - Secondary: Cloudflare KV / Edge Cache Hit                                                      |
|  - Failover: Last-Known Verified Snapshot with explicit timestamp & `isStale: true`               |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Comprehensive Tool-by-Tool Ingestion Specifications

### Tool #1: Can I Swim Today? (`/swim`)
- **Upstream Source 1**: Metro Vancouver GIS Enterprise FeatureServer (`gis.metrovancouver.org/arcgis/rest/services/Hosted/Beach_Sampling_Site/FeatureServer/2/query`)
- **Upstream Source 2**: Vancouver Coastal Health & Fraser Health Recreational Beach Surveillance Tables
- **Edge Ingestion Service**: `src/tools/can-i-swim/services/vchScraper.ts`
  - Implement `getLiveBeaches()` fetching live sampling geometry and latest E. coli single/geo-mean counts.
  - Automatically calculate status (🟢 $\le 200$, 🟡 $235-400$, 🔴 $> 400$ CFU/100mL).
- **Cache Policy**: `s-maxage=1800, stale-while-revalidate=7200` (30 min).

### Tool #2: Ferry Standby Radar (`/ferries`)
- **Upstream Source 1**: BC Ferries API v2 (`bcferriesapi.ca/v2/capacity/`)
- **Upstream Source 2**: DriveBC Highway Webcams (Hwy 17 Tsawwassen & Hwy 1 Horseshoe Bay approach feeds)
- **Edge Ingestion Service**: `src/tools/bc-ferries/services/ferryService.ts`
  - Dynamic route matching (`TSA-SWB`, `HSB-NAN`, `HSB-LNG`, `TSA-DUK`, `HSB-BOW`).
  - Calculate real-time deck capacity % and standby odds (🟢 $>35\%$, 🟡 $15-35\%$, 🔴 $<15\%$).
  - Dynamic SeaBus headway calculation from Vancouver local time (10 min peak, 15 min off-peak, 30 min night).
- **Cache Policy**: `s-maxage=60, stale-while-revalidate=120` (1 min).

### Tool #3: Mountain Snow Line & Elevation Matrix (`/snow`)
- **Upstream Source 1**: Open-Meteo High-Resolution Atmospheric Soundings (`api.open-meteo.com/v1/forecast` with exact mountain summit/base elevations)
- **Upstream Source 2**: Avalanche Canada Public Forecast API (`api.avalanche.ca/forecasts/en/products/point`) for South Coast & Sea-to-Sky danger ratings
- **Upstream Source 3**: DriveBC RWIS Road Telemetry for Cypress Bowl Rd, Mount Seymour Rd, and Sea-to-Sky Hwy 99
- **Edge Ingestion Service**: `src/tools/mountain-snow/services/snowService.ts`
  - Compute freezing level elevation (meters), 24h snowfall accumulation, and elevation-band precipitation (powder $\le -1.5^\circ\text{C}$, wet snow $-1.5\text{ to }+1.5^\circ\text{C}$, rain $>1.5^\circ\text{C}$).
- **Cache Policy**: `s-maxage=300, stale-while-revalidate=600` (5 min).

### Tool #4: Car-Share & Evo Parking Radar (`/parking`)
- **Upstream Source 1**: City of Vancouver Open Data API (`street-sweeping-schedules`, `parking-meter-rates-and-time-limits`)
- **Upstream Source 2**: City of Vancouver GIS Residential Parking Permit Sub-Zones
- **Edge Ingestion Service**: `src/tools/carshare-parking/services/parkingEvaluator.ts`
  - Point-in-polygon evaluation against Vancouver Home Zone and permit zones.
  - Active rush-hour lane countdown (e.g., 3:00 PM – 6:00 PM West Georgia / Burrard restrictions).
  - Satellite lot guides for YVR Airport, UBC Parkades, SFU, and ferry terminals.
- **Cache Policy**: `s-maxage=3600, stale-while-revalidate=86400` (1 hour).

### Tool #5: ER & Urgent Care Radar (`/health`)
- **Upstream Source 1**: Vancouver Coastal Health (VCH) & Fraser Health ED Wait Time Feeds (`edwaittimes.ca` / public REST endpoints)
- **Upstream Source 2**: HealthLink BC Directory for Urgent and Primary Care Centre (UPCC) operating hours and clinic intake capacity
- **Edge Ingestion Service**: `src/tools/health-wait-times/services/healthService.ts`
  - Parse real-time estimated time to physician (e.g. VGH, St. Paul's, BC Children's, Lions Gate, Richmond, Surrey Memorial).
  - Classify triage intensity (🟢 $< 1.5$h, 🟡 $1.5-3.5$h, 🔴 $> 3.5$h).
- **Cache Policy**: `s-maxage=300, stale-while-revalidate=600` (5 min).

### Tool #6: Vancouver Bridges & Tunnel Bottleneck Radar (`/bridges`)
- **Upstream Source 1**: DriveBC Open511 Events & Incident API (`api.open511.gov.bc.ca/events?bbox=-123.35,49.0,-122.6,49.4&status=ACTIVE`)
- **Upstream Source 2**: Ministry of Transportation and Infrastructure (MOTI) ITS Sensor Feeds
- **Edge Ingestion Service**: `src/tools/bridge-traffic/services/bridgeService.ts`
  - Dynamically query Open511 on the edge for active lane blockages, accidents, and stalls across 10 crossings.
  - Dynamic Vancouver local time counterflow lane visualizer for Lions Gate Bridge, Alex Fraser Road Zipper, and Massey Tunnel.
- **Cache Policy**: `s-maxage=60, stale-while-revalidate=120` (1 min).

### Tool #7: Wildfire Smoke & AQHI Radar (`/air`)
- **Upstream Source 1**: Metro Vancouver Air Quality Monitoring Network / BC EnvistaWeb API (`envistaweb.env.gov.bc.ca/aqo/api/station/latest`)
- **Upstream Source 2**: City of Vancouver Cooling Centre Open Dataset (Air-conditioned clean-air shelters with HEPA filtration)
- **Edge Ingestion Service**: `src/tools/air-quality/services/airQualityService.ts`
  - Ingest continuous hourly $PM_{2.5}$ ($\mu\text{g/m}^3$), $O_3$, $NO_2$, and AQHI ratings across 12 monitoring stations (Robson Square, Clark Drive, Kitsilano, North Vancouver, Richmond, Burnaby, etc.).
- **Cache Policy**: `s-maxage=600, stale-while-revalidate=1800` (10 min).

### Tool #8: Vancouver Development & Rezoning Radar (`/civic`)
- **Upstream Source 1**: City of Vancouver Open Data Portal (`rezoning-applications` & `development-applications` GeoJSON REST APIs)
- **Upstream Source 2**: City Clerk Council Meeting Agenda & Public Hearing Schedules
- **Edge Ingestion Service**: `src/tools/civic-development/services/civicService.ts`
  - Ingest active rezoning applications with storeys, heights, proposed FSR, rental unit mixes, and public hearing dates.
  - Compute spatial proximity radius (250m, 500m, 1000m) at the Cloudflare Edge.
- **Cache Policy**: `s-maxage=3600, stale-while-revalidate=86400` (1 hour).

### Tool #9: Free Community Events Radar (`/events`)
- **Upstream Source 1**: City of Vancouver Special Events & Film Permits Open Data API
- **Upstream Source 2**: Vancouver Park Board Recreational & Cultural Activity Feed
- **Upstream Source 3**: Vancouver Public Library (VPL) Program Directory API
- **Edge Ingestion Service**: `src/tools/community-events/services/eventService.ts`
  - Filter strictly for 100% free-admission, all-ages, community gatherings, park movies, and street festivals.
- **Cache Policy**: `s-maxage=1800, stale-while-revalidate=7200` (30 min).

### Tool #10: VSB School Catchment & Licensed Childcare Navigator (`/schools`)
- **Upstream Source 1**: Vancouver School Board (SD39) Official Catchment GIS Boundaries (GeoJSON)
- **Upstream Source 2**: BC Ministry of Education School Directory API
- **Upstream Source 3**: Vancouver Coastal Health Community Care Facilities Licensing Database
- **Edge Ingestion Service**: `src/tools/school-catchment/services/catchmentService.ts`
  - Sub-50ms point-in-polygon geofencing matching user address to Elementary, Annex, and Secondary boundaries.
  - VCH Childcare routine inspection compliance log extraction.
- **Cache Policy**: `s-maxage=86400, stale-while-revalidate=604800` (24 hours).

### Tool #11: Metro Vancouver Local News & Breaking Alert Radar (`/news`)
- **Upstream Source 1**: CBC News British Columbia / Vancouver (Official Public RSS: `https://www.cbc.ca/webfeed/rss/rss-canada-britishcolumbia`)
- **Upstream Source 2**: City of Vancouver Media Releases & Public Notices RSS (`https://vancouver.ca/news-calendar/rss.aspx`)
- **Upstream Source 3**: Environment and Climate Change Canada (ECCC) Weather Alerts (CAP-CP Feed for Metro Vancouver / YVR)
- **Upstream Source 4**: TransLink News & Transit Disruption Alerts
- **Edge Ingestion Service**: `src/tools/local-news/services/newsService.ts`
  - Lightweight XML parser extracting headline, publication timestamp, source outlet, and canonical URL.
  - High-priority breaking alert banner surface (`BreakingAlertBanner.astro`).
- **Cache Policy**: Alerts `s-maxage=60, stale-while-revalidate=120`; Articles `s-maxage=300, stale-while-revalidate=600`.

### Tool #12: Metro Vancouver Real Estate & Rental Market Heartbeat (`/market`)
- **Upstream Source 1**: Greater Vancouver REALTORS® (GVR) & Fraser Valley (FVREB) Open Monthly Statistical Datasets (MLS® HPI benchmark series)
- **Upstream Source 2**: Bank of Canada Valet REST API (`https://www.bankofcanada.ca/valet/observations/` - `V39079` policy rate, `V80691311` 5-yr mortgage benchmark, `V39055` bond yield)
- **Upstream Source 3**: Canada Mortgage and Housing Corporation (CMHC HMIP Open Data) for Metro Vancouver median rental rates and vacancy percentages
- **Edge Ingestion Service**: `src/tools/housing-market/services/marketService.ts`
  - Calculate Sales-to-Active Ratio (SAR %) liquidity gauge (Buyer's $<12\%$, Balanced $12-20\%$, Seller's $>20\%$).
- **Cache Policy**: `s-maxage=86400, stale-while-revalidate=604800` (24 hours).

### Tool #13: Metro Vancouver Public Sports, Courts & Rec Radar (`/sports`)
- **Upstream Source 1**: City of Vancouver Open Data (`parks-facilities-and-features`, `swimming-pools`, `ice-rinks`)
- **Upstream Source 2**: Vancouver Park Board Daily Recreation Timetables (public swim, length swim, public skate, stick-and-puck)
- **Upstream Source 3**: Vancouver Park Board Field Playability Feed (rainout/snow status for synthetic turf and grass pitches)
- **Edge Ingestion Service**: `src/tools/sports-facilities/services/sportsService.ts`
  - Real-time drop-in session mode calculations based on current Vancouver local time.
  - Night lighting curfew tracking (automatic 10:00 PM sunset timers).
- **Cache Policy**: `s-maxage=1800, stale-while-revalidate=7200` (30 min).

---

## 4. Shared Ingestion Utilities (`src/services/shared/`)

To keep bundle size $< 25\text{ KB}$ and avoid heavyweight Node dependencies:
1. **`src/services/shared/edgeFetch.ts`**:
   - Universal fetch wrapper with `AbortSignal.timeout(1200)`.
   - Automatic HTTP status check and exponential backoff retry.
2. **`src/services/shared/xmlParser.ts`**:
   - Zero-dependency regex / string tokenizer parser for RSS 2.0, Atom, and ECCC CAP-CP feeds.
3. **`src/services/shared/geo.ts`**:
   - High-performance Haversine distance calculations and Point-in-Polygon raycasting for municipal boundaries.

---

## 5. Non-Functional Requirements & Edge SLA

- **Edge Execution SLA**: Every live loader must return within **$\le 1,200\text{ms}$**. If upstream latency exceeds 1.2s, the edge runtime immediately serves the verified fallback snapshot with `isStale: true`.
- **Zero Synthetic Data Mandate**: Generating random or simulated metrics is strictly prohibited across all tools.
- **Client JS Budget**: $< 20\text{ KB}$ total client payload across all pages.
- **Lighthouse Performance**: 95+ target across Performance, Accessibility, Best Practices, and SEO.

---

## 6. Implementation Milestones

| Milestone | Deliverables | Status |
| :--- | :--- | :---: |
| **M1: Edge Ingestion Utilities** | Build `edgeFetch.ts` and `xmlParser.ts` in `src/services/shared/`. | Ready |
| **M2: Tool Services Live Fetchers** | Update all 13 `services/*.ts` with authentic dynamic Edge loaders and 1.2s timeout. | Ready |
| **M3: Sync Scrapers Enhancement** | Upgrade `scripts/sync-live-*.js` to parse and populate real API payloads during build sync. | Ready |
| **M4: Validation & Audit** | Verify `npm run data:sync:all`, `npm run check`, and Edge SSR builds with zero mock data. | Ready |
