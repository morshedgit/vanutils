# Product Requirements Document (PRD) — VanHeartbeat: Interactive WebGL Weather Radar & Wind Map UX

## 1. Executive Summary & Problem Statement

### 1.1 Objective
Upgrade the **Metro Vancouver Hyper-Local Weather & Microclimate Radar (`/weather`)** from standard tabular metrics to a **high-impact, visual, interactive WebGL Doppler Radar & Wind Streamline Map** using Windy.com's hardware-accelerated meteorological engine, fully integrated with VanHeartbeat's hyper-local ECCC microclimate stations.

### 1.2 The Problem
- **Spatial Blindspots**: Tabular weather numbers alone cannot convey approaching atmospheric rivers, squall lines, marine fog banks in Burrard Inlet, or storm fronts moving across the Strait of Georgia.
- **Microclimate Complexity**: Metro Vancouver's topography causes dramatic precipitation gradients between coastal flats (YVR, Tsawwassen) and mountain slopes (North Vancouver, SFU). Users need visual confirmation of where the rain band is currently located.
- **Commercial Clutter**: Traditional radar sites (The Weather Network, AccuWeather) are burdened with disruptive video ads, cookie walls, and bloated page weight ($>15\text{ MB}$).

### 1.3 The Solution
Embed a high-performance, zero-ad, responsive **Windy WebGL Interactive Radar & Wind Visualizer** into `/weather`, accompanied by 1-tap layer switching (*Live Doppler Radar, Animated Wind Vectors, Rain Accumulation, Cloud Density, Marine Swell*), time-scrubber playback, and live station overlays.

---

## 2. Interactive Map UX & Layer Architecture

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|               METRO VANCOUVER INTERACTIVE RADAR & MICROCLIMATE RADAR (`/weather`)                 |
|   Layer Switcher: [ 📡 Live Radar ]  [ 💨 Wind Vectors ]  [ 🌧️ Rain/Thunder ]  [ 🌊 Marine Waves ]|
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                                                                                   |
|                      🗺️  WINDY WEBGL INTERACTIVE VANCOUVER RADAR                                   |
|              (Centered: 49.2827°N, -123.1207°W • Zoom: 10 • Salish Sea & North Shore)              |
|                                                                                                   |
|    • Live Doppler Precipitation Sweeps (ECCC Aldergrove Composite Radar)                          |
|    • Real-Time Animated Wind Streamlines through Georgia Strait & Burrard Inlet                   |
|    • Interactive Timeline Scrub: 2-Hour Historical Loop + 12-Hour Forecast Projection            |
|                                                                                                   |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                  HYPER-LOCAL ECCC STATION MATRIX                                  |
|  [ 📍 Downtown: 19.4°C ]  [ 🌲 North Van: 17.2°C ]  [ ✈️ YVR: 19.8°C ]  [ ⛰️ Burnaby Mtn: 16.5°C ]|
+───────────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Core Functional Requirements (FR)

### 3.1. Interactive WebGL Radar Viewport
- **FR-RADAR-101 (Geographic Centering)**:
  - Default map viewport centered directly over Metro Vancouver (`lat=49.2827`, `lon=-123.1207`, `zoom=10`).
  - Viewport bounds cover: West Vancouver, North Vancouver, Downtown Peninsula, Kitsilano, Richmond, Delta, Surrey, Burnaby, Tri-Cities, and Bowen Island.
- **FR-RADAR-102 (Multi-Layer Quick Switcher)**:
  - 1-tap buttons directly above the radar map allowing users to toggle visual overlays:
    1. **📡 Live Doppler Radar (`overlay=radar`)**: Real-time precipitation composite scans with dBZ reflectivity color scale.
    2. **💨 Wind Streamlines (`overlay=wind`)**: Dynamic animated particle vectors showing wind direction, speed (km/h / knots), and gusts.
    3. **🌧️ Rain & Thunder (`overlay=rain`)**: 12-hour accumulated rainfall forecasts and lightning strike density.
    4. **☁️ Cloud Satellite (`overlay=clouds`)**: High-resolution infrared cloud cover over the Pacific Northwest.
    5. **🌊 Marine Swell & Waves (`overlay=waves`)**: Wave heights and swell intervals for marine transit, ferries, and watercraft.
