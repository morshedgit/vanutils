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

### Tool #4: Car-Share Safe-Parking & Street Sweeping Radar (`/parking`) — Active Live
- **Module Identifier**: `carshare-parking` (internal route `/parking` and `/parking/[neighbourhood]`)
- **Real-Data Mandate**: All municipal parking regulations, residential permit exemptions, street sweeping schedules, peak-period rush lane no-stopping hours, and car-share Home Zone boundaries are 100% real-world data ingested directly from the City of Vancouver Open Data API, City of North Vancouver GIS, and official Evo / Modo GeoJSON feeds.
- **Problem Solved**: Eliminates accidental parking fines ($150–$350+ towing/tickets) from parking in active rush-hour lanes, scheduled street sweep zones, or invalid permit sub-zones when ending Evo / Modo trips.
- **3-Second Definitive Safety Clearance**:
  - 🟢 **Safe to Park (Green)**: Inside Home Zone; valid residential permit exemption; no street sweeping or rush-hour restriction within 24 hours.
  - 🟡 **Caution / Time Limit (Yellow)**: Legal currently (e.g. overnight free meter), but street sweeping or rush-hour no-stopping restriction begins within 12–24 hours.
  - 🔴 **Do Not Park / Tow Risk (Red)**: Outside Home Zone, active peak-period rush lane, street sweeping within 12 hours, loading zone, or active permit closure.
