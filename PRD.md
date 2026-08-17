# Product Requirements Document (PRD) — VanUtils (Vancouver Micro-Utilities Hub)

## 1. Executive Summary & Vision
- **Product Name**: VanUtils (`vancouver.tools` / `vanutils.ca`)
- **Target Platform**: Web / Mobile-First PWA (Astro on Cloudflare Pages)
- **Product Vision**: A unified, ultra-lightweight suite of hyper-local micro-utilities designed specifically for Metro Vancouver residents. VanUtils provides single-purpose, sub-second tools accessible from one cohesive hub with zero bloat, zero tracking, and zero ads.
- **Real-Data Mandate**: All metrics, temperatures, bacterial counts, freezing levels, vehicle deck capacities, road conditions, and camera frames are 100% real-world data ingested directly from official government, transport, and meteorological telemetry feeds. No synthetic, mock, or fake data is permitted. If an upstream endpoint is unmonitored or awaiting a lab report, it is reported transparently as such.

---

## 2. Core UX Standard & Dashboard Design Law

### 2.1 The "Zero-Fluff, High-Density" Rule (Strict Standard for All Utilities)
All utility cards on the Main Dashboard (`/` or `src/pages/index.astro`) must strictly follow the **High-Density Utility Card Standard**:

1. **Entire Card is Clickable (`<a>`)**:
   - The card itself is a single, clean link navigating directly to the micro-utility route (`/swim`, `/ferries`, `/snow`, `/parking`).
   - No separate nested buttons, secondary links, or bottom "Open Tool →" footers.

2. **Maximum Data Density (80%+ Card Real Estate)**:
   - Dedicated card real estate must be maximized to present direct, actionable live data rather than marketing fluff or decorative empty space.
   - **Can I Swim?**: Displays 8–12+ live beach statuses in a high-density 2-column list (`English Bay 🟢 Safe`, `Kits Beach 🟢 Safe`, `Sunset 🟡 Caution`, etc.).
   - **Ferry Standby Radar**: Displays real-time deck capacity & standby clearance odds for top routes (*Tsawwassen ➔ Swartz Bay*, *Horseshoe Bay ➔ Departure Bay*, *Hullo Catamaran*, *TransLink SeaBus*).
   - **Mountain Snow Line**: Displays summit elevations, current freezing levels, and snow/road alerts for *Cypress, Grouse, Seymour, and Whistler*.
   - **Evo & Parking Radar**: Displays active street-sweeping warnings, tow clocks, and permit zone statuses.

3. **Zero Visual Bloat & No Decorative Distractions**:
   - **Strictly Prohibited on Cards**: Large decorative icon containers, category labels (*"Outdoors & Nature"*), verbose sub-headers, promotional blurbs, and redundant footer buttons.
   - **Required Header**: Clean Utility Title + Live Count Badge (e.g. `Mountain Snow Line` • `[1,100m FZ]`).

4. **Home Card Customization Protocol**:
   - Every micro-utility must allow users to customize what items appear on their home dashboard card.
   - Users click the ⭐ star icon next to any item to add/remove it from their pinned list.
   - Pinned selections are persisted locally in `localStorage` (`vanutils_pinned_<tool-id>`) and automatically synchronize across the utility page and the main dashboard card without requiring account creation.

---

## 3. Architecture & Tech Stack

```
+─────────────────────────────────────────────────────────────+
|               MAIN DASHBOARD (src/pages/index.astro)        |
|  - High-Density, Zero-Fluff Clickable Utility Cards Grid     |
+─────────────────────────────────────────────────────────────+
        │                           │                        │
        ▼                           ▼                        ▼
+───────────────────+      +───────────────────+    +──────────────────+
|  CAN I SWIM?      |      |  FERRY RADAR      |    |  MOUNTAIN SNOW   |
|  (/swim)          |      |  (/ferries)       |    |  (/snow)         |
|  - 31 Real Beaches|      |  - 11 Marine Rts  |    |  - 4 Mountain Rst|
|  - ⭐ Pin to Home |      |  - Live Deck %    |    |  - Freezing line |
+───────────────────+      +───────────────────+    +──────────────────+
```

