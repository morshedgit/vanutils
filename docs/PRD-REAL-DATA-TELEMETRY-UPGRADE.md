# Product Requirements Document (PRD) — VanHeartbeat: Platform-Wide 100% Real-Data Runtime Edge Ingestion Pipeline

**Author**: VanHeartbeat Platform Architect  
**Status**: DRAFT / PROPOSED  
**Target Release**: v2.2.0  
**Scope**: Documentation & Architectural Specification (`docs/PRD-REAL-DATA-TELEMETRY-UPGRADE.md`)

---

## 1. Executive Summary & Problem Statement

### 1.1 Objective
Standardize **100% authentic runtime data ingestion at Cloudflare Edge nodes** across all 16 VanHeartbeat micro-utility modules. This strictly enforces the **100% Real-Data Mandate** and the **1.2-Second Dynamic Edge Loader Protocol** defined in `AGENTS.md`.

### 1.2 The Problem
A platform-wide audit revealed that while 6 of the 16 modules are fully compliant with runtime edge ingestion, the remaining 10 modules have architectural gaps:
1. **Simulated / Synthetic Data**: `/swim` calculates historical E. coli bacteria using a synthetic sine wave formula (`Math.sin(idx) * factor`).
2. **Broken / Mocked Edge Loaders**: `/health` queries a dead 404 endpoint (`edwaittimes.ca/api/facilities`) and serves static hardcoded baseline numbers.
3. **Static Pollutant Returns**: `/air` calls an upstream API, but discards the response and returns static seed station numbers.
4. **Simulated Timeouts**: `/sales` uses a fake `setTimeout(..., 1200)` rather than connecting to live event and venue RSS feeds.
5. **Static Event Snapshots**: `/events` and `/schools` lack runtime edge loaders to query live municipal feeds.
6. **Static Crossing Delays**: `/bridges` ingests live road incidents, but crossing travel times (e.g. 18 min vs 7 min) remain fixed baselines.

### 1.3 The Solution
Implement a **Unified Runtime Edge Ingestion Engine** that:
- Connects every utility to verified municipal, provincial, and federal open data endpoints.
- Wraps all network fetches in `edgeFetch()` with a strict **1.2s timeout SLA** (`AbortSignal.timeout(1200)`).
- Eliminates 100% of synthetic formulas, randomizers, and simulated timeouts.
- Provides seamless, non-blocking failover to verified snapshots with explicit `isStale: true` flags.
- Configures tiered Cloudflare Edge cache headers (`public, s-maxage=60..300, stale-while-revalidate=120..600`).

---

## 2. Standardized Practice: 5-Pillar Edge Ingestion Architecture

```
                  USER REQUEST (Cloudflare Edge Worker)
                                 │
                                 ▼
             +───────────────────────────────────────+
             |       getLive<ToolData>() Loader      |
             +───────────────────────────────────────+
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
         [Upstream API Request]     [1.2s Timeout Timer]
           (edgeFetch / 100% Real)     (AbortSignal)
                    │                         │
                    └────────────┬────────────┘
                                 ▼
             +───────────────────────────────────────+
             |             RACE RESOLUTION           |
             +───────────────────────────────────────+
              /                                     \
    (Resolved < 1.2s)                         (Timed out / Errored)
            │                                           │
            ▼                                           ▼
+───────────────────────+                   +───────────────────────+
| Fresh Live Telemetry  |                   |  Verified Snapshot    |
| - 100% Real Values    |                   |  - isStale: true      |
| - isStale: false      |                   |  - Real Baseline Data |
+───────────────────────+                   +───────────────────────+
            │                                           │
            └────────────────────┬──────────────────────┘
                                 ▼
+───────────────────────────────────────────────────────────────────+
|               TIERED CLOUDFLARE EDGE CACHE-CONTROL                |
|       Cache-Control: public, s-maxage=60, stale-while-revalidate=120
+───────────────────────────────────────────────────────────────────+
```

### The 5 Architectural Pillars:
1. **Dynamic Edge Loader (`getLive<ToolData>()`)**: Every tool must export an async loader executed dynamically on each Server-Side Rendered (SSR) Edge request (`output: "server"`).
2. **Aggressive 1.2s Timeout SLA (`edgeFetch`)**: All upstream HTTP requests must be wrapped with `AbortSignal.timeout(1200)` to ensure edge responses render in $< 1.2\text{s}$ without blocking the user.
3. **100% Real Upstream Public Feeds**: Upstream data must originate from official public APIs, REST feeds, or XML/RSS feeds. **Zero mock data, zero synthetic math, zero hardcoded placeholders.**
4. **Graceful Failover to Verified Baseline (`isStale: true`)**: If the upstream API times out ($> 1200\text{ms}$) or errors, the edge worker must seamlessly return the pre-compiled baseline snapshot with an explicit `isStale: true` flag and the last verified timestamp.
5. **Tiered Edge Cache-Control Headers**: Dynamic responses must set `s-maxage` (e.g. 60–300s) and `stale-while-revalidate` (e.g. 120–600s) so Cloudflare's global edge network absorbs high traffic surges while keeping data fresh.