- **Core Features**:
  - **1-Tap Browser Geolocation & Instant Spot Clearance**: Evaluates current GPS coordinates against Home Zone polygons and curbside regulations.
  - **Street Sweeping & Seasonal Leaf Removal Countdown**: Intersects current time with bi-weekly street sweeping schedules and autumn temporary leaf removal zones (October–January) in West End, Kitsilano, and Mount Pleasant.
  - **Peak-Hour Rush Lane No-Stopping Radar**: Real-time evaluation of major commuter corridors (West Georgia, Burrard, Broadway, West 4th Ave, Granville, Hastings, Main St).
  - **Dedicated Satellite Lot Navigator**: Step-by-step parking guides, stall counts, and drop-off fee details for YVR Airport (Park'N Fly), UBC (North/Thunderbird/Fraser Parkades), SFU Burnaby, Grouse Mountain, Cypress Mountain, and BC Ferries terminals.
  - **High-Density Dashboard Card**: Shows 6+ high-traffic parking hubs (Downtown, West End, Kitsilano, Mount Pleasant, YVR Airport, UBC) with live clearance badges and dynamic ⭐ pinning synchronization.

---

### Tool #5: Metro Vancouver ER & Urgent Care Radar (`/health`) — Active Live
- **Module Identifier**: `health-wait-times` (internal route `/health` and `/health/[facility]`)
- **Strict Real-Data Mandate**: All hospital emergency department wait times, triage estimates, Urgent and Primary Care Centre (UPCC) operating hours, and same-day clinic capacity indicators are 100% real-world data ingested directly from official Vancouver Coastal Health (VCH), Fraser Health, and HealthLink BC live endpoints. Zero synthetic or simulated wait-time figures are permitted.
- **Medical Emergency Disclaimer**: Unambiguous, high-contrast banner stating that in life-threatening situations (chest pain, stroke symptoms, severe bleeding, loss of consciousness), users must call 911 immediately or go to the nearest Emergency Department regardless of posted wait times.
- **Triage & Wait-Time Calculation**:
  - 🟢 **Low Wait**: $< 1.5$ hours estimated time to physician.
  - 🟡 **Moderate Wait**: $1.5 - 3.5$ hours estimated wait.
  - 🔴 **High Wait**: $> 3.5$ hours estimated wait.
  - ⚪ **Closed / Walk-ins Full**: UPCC outside operating hours or reached daily clinic intake capacity.
- **Comprehensive Facility Scope**:
  - **11 Hospital Emergency Departments**: Vancouver General Hospital (VGH), St. Paul's, Mount Saint Joseph, BC Children's (Pediatric Trauma), Lions Gate, Richmond, Burnaby, Royal Columbian, Surrey Memorial, Eagle Ridge, Delta.
  - **9 Urgent and Primary Care Centres (UPCCs)**: UBC Urgent Care, City Centre UPCC, REACH UPCC, Southeast UPCC, Northeast UPCC, North Vancouver UPCC, Richmond UPCC, Burnaby Edmonds UPCC, Burnaby Metrotown UPCC.
- **Core Features**:
  - **Total Time to Care (Distance + Wait)**: 1-tap browser geolocation to sort facilities by combined drive/transit duration plus live triage wait time.
  - **Smart ER vs. UPCC Acuity Selector**: Clear clinical guidance helping patients choose between an ER and an Urgent Care Centre for non-life-threatening conditions.
  - **Dedicated Facility Pages (`/health/[facility]`)**: Real-world addresses, verified phone numbers, transit links, on-site diagnostics (X-ray, CT, Lab), and official citations.
  - **High-Density Dashboard Card**: Shows 6+ primary ERs and UPCCs with real-time wait badges and dynamic ⭐ pinning synchronization.

---

### Tool #6: Vancouver Bridges & Tunnel Bottleneck Radar (`/bridges`) — Active Live
- **Module Identifier**: `bridge-traffic` (internal route `/bridges` and `/bridges/[crossing]`)
- **Strict Real-Data Mandate**: All bridge travel times, delay indices, counterflow lane configurations, speed telemetry, active accident notices, and webcam stills are 100% real-world data ingested directly from the official DriveBC Open511 API, Ministry of Transportation and Infrastructure (MOTI) ITS Sensor Feeds, and City of Vancouver Traffic Operations API. Generating, simulating, or displaying any synthetic, mock, or fake traffic figures is strictly prohibited.
- **Problem Solved**: Unifies 10+ major marine crossings across the North Shore, Downtown, Richmond, Delta, and Surrey into a single real-time dashboard tracking counterflow lane shifts, sudden stall closures, and live multi-camera feeds.
- **Velocity & Delay Metrics**:
  - 🟢 **Flowing Fast**: Average speed $> 50$ km/h, minimal delay ($< 3$ min).
  - 🟡 **Moderate Delay**: Average speed $20 - 50$ km/h, moderate delay ($3 - 10$ min).
  - 🔴 **Heavy Congestion / Gridlock**: Average speed $< 20$ km/h or active lane blockage ($> 10$ min delay).
- **Comprehensive Crossing Network**:
  - **Burrard Inlet Crossings**: Lions Gate Bridge (Hwy 99), Ironworkers Memorial Bridge (Second Narrows / Hwy 1).
  - **False Creek Crossings**: Burrard Street Bridge, Granville Street Bridge, Cambie Street Bridge.
  - **Fraser River Crossings**: Oak Street Bridge (Hwy 99), Knight Street Bridge, Arthur Laing Bridge, Alex Fraser Bridge (Hwy 91), George Massey Tunnel (Hwy 99), Port Mann Bridge (Hwy 1), Pattullo Bridge (Hwy 1A).
- **Core Features**:
  - **Live Dynamic Counterflow Lane Visualizer**: Real-time 3-lane / 4-lane diagrams for Lions Gate Bridge (2 NB vs 2 SB), Alex Fraser Road Zipper barrier, and George Massey Tunnel tube configurations.
  - **Synchronized Bridge Approach Webcams**: Live DriveBC & City of Vancouver camera stills (Stanley Park Causeway, Cassiar Tunnel, Steveston Hwy, Sea Island Way).
  - **DriveBC Open511 Active Incident Banner**: Real-time alerts for stalled vehicles, lane closures, and accidents.
  - **High-Density Dashboard Card**: Shows 6+ critical crossings with live delay minutes, speed indicators, and dynamic ⭐ pinning synchronization.

---

### Tool #7: Metro Vancouver Wildfire Smoke & AQHI Radar (`/air`) — Active Live
- **Module Identifier**: `air-quality` (internal route `/air` and `/air/[station]`)
- **Strict Real-Data Mandate**: All Air Quality Health Index (AQHI) ratings, fine particulate matter ($PM_{2.5}$) concentrations, ozone ($O_3$) levels, nitrogen dioxide ($NO_2$) telemetry, and public clean-air shelter listings are 100% real-world data ingested directly from the Metro Vancouver Air Quality Monitoring Network (BAM-1020 sensors), the BC Ministry of Environment Air Quality API, Environment Canada, and the City of Vancouver Cooling Centre Open Dataset. Zero synthetic or simulated air quality figures are permitted.
- **Problem Solved**: Replaces broad regional averages with hyper-local station sensor readings, tracks 24-hour smoke trends, and maps air-conditioned clean-air spaces with HEPA filtration during wildfire smoke advisories.
- **AQHI Health Scale & Particulate Thresholds**:
  - 🟢 **Low Health Risk (AQHI 1–3)**: $PM_{2.5} \le 12\,\mu\text{g/m}^3$. Ideal for outdoor activities.
  - 🟡 **Moderate Health Risk (AQHI 4–6)**: $PM_{2.5} = 13 - 35\,\mu\text{g/m}^3$. At-risk individuals consider reducing strenuous outdoor exertion.
  - 🟠 **High Health Risk (AQHI 7–10)**: $PM_{2.5} = 36 - 80\,\mu\text{g/m}^3$. General population reduce outdoor exertion; children and elderly stay indoors.
  - 🔴 **Very High / Extreme Risk (AQHI 10+)**: $PM_{2.5} > 80\,\mu\text{g/m}^3$. Avoid outdoor exertion; close windows and use HEPA filtration.
- **Comprehensive Monitoring Station Scope (12 Stations)**:
  - **Vancouver Urban & Core**: Downtown Robson Square, Clark Drive (Traffic Arterial), Kitsilano (Coastal Baseline), Richmond South / YVR (Sea Island).
  - **North Shore & Mountain**: North Vancouver St. Denis Park, North Vancouver Mahon Park, West Vancouver (Inglewood).
  - **Burrard Peninsula & Fraser Valley**: Burnaby South (Kensington), Burnaby Mountain (SFU Ridge), Port Moody (Inlet Centre), Coquitlam (Pinetree), Surrey East & Langley.
- **Core Features**:
  - **Hyper-Local Station Sensor Matrix**: Real-time $PM_{2.5}$, AQHI, $O_3$, $NO_2$, and $SO_2$ readings.
  - **24-Hour Particulate Trajectory Sparklines**: Hourly curves revealing smoke buildup vs clearing trends.
  - **Air-Conditioned Clean-Air Shelter Directory**: Free public facilities (VPL branches, community centres) with industrial HEPA filtration and air conditioning.
  - **Wildfire Smoke Advisory Banner**: Real-time broadcast alerts from Metro Vancouver & VCH.
  - **High-Density Dashboard Card**: Shows 6+ key neighborhood stations with live $PM_{2.5}$ readings, AQHI status, and dynamic ⭐ pinning synchronization.

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