- **Framework**: Astro 5 (Server-Side Edge Rendering `output: "server"` on Cloudflare Workers V8 Isolates)
- **Edge Caching Policy**: Tiered `s-maxage` with `stale-while-revalidate` (60s–600s) on Cloudflare Vancouver Edge PoP (YVR)
- **Live Data Ingestion**: Dynamic runtime edge fetching (`getLiveRoutes()`, `getLiveMountains()`, etc.) with 1.2s timeout fallback
- **Styling**: Tailwind CSS with dark mode zero-flicker protection
- **Deployment**: Cloudflare Pages / Workers Edge CDN (`wrangler.json` / `wrangler.toml`)
- **Performance Budget**: Client JS $< 25\text{ KB}$, First Contentful Paint $< 0.4\text{s}$, TTFB $< 50\text{ms}$
- **Privacy Standard**: 100% Client-side state (`localStorage`), 0 telemetry, 0 cookies

---

## 4. Micro-Utility Specifications

### Tool #1: "Can I Swim Today?" (`/swim`) — Flagship Live Utility
- **Official Data Ingestion**: Direct integration with Metro Vancouver GIS Enterprise Feature Server (`gis.metrovancouver.org`) and Vancouver Coastal Health / Fraser Health surveillance.
- **Safety Standard**:
  - 🟢 **Safe**: 30-day geometric mean $\le 200$ CFU/100mL & single sample $\le 235$ CFU/100mL.
  - 🟡 **Caution**: Single sample $235 - 400$ CFU/100mL (resampling triggered).
  - 🔴 **Advisory**: Geometric mean $> 200$ CFU/100mL or single sample $> 400$ CFU/100mL.
  - ⚪ **Unmonitored / Off-Season**: October–April or awaiting weekly sample.
- **Features**:
  - Pinned "Main Beaches" quick bar with 1-click `×` unpin.
  - Minimal search bar + 5 region pills (*All Metro, Vancouver, North Shore, Burnaby/Belcarra, White Rock/Delta*).
  - High-density beach rows with name, municipality, GPS distance, CFU, status indicator, and ⭐ pin button.
  - Dedicated beach detail pages (`/swim/[slug]`) for full 30-day historical SVG charts and transit links.

---

### Tool #2: Metro Vancouver Ferry & Marine Transit Radar (`/ferries`) — Flagship Live Utility
- **Multi-Provider Scope**:
  - **BC Ferries**: TSA-SWB, HSB-NAN, HSB-LNG, TSA-DUK, HSB-BOW, TSA-SGI, EAR-SAL.
  - **Hullo Fast Catamaran**: Downtown Vancouver (Coal Harbour) ⇄ Nanaimo Port Drive.
  - **TransLink SeaBus**: Waterfront Station ⇄ Lonsdale Quay (10-12 min headway).
  - **Water Taxis & Local Marine**: Howe Sound Water Taxi (Keats & Gambier), False Creek Ferries, Barnston Island Barge.
- **Standby Risk Engine**:
  - 🟢 **Low Risk (>35% Deck Space)**: Favourable standby clearance. Arrive 45–60 min prior.
  - 🟡 **Moderate Risk (15%–35% Deck Space)**: Standby queue filling. Arrive 60–90 min prior; 1-sailing wait possible.
  - 🔴 **High Risk / Full (<15% or 0%)**: Standby cutoff likely. Plan for subsequent sailing.
- **DriveBC Highway Cams**: Live camera streams for Hwy 17 (Tsawwassen Approach) and Hwy 1 (Horseshoe Bay Approach).
- **Edge Sync & API**: `npm run ferries:sync` directly updates authentic capacity feeds; `GET /api/ferries` endpoint available.