---

## 3. Platform Ingestion Audit & Remediation Roadmap

```
┌──────────────────────────────┬──────────────────┬────────────────────────────────────────────────────────┐
│ Micro-Utility Module         │ Current Status   │ Required Remediation Plan                              │
├──────────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
│ 1. BC Ferries Radar          │ 🟢 Compliant     │ Ingests live deck % via bcferriesapi.ca at Edge.       │
│ 2. Mountain Snow Line        │ 🟢 Compliant     │ Ingests live 0°C freezing level from Open-Meteo.       │
│ 3. Weather Microclimates     │ 🟢 Compliant     │ Ingests live 7-station microclimate soundings at Edge. │
│ 4. Major Sports Teams        │ 🟢 Compliant     │ Ingests live NHL & ESPN standings at Edge.             │
│ 5. Local News & ECCC Alerts  │ 🟢 Compliant     │ Ingests live Environment Canada & CBC RSS feeds.       │
│ 6. Real Estate & Mortgage    │ 🟢 Compliant     │ Ingests Bank of Canada Valet API rates at Edge.        │
│ 7. Hospital ER Wait Times    │ 🔴 Non-Compliant │ Parse edwaittimes.ca/legacy live emergency feed.       │
│ 8. Air Quality BAM-1020      │ 🔴 Non-Compliant │ Ingest continuous PM2.5 & compute official ECCC AQHI.  │
│ 9. "Can I Swim" Beach Water  │ 🔴 Non-Compliant │ Ingest weekly VCH lab samples; delete sine wave math.  │
│ 10. Deals & Sales Radar      │ 🔴 Non-Compliant │ Connect edgeFetch to venue event feeds (VCC/PNE).      │
│ 11. Free Community Events    │ 🔴 Non-Compliant │ Connect edgeFetch to City Special Events API.          │
│ 12. School Catchments        │ 🔴 Non-Compliant │ Connect edgeFetch to VSB SD39 operational alerts feed. │
│ 13. Bridge & Tunnel Delays   │ 🟡 Partial       │ Apply dynamic delay deltas from Open511 incidents.     │
│ 14. Civic Rezoning           │ 🟡 Partial       │ Enhance City Open Data API record mapping.             │
│ 15. Car-Share Parking        │ 🟡 Deterministic │ Enhance rules engine with City Open Data street feeds. │
│ 16. Sports Facilities & Rec  │ 🟡 Deterministic │ Enhance active hours with Park Board facility updates. │
└──────────────────────────────┴──────────────────┴────────────────────────────────────────────────────────┘
```

---

## 4. Module-by-Module Technical Specifications

---

### 4.1. Hospital & UPCC Emergency Wait Times (`/health`)
* **Upstream Endpoint**: `https://www.edwaittimes.ca/legacy`
* **Protocol**: `GET` via `edgeFetch()` (1.2s timeout).
* **Ingestion Logic**:
  - Parse `locationsWithWaitTimes` from the embedded `__NEXT_DATA__` JSON payload.
  - Map facility slugs to internal identifiers (`VGH`, `SPH`, `MSJ`, `LGH`, `RHS`, `BCHBCCHILDREN`, `BH`, `RCH`, `SMH-A`, and UPCCs).
  - Ingest real-time `waitTimeMinutes` (e.g. 149m, 69m, 161m) and calculate triage intensity (`low`: $<90\text{m}$, `moderate`: $90-210\text{m}$, `high`: $>210\text{m}$).
* **Failover**: If timeout occurs, serve `facilities.json` with `isStale: true` and last verified timestamp.

---

### 4.2. Metro Vancouver Air Quality Monitoring Network (`/air`)
* **Upstream Endpoint**: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5&timezone=America/Vancouver`
* **Protocol**: `GET` via `edgeFetch()` (1.2s timeout) across all 11 BAM-1020 monitoring stations.
* **Ingestion Logic**:
  - Ingest real-time hourly $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, and $\text{O}_3$ concentrations.
  - Calculate official Canadian AQHI:
    $$\text{AQHI} = \left(\frac{10}{10.4}\right) \times 100 \times \left[(e^{0.000537 \times \text{O}_3} - 1) + (e^{0.000871 \times \text{NO}_2} - 1) + (e^{0.000487 \times \text{PM}_{2.5}} - 1)\right]$$
  - Ingest 24-hour historical $\text{PM}_{2.5}$ readings for sparkline rendering.
* **Failover**: Fall back to `stations.json` baseline with `isStale: true`.

---

### 4.3. "Can I Swim" Beach Water Quality (`/swim`)
* **Upstream Endpoints**:
  - Metro Vancouver ArcGIS Sampling Site Server: `https://gis.metrovancouver.org/arcgis/rest/services/Hosted/Beach_Sampling_Site/FeatureServer/2/query?where=1%3D1&outFields=*&f=json&outSR=4326`
  - Vancouver Coastal Health Recreational Water Quality Open Data Portal.
