# Product Requirements Document (PRD) — VanUtils: Real-Time Edge Data Pipeline Remediation & 100% Authentic Live Telemetry Mandate

## 1. Executive Summary & Problem Statement

### 1.1 Objective
Eliminate all build-time data stagnation across the VanUtils platform by converting all 13 micro-utilities to **100% authentic, runtime Server-Side Edge Rendering (SSR) data ingestion** deployed on Cloudflare Workers / Pages YVR PoP.

### 1.2 Root Cause Analysis
A comprehensive architectural audit revealed that **10 out of 13 tools** were operating in a "pseudo-live" state:
- Static baseline JSON files in `src/tools/<tool-id>/data/` were being served at runtime instead of fetching live telemetry.
- Build-time sync scripts (`scripts/sync-live-*.js`) were in several cases only updating timestamps with `new Date().toISOString()` rather than parsing live upstream payloads.
- Only **Tool #2 (Ferries)** and **Tool #3 (Snow)** were executing true live network requests on Edge SSR.

This directly violates the **100% Real-Data Mandate** and the **1.2-Second Dynamic Edge Loader Protocol** established in the platform architecture.

### 1.3 Target Architecture
Every micro-utility will implement an asynchronous edge loader `getLive<ToolData>()` that executes **at request time** on Cloudflare Workers edge isolates:
1. **Parallel Upstream Fetch**: Dispatches requests to official government / institutional REST, GeoJSON, and XML/RSS APIs.
2. **Strict 1.2s Fast Timeout**: Uses `AbortSignal.timeout(1200)` to guarantee sub-second Time-To-First-Byte (TTFB).
3. **Tiered Edge Caching (SWR)**: Sets explicit `Cache-Control: public, s-maxage=..., stale-while-revalidate=...` headers to protect upstream endpoints and deliver sub-50ms cached responses from Cloudflare's Vancouver edge.
4. **Explicit Failure, No Fallback** *(superseded by issue #35 — see below)*: If upstream endpoints fail or exceed 1,200ms, the loader returns `{ ok: false, error }` (`src/services/shared/liveResult.ts`) — never the baseline snapshot dressed up as current. Zero synthetic or fake timestamp stamping, and zero baseline masquerading as live.

---

## 2. Universal Edge Ingestion Utilities (`src/services/shared/`)

To support live edge fetching without heavy dependencies or Node-specific runtime modules:

### 2.1 `src/services/shared/edgeFetch.ts`
- Universal fetch client tailored for Cloudflare Workers V8 Isolates.
- Integrates `AbortSignal.timeout(1200)`.
- Injects standard User-Agent header: `VanUtils/1.0 (https://vanutils.ca; contact@vanutils.ca)`.
- Handles JSON, text, and binary responses cleanly.

### 2.2 `src/services/shared/xmlParser.ts`
- Lightweight, zero-dependency streaming XML parser for Cloudflare Edge.
- Supports RSS 2.0 (CBC News, City of Vancouver Notices), Atom 1.0, and Environment Canada CAP-CP Weather Alert XML.

---

## 3. Tool-by-Tool Remediation Specifications

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                REAL-TIME UPSTREAM DATA PIPELINE                                   |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
  [Metro Van ArcGIS FeatureServer]   -->  Tool #1: Can I Swim? (/swim)
  [BC Ferries Capacity API v2]       -->  Tool #2: Ferry Standby Radar (/ferries)
  [Open-Meteo High-Res Soundings]    -->  Tool #3: Mountain Snow Line (/snow)
  [City of Vancouver Curbside GIS]   -->  Tool #4: Evo Parking Radar (/parking)
  [VCH & Fraser Health ED Feeds]     -->  Tool #5: ER & Urgent Care (/health)
  [DriveBC Open511 Events REST API]  -->  Tool #6: Bridges & Tunnels (/bridges)
  [BC EnvistaWeb BAM-1020 Sensor]    -->  Tool #7: Wildfire Smoke & AQHI (/air)
  [City of Vancouver Rezoning API]   -->  Tool #8: Development & Rezoning (/civic)
  [City of Van Special Events API]   -->  Tool #9: Community Events (/events)
  [VSB SD39 GIS Catchment Polygons]  -->  Tool #10: School Catchments (/schools)
  [CBC News & ECCC CAP Alert RSS]    -->  Tool #11: Local News & Alerts (/news)
  [Bank of Canada Valet REST API]    -->  Tool #12: Real Estate & Rental (/market)
  [City of Van Parks Features API]   -->  Tool #13: Sports & Courts (/sports)
                                                 │
                                                 ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                        CLOUDFLARE WORKERS EDGE SSR RUNTIME (YVR PoP)                              |
|  - 1.2s Fast Timeout Loader Protocol (`AbortSignal.timeout(1200)`)                                |
|  - Dynamic SWR Header Policies: `s-maxage=60s` to `3600s`, `stale-while-revalidate`               |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
```

### Detailed Remediation Matrix:

| Tool | Module ID | Upstream Public Endpoint | Edge Loader Function | Caching Policy (SWR) | Failover Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#1 Swim** | `can-i-swim` | Metro Vancouver ArcGIS FeatureServer (`gis.metrovancouver.org`) | `getLiveBeaches()` | `s-maxage=1800, stale-while-revalidate=7200` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#2 Ferries** | `bc-ferries` | BC Ferries API v2 (`bcferriesapi.ca/v2/capacity/`) | `getLiveRoutes()` | `s-maxage=60, stale-while-revalidate=120` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#3 Snow** | `mountain-snow` | Open-Meteo High-Elevation API (`api.open-meteo.com`) | `getLiveMountains()` | `s-maxage=300, stale-while-revalidate=600` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#4 Parking** | `carshare-parking` | City of Vancouver Open Data (`opendata.vancouver.ca`) | `getLiveNeighbourhoods()` | `s-maxage=3600, stale-while-revalidate=86400` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#5 Health** | `health-wait-times`| VCH / Fraser Health ED Triage Feed (`edwaittimes.ca`) | `getLiveFacilities()` | `s-maxage=300, stale-while-revalidate=600` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#6 Bridges** | `bridge-traffic` | DriveBC Open511 Events API (`api.open511.gov.bc.ca/events`) | `getLiveCrossings()` | `s-maxage=60, stale-while-revalidate=120` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#7 Air Quality** | `air-quality` | BC EnvistaWeb BAM-1020 API (`envistaweb.env.gov.bc.ca/aqo/api/station/latest`) | `getLiveStations()` | `s-maxage=600, stale-while-revalidate=1800` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#8 Civic Rezoning** | `civic-development` | City of Vancouver Rezoning API (`opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/rezoning-applications/records`) | `getLiveProposals()` | `s-maxage=3600, stale-while-revalidate=86400` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#9 Community Events** | `community-events` | City of Vancouver Special Events Permits API (`opendata.vancouver.ca`) | `getLiveEvents()` | `s-maxage=1800, stale-while-revalidate=7200` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#10 Schools** | `school-catchment` | VSB SD39 Official Catchment GeoJSON Dataset | `getLiveSchools()` | `s-maxage=86400, stale-while-revalidate=604800`| Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#11 Local News** | `local-news` | CBC News BC RSS + City of Vancouver Media Releases RSS + ECCC Weather Alerts | `getLiveNews()`, `getLiveBreakingAlerts()` | `s-maxage=60/300, stale-while-revalidate=120/600` | Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#12 Housing Market** | `housing-market` | Bank of Canada Valet REST API (`bankofcanada.ca/valet/observations/V39079,V80691311,V39055/json`) | `getLiveMarketHeartbeat()` | `s-maxage=86400, stale-while-revalidate=604800`| Return `ok: false` with explicit error — no baseline shown (issue #35) |
| **#13 Sports Radar** | `sports-facilities`| City of Vancouver Parks Facilities GeoJSON API (`opendata.vancouver.ca`) | `getLiveSportsFacilities()` | `s-maxage=1800, stale-while-revalidate=7200` | Return `ok: false` with explicit error — no baseline shown (issue #35) |

---

## 4. Implementation & Execution Plan

### Phase 1: Shared Edge Ingestion Utilities
- Create `src/services/shared/edgeFetch.ts` with 1.2s timeout enforcement and error recovery.
- Create `src/services/shared/xmlParser.ts` for zero-dependency RSS/XML feed handling.

### Phase 2: Refactor All 13 Tool Services
- Upgrade all `src/tools/<tool-id>/services/*.ts` files:
  - Replace static file-reading logic with runtime `edgeFetch` requests to upstream endpoints.
  - Implement full response normalization and schema mapping.
  - Retain local JSON files strictly as seed/reference metadata — never rendered as live values (issue #35).

### Phase 3: Manual Seed-Refresh Scripts (Not Part of Build)
- Overhaul `scripts/sync-live-*.js`:
  - Upgrade every script from timestamp stamping to full upstream data downloading and JSON compilation.
  - These remain manual, one-time seed-refresh tools — `npm run data:sync:all` is intentionally NOT wired into `npm run build` or any deployment pipeline (issue #35).

### Phase 4: Quality Assurance & Edge SLA Verification
- Validate that all 13 tools execute real network requests on Cloudflare Edge.
- Perform timeout chaos testing (simulating upstream latency $>1.2s$) to verify fallback behavior.
- Confirm zero TypeScript errors via `npm run check`.
- Verify production build with `npm run build`.

---

## 5. Definition of Done (DoD)
1. **Zero Mock/Fake Stamping**: No service or script generates fake timestamps or synthetic metrics.
2. **True Runtime Edge Execution**: Every tool queries live endpoints on request at Cloudflare YVR PoP.
3. **1.2s SLA Adherence**: All edge loaders enforce `AbortSignal.timeout(1200)`.
4. **Explicit Failure, No Fallback**: If upstream is unreachable, the system returns `{ ok: false, error }` and renders a dedicated "Live data unavailable" state — never a baseline number dressed up as current (issue #35).
5. **Full Type Safety**: `npm run check` passes with 0 errors.
