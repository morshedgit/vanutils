# VanUtils (Vancouver Micro-Utilities Hub)

[![Astro](https://img.shields.io/badge/Astro-5.x-BC52EE.svg)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020.svg)](https://pages.cloudflare.com)
[![Bundle Size](https://img.shields.io/badge/Client%20JS-<25KB%20Budget-10B981.svg)](https://github.com/morshedgit/vanutils)
[![Zero Trackers](https://img.shields.io/badge/Privacy-100%25%20Zero%20Telemetry-0284C7.svg)](https://github.com/morshedgit/vanutils)

> A unified, ultra-lightweight suite of hyper-local micro-utilities designed specifically for Metro Vancouver residents. Instead of forcing users to install multiple bulky apps or navigate fragmented government websites filled with slow tables and ads, VanUtils provides single-purpose, sub-second tools accessible from one cohesive hub.

Detailed requirements and UX laws are documented in the [Product Requirements Document (PRD.md)](./PRD.md).

---

## 🎛️ The Zero-Fluff, High-Density Dashboard Law
All utility cards on the Main Dashboard (`/`) follow strict density standards:
- **100% Clickable Container (`<a>`)**: No nested buttons, secondary links, or bottom footers.
- **Maximum Data Density (80%+ Card Space)**: Fits 8–12+ live beach statuses, terminal queues, or mountain snow levels directly on the card face.
- **Zero Decorative Fluff**: Eliminates decorative icon boxes, category badges, and promotional subheaders.
- **⭐ Real-Time Personalization**: Users can star/pin favorite items inside any utility tool to customize what appears on their home dashboard card (persisted via `localStorage`).

## 🚀 Flagship Pilot: Tool #1 "Can I Swim Today?" (`/swim`)

- **Instant Safety Traffic Light Indicator**:
  - 🟢 **Safe (Green)**: 30-day geometric mean $\le 200$ CFU/100mL and single sample $\le 235$ CFU/100mL.
  - 🟡 **Caution (Yellow)**: Single sample $235 - 400$ CFU/100mL (Beach Action Value triggered; resampling in progress).
  - 🔴 **Advisory (Red)**: Geometric mean $> 200$ CFU/100mL or single sample $> 400$ CFU/100mL or active health closure.
  - ⚪ **Unmonitored (Gray)**: Off-season (October–April) or no sample within 14 days.
- **35+ Monitored Metro Vancouver Beaches & Lakes**:
  - Vancouver (English Bay, Kitsilano, Sunset Beach, Jericho, Spanish Banks East/West/Ext, Locarno, Second Beach, Third Beach, Trout Lake, CRAB Park, Hadden Park Dog Beach, Tower Beach, Wreck Beach).
  - West Vancouver (Ambleside, Dundarave, Whytecliff Park, Sandy Cove).
  - North Vancouver (Cates Park / Whey-ah-wichen, Deep Cove / Panorama Park, Kings Mill Walk Dog Beach).
  - Burnaby (Barnet Marine Park, Deer Lake Beach).
  - Richmond (Iona Beach Regional Park, Garry Point Park).
  - White Rock / South Delta (White Rock East/West Beach, Crescent Beach, Centennial Beach).
  - Belcarra / Tri-Cities (Sasamat Lake White Pine Beach, Buntzen Lake North/South Beach, Belcarra Regional Park).
  - Bowen Island & Lions Bay (Sandy Beach, Bowen Bay, Lions Bay Beach, Kelvin Grove).
- **Interactive 30-Day Trend Sparklines**: Visual SVG curves with advisory threshold markers at 200 & 400 CFU/100mL.
- **Dynamic Distance Sorting**: Automatically ranks beaches from nearest to furthest with travel time estimates.
- **Amenity Filters**: 🐾 Dog-friendly, 🏊 Lifeguards, ♿ Accessible Beach Mats, 🚻 Washrooms, 🏞️ Freshwater Lakes.

---

## 🗺️ Micro-Utilities Portfolio

| Tool | Route | Status | Description |
| :--- | :--- | :--- | :--- |
| **Tool #1: Can I Swim?** | `/swim` | **Active Live** | 31 Metro Vancouver beaches, weekly E. coli lab tracking & water safety. |
| **Tool #2: Ferry Standby Radar** | `/ferries` | **Active Live** | Real-time vehicle deck %, standby odds, Hullo, SeaBus & DriveBC cams. |
| **Tool #3: Mountain Snow Line** | `/snow` | **Active Live** | Live coastal freezing level, Cypress/Grouse/Seymour/Whistler soundings. |
| **Tool #4: Evo Parking Radar** | `/parking` | *Roadmap v1.3* | City street-sweeping calendar sync & permitted Evo drop-off zones. |

---

## ⚡ Server-Side Edge Rendering (SSR) Architecture
VanUtils is deployed on **Cloudflare Workers / Pages** using **Astro 5 Server-Side Edge Rendering (`output: "server"`)**:
- **YVR Vancouver Edge PoP**: Sub-50ms TTFB delivered directly from local in-memory edge cache.
- **Dynamic Live Loaders**: Queries authentic APIs in parallel with 1.2s timeout failover to verified snapshots.
- **Tiered Edge Caching**: Stale-while-revalidate policies (`s-maxage=60s` to `600s`) prevent upstream rate limits while ensuring 100% fresh data.

---

## 🛠️ Architecture & Modularity

Each micro-utility is housed in its own isolated module under `src/tools/<tool-name>/`:

```
vanutils/
├── public/
│   ├── _headers               # Cloudflare Edge caching & security policies
│   ├── manifest.webmanifest   # Mobile-first PWA configuration
│   └── favicon.svg            # Custom SVG icon
├── src/
│   ├── config/
│   │   └── tools.ts           # Central Tool Registry & Vancouver Neighborhood presets
│   ├── layouts/
│   │   ├── PlatformLayout.astro # Platform Shell (Header, Navigation, Dark Mode, SEO)
│   │   └── ToolLayout.astro     # Standardized wrapper for micro-utilities
│   ├── components/shared/     # Reusable UI (Header, Footer, GeoPicker, StatusBadge, ToolCard)
│   ├── tools/
│   │   └── can-i-swim/        # [TOOL #1 - Flagship MVP]
│   │       ├── components/    # BeachCard.astro, FilterBar.astro, Sparkline.astro, SafetyLegend.astro
│   │       ├── data/          # beaches.json (35+ Metro Vancouver beaches seed dataset)
│   │       ├── services/      # healthCalc.ts, vchScraper.ts
│   │       └── types.ts       # Beach, SamplingRecord, WaterQualityStatus
│   ├── pages/
│   │   ├── index.astro        # Hub Homepage / Directory
│   │   ├── swim/
│   │   │   ├── index.astro    # Can I Swim Dashboard & Real-time Filter Grid
│   │   │   └── [slug].astro   # Individual Beach Detail & 30-Day Trend Route
│   │   ├── ferries/index.astro# Tool #2 Ferry Standby Radar Preview
│   │   ├── snow/index.astro   # Tool #3 Mountain Snow Line Preview
│   │   ├── parking/index.astro# Tool #4 Evo Parking Radar Preview
│   │   └── api/swim/beaches.ts# Edge API Endpoint for Live Beach Data
│   └── services/shared/
│       └── geo.ts             # Haversine distance calculations & GPS helpers
├── astro.config.mjs           # Hybrid Astro + Cloudflare Adapter configuration
├── tailwind.config.cjs        # Semantic tokens & custom status palettes
└── tsconfig.json              # Strict TypeScript configuration
```

---

## 💻 Developer Commands

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Perform strict TypeScript & component check
npm run check

# 4. Build optimized production bundle for Cloudflare Pages
npm run build

# 5. Preview production build
npm run preview
```

---

## ⚡ Performance & Privacy Highlights

- **Bundle Size**: Total client JavaScript payload is **~6 KB (1.9 KB gzipped)**, well below the 25 KB budget.
- **First Contentful Paint (FCP)**: Sub-second globally via Cloudflare Edge CDN static assets and hybrid functions.
- **Zero-Flicker Theme**: Instant dark/light mode toggle with pre-render head script.
- **Privacy First**: 0 third-party trackers, 0 ads, 100% client-side geolocation storage.

---

## 📄 License & Health Data Attribution

- Health data sourced from [Vancouver Coastal Health (VCH)](https://www.vch.ca) and [Fraser Health Authority](https://www.fraserhealth.ca) recreational beach surveillance.
- Project licensed under the MIT License.