- **FR-RADAR-103 (Timeline Playback & Scrubbing)**:
  - Integrated slider to play/pause radar animation across past 2 hours and scrub forward through high-resolution forecast models.

### 3.2. Microclimate Integration & Station Overlays
- **FR-RADAR-201 (Station Telemetry Grid)**:
  - Directly beneath the radar canvas, display the 8 live ECCC Automated Weather Stations (AWS):
    - *Downtown Harbour (`CWVF`)*
    - *Kitsilano Beach*
    - *North Vancouver Lynn Valley*
    - *YVR Airport (`CWVR`)*
    - *Burnaby Mountain (SFU)*
    - *Richmond Steveston*
    - *West Vancouver Point Atkinson (`CWTA`)*
    - *Coquitlam / Tri-Cities*
- **FR-RADAR-202 (24-Hour Precipitation Sparklines)**:
  - Micro-sparkline curves rendering hourly rain accumulation ($0.0\text{mm}$ to $15.0\text{mm/h}$) alongside probability of precipitation (PoP %).

### 3.3. Homepage Weather Card Upgrade (`/`)
- **FR-RADAR-301 (High-Density Dashboard Card Standard)**:
  - 100% Clickable container (`<a>`) navigating directly to `/weather`.
  - Dedicates 80%+ card space to 6 live microclimate rows + live radar status badge (e.g. `[📡 Radar Active • 0mm Rain Front]`).
  - ⭐ Client-side pinning via `localStorage.getItem('vanutils_pinned_weather-forecast')`.
  - Zero stock icons or marketing copy.

---

## 4. Technical Architecture & Component Specification

### 4.1 Component: `src/tools/weather-forecast/components/InteractiveRadarMap.astro`
- **Container Structure**:
  ```html
  <div class="relative w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-lg">
    <!-- Quick Layer Pills -->
    <div class="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 ...">
      <button data-overlay="radar">📡 Live Radar</button>
      <button data-overlay="wind">💨 Wind Streamlines</button>
      <button data-overlay="rain">🌧️ Rain Forecast</button>
      <button data-overlay="waves">🌊 Marine Swell</button>
    </div>
    
    <!-- Responsive WebGL Iframe Canvas -->
    <iframe
      id="windy-radar-frame"
      src="https://embed.windy.com/embed2.html?lat=49.283&lon=-123.121&detailLat=49.283&detailLon=-123.121&width=100%25&height=500&zoom=10&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
      class="w-full h-[420px] sm:h-[520px] border-0"
      loading="lazy"
      allow="geolocation"
    ></iframe>
  </div>
  ```

### 4.2 Security, Privacy & Performance Constraints
1. **0 KB Client JS Overhead**: Runs fully hardware-accelerated inside an isolated, sandboxed WebGL iframe.
2. **Lazy Loading**: `loading="lazy"` ensures zero impact on initial page render or First Contentful Paint (FCP $<0.4\text{s}$).
3. **Theme & Dark Mode Harmony**: Configured with dark basemap styling matching VanHeartbeat's dark palette.

---

## 5. Non-Functional Requirements & Performance Budget

- **TTFB Target**: $< 50\text{ms}$ at Cloudflare YVR Edge.
- **Client JavaScript**: $0\text{ KB}$ added payload.
- **Cache-Control**: `public, s-maxage=300, stale-while-revalidate=600` (5-minute Edge cache with 10-minute SWR).
- **Accessibility**: Screen-reader accessible alternative table for all visual meteorological data.

---

## 6. Implementation Deliverables & Milestone Plan

| Milestone | Deliverables | Scope |
| :--- | :--- | :---: |
| **M1: PRD Specification & Approval** | Finalize `docs/PRD-WEATHER-INTERACTIVE-RADAR-MAP.md` and submit PR. | Complete |
| **M2: Radar Component Scaffolding** | Build `src/tools/weather-forecast/components/InteractiveRadarMap.astro` with layer toggles. | Pending |
| **M3: Page Layout Integration** | Embed radar into `src/pages/weather/index.astro` and `src/pages/weather/[station].astro`. | Pending |
| **M4: Hub Card Enhancements** | Upgrade homepage `ToolCard.astro` with live radar indicator and microclimate rows. | Pending |
| **M5: QA & Mobile Touch Validation** | Verify responsive touch pan/zoom on iOS Safari and Android Chrome with 0 layout shift. | Pending |