---

### Tool #3: Mountain Snow Line & Elevation Matrix (`/snow`) — Flagship Live Utility
- **Module Identifier**: `mountain-snow` (routes: `/snow` and `/snow/[mountain]`).
- **Supported Mountain Zones & Real Elevation Specifications**:
  - **Cypress Mountain**: Base 910m, Mid (Lodge) 1,100m, Mt. Strachan Summit 1,440m.
  - **Grouse Mountain**: Valley 274m, Chalet Plateau 1,128m, Peak 1,250m.
  - **Mount Seymour**: Base 930m, Mystery Peak 1,230m, Mt. Seymour Summit 1,449m.
  - **Whistler Blackcomb**: Village 675m, Mid-Mountain 1,850m, Peak 2,284m.
- **Live Data Ingestion Pipeline**:
  - **Environment Canada**: Real-time atmospheric soundings and high-elevation automatic weather stations (AWS).
  - **DriveBC RWIS**: Real-time road surface telemetry and mandatory winter tire (M+S / 3PMSF) / chain enforcement for Cypress Bowl Rd, Mount Seymour Rd, and Sea-to-Sky Hwy 99.
  - **Avalanche Canada**: Public danger rating REST API (`avalanche.ca/api/forecasts/...`) for South Coast and Sea-to-Sky alpine, treeline, and below-treeline bands.
  - **Resort Webcams**: Live high-resolution camera feeds with lightbox previews.
- **Precipitation Classification by Elevation Band**:
  - ❄️ **Dry Powder / Snow**: Temperature $\le -1.5^\circ\text{C}$.
  - 🌨️ **Wet Snow / Mixed**: Temperature between $-1.5^\circ\text{C}$ and $+1.5^\circ\text{C}$.
  - 🌧️ **Rain**: Temperature $> +1.5^\circ\text{C}$.
- **Snow Page UX**:
  - Filter tabs (*All Mountains, 🌲 North Shore, 🏔️ Sea-to-Sky, 📷 Webcams Only*).
  - Elevation cross-section visualizer displaying current 0°C freezing level.
  - DriveBC mountain road alerts and chain requirement indicators.
  - 12h / 24h / 48h snow stake accumulation and settled base depth metrics.
  - Dedicated mountain detail pages (`/snow/[mountain]`) with full webcam matrix and avalanche safety bulletin.

---

### Tool #4: Evo & Street Sweeping Radar (`/parking`) — Planned Roadmap
- Vancouver street-sweeping calendar sync and tow-away warning clocks.
- Evo drop-off permitted map layer.

---

## 5. Multi-Tool Expansion Protocol
When expanding the platform with a new utility:
1. **Module Scaffolding**: Create `src/tools/<tool-id>/` with `types.ts`, `data/`, `services/`, and `components/`.
2. **Dynamic Edge Loader**: Implement an async `getLive<ToolData>()` loader in `services/` that queries the official live API with a 1.2s timeout and fallback to verified snapshot.
3. **Registry Declaration**: Register in `src/config/tools.ts`.
4. **High-Density Card Implementation**: Implement in `src/components/shared/ToolCard.astro` ensuring:
   - 100% Clickable container (`<a>`).
   - Maximize live data capacity (80%+ card space).
   - Zero decorative icons, category pills, or nested buttons.
   - Dynamic pinning synchronization with `localStorage.getItem('vanutils_pinned_<tool-id>')`.
5. **Route Implementation**: Create `src/pages/<tool-id>/index.astro` and `src/pages/<tool-id>/[slug].astro` in Server-Side Edge Rendering mode (`output: "server"`), declaring appropriate `Astro.response.headers.set('Cache-Control', 'public, s-maxage=..., stale-while-revalidate=...')`.
6. **Validation**: Ensure zero cross-tool dependencies and verify `npm run check` & `npm run build`.