* **Protocol**: `GET` via `edgeFetch()` (1.2s timeout).
* **Ingestion Logic**:
  - Map 177 sampling stations to the 31 recreational beaches.
  - Extract genuine weekly lab-tested geometric mean (30-day 5-sample) and latest single-sample E. coli count ($\text{CFU}/100\text{mL}$).
  - Completely eliminate the `Math.sin(idx) * factor` formula.
  - Evaluate safety limits: `safe` ($\le 200$), `caution` ($235-400$), `advisory` ($>400$ or geo mean $>200$).
* **Failover**: Fall back to last verified lab sample date with `isStale: true`.

---

### 4.4. Deals & Warehouse Sales Radar (`/sales`)
* **Upstream Endpoints**:
  - Vancouver Convention Centre Events Feed: `https://www.vancouverconventioncentre.com/events/rss` (or REST equivalent)
  - PNE Forum Upcoming Events Calendar Feed
* **Protocol**: `GET` via `edgeFetch()` (1.2s timeout).
* **Ingestion Logic**:
  - Replace simulated `setTimeout` in `salesService.ts` with real `edgeFetch()`.
  - Ingest newly scheduled major warehouse sales and sample drops from venue feeds.
  - Dynamically evaluate event status against current PST date (`upcoming`, `active_now`, `concluded`).
* **Failover**: Fall back to verified curated `sales.json` baseline.

---

### 4.5. Free Community Events Radar (`/events`)
* **Upstream Endpoint**: `https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/special-events/records?limit=20`
* **Protocol**: `GET` via `edgeFetch()` (1.2s timeout).
* **Ingestion Logic**:
  - Ingest official non-commercial City of Vancouver permitted festivals, community days, and park celebrations.
  - Filter for free admission and extract dates, times, and venue coordinates.
* **Failover**: Fall back to verified `events.json` snapshot with `isStale: true`.

---

### 4.6. School Catchment & Operational Radar (`/schools`)
* **Upstream Endpoint**: `https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/schools/records?limit=20` (and VSB SD39 Notices RSS)
* **Protocol**: `GET` via `edgeFetch()` (1.2s timeout).
* **Ingestion Logic**:
  - Connect to VSB SD39 announcements feed for active closures (snow days, seismic upgrades).
  - Verify elementary-to-secondary feeder paths and childcare capacity notes.
* **Failover**: Fall back to verified `schools.json` snapshot with `isStale: true`.

---

### 4.7. Bridge & Tunnel Traffic Radar (`/bridges`)
* **Upstream Endpoint**: DriveBC Open511 API (`https://api.open511.gov.bc.ca/events?bbox=-123.35,49.0,-122.6,49.4&status=ACTIVE&format=json`)
* **Protocol**: `GET` via `edgeFetch()` (1.2s timeout).
* **Ingestion Logic**:
  - Ingest active Lower Mainland road incidents and stalls.
  - Dynamically compute travel times: `travelTime = normalTime + baseDelay + (hasMajorIncident ? 14 : (hasMinorIncident ? 6 : 0))`.
  - Dynamically update crossing status (`flowing`, `moderate`, `heavy`, `closed`).
* **Failover**: Fall back to `crossings.json` with baseline estimates and `isStale: true`.

---

## 5. Edge Performance & Cache Control Standards

To achieve sub-second response times globally while maintaining data freshness:

| Tool Category | Upstream Update Frequency | Edge Cache Header (`Cache-Control`) |
| :--- | :--- | :--- |
| **Rapid Transit & Ferries** (`/ferries`, `/bridges`) | Every 1–2 minutes | `public, s-maxage=60, stale-while-revalidate=120` |
| **Emergency ER & Weather** (`/health`, `/weather`, `/air`, `/snow`) | Every 5–10 minutes | `public, s-maxage=300, stale-while-revalidate=600` |
| **Sports & News** (`/sports-teams`, `/news`) | Every 10–15 minutes | `public, s-maxage=600, stale-while-revalidate=1200` |
| **Civic, Housing & Sales** (`/market`, `/civic`, `/sales`, `/events`, `/parking`, `/schools`, `/sports`) | Hourly / Daily | `public, s-maxage=3600, stale-while-revalidate=86400` |

---

## 6. Verification Plan & Acceptance Criteria

- [ ] **Zero Synthetic Math**: `grep -rn "Math.sin" scripts/ src/` returns 0 results.
- [ ] **Zero Randomizers**: `grep -rn "Math.random" scripts/ src/` returns 0 results.
- [ ] **1.2s Timeout SLA**: All 16 `getLive<ToolData>()` functions execute `edgeFetch()` with `timeoutMs: 1200`.
- [ ] **Live ER Wait Times**: `/health` parses real triage minutes and patient counts from `edwaittimes.ca/legacy`.
- [ ] **Live Air Quality**: `/air` computes real ECCC AQHI scores from live $\text{PM}_{2.5}$, $\text{NO}_2$, and $\text{O}_3$ measurements.
- [ ] **Live Beach Bacteria**: `/swim` displays authentic lab-tested E. coli counts from VCH / Fraser Health records.
- [ ] **Build Integrity**: `npm run check` passes with 0 errors across 198 project files and `npm run build` succeeds under Cloudflare Pages Edge SSR (`output: "server"`).
