# Product Requirements Document (PRD) — VanUtils (Vancouver Micro-Utilities Hub)

## 1. Executive Summary & Vision
- **Product Name**: VanUtils (`vancouver.tools` / `vanutils.ca`)
- **Target Platform**: Web / Mobile-First PWA (Astro on Cloudflare Pages)
- **Product Vision**: A unified, ultra-lightweight suite of hyper-local micro-utilities designed specifically for Metro Vancouver residents. VanUtils provides single-purpose, sub-second tools accessible from one cohesive hub with zero bloat, zero tracking, and zero ads.

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
   - **Ferry Standby Radar**: Displays real-time deck capacity & standby clearance odds for top routes (*Tsawwassen ➔ Swartz Bay*, *Horseshoe Bay ➔ Departure Bay*).
   - **Mountain Snow Line**: Displays summit elevations, current freezing levels, and webcam alerts for *Cypress, Grouse, and Seymour*.
   - **Evo & Parking Radar**: Displays active street-sweeping warnings, tow clocks, and permit zone statuses.

3. **Zero Visual Bloat & No Decorative Distractions**:
   - **Strictly Prohibited on Cards**: Large decorative icon containers, category labels (*"Outdoors & Nature"*), verbose sub-headers, promotional blurbs, and redundant footer buttons.
   - **Required Header**: Clean Utility Title + Live Count Badge (e.g. `Can I Swim?` • `[30/31 Safe]`).

4. **Home Card Customization Protocol**:
   - Every micro-utility must allow users to customize what items appear on their home dashboard card.
   - In `/swim`, users click the ⭐ star icon next to any beach to add/remove it from their **"Main Beaches"** list.
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
|  - 31 Real Beaches|      |  - Deck Space %   |    |  - Freezing line |
|  - ⭐ Pin to Home |      |  - Standby Odds   |    |  - Webcams       |
+───────────────────+      +───────────────────+    +──────────────────+
```

- **Framework**: Astro 5 (Static Site Generation + Cloudflare Edge Workers)
- **Styling**: Tailwind CSS with dark mode zero-flicker protection
- **Deployment**: Cloudflare Pages / Workers Edge CDN (`wrangler.json` / `wrangler.toml`)
- **Performance Budget**: Client JS $< 25\text{ KB}$, First Contentful Paint $< 0.8\text{s}$
- **Privacy Standard**: 100% Client-side state (`localStorage`), 0 telemetry, 0 cookies

---

## 4. Micro-Utility Specifications

### Tool #1: "Can I Swim Today?" (`/swim`) — Flagship Live Utility
- **Official Data Ingestion**: Direct integration with Metro Vancouver GIS Enterprise Feature Server (`gis.metrovancouver.org`) and Vancouver Coastal Health / Fraser Health weekly surveillance.
- **Safety Standard**:
  - 🟢 **Safe**: 30-day geometric mean $\le 200$ CFU/100mL & single sample $\le 235$ CFU/100mL.
  - 🟡 **Caution**: Single sample $235 - 400$ CFU/100mL (resampling triggered).
  - 🔴 **Advisory**: Geometric mean $> 200$ CFU/100mL or single sample $> 400$ CFU/100mL.
- **Swim Page UX**:
  - Pinned "Main Beaches" quick bar with 1-click `×` unpin.
  - Minimal search bar + 5 region pills (*All Metro, Vancouver, North Shore, Burnaby/Belcarra, White Rock/Delta*).
  - High-density beach rows with name, municipality, GPS distance, CFU, status indicator, and ⭐ pin button.
  - Dedicated beach detail pages (`/swim/[slug]`) for full 30-day historical SVG charts and transit links.

### Tool #2: BC Ferries Standby Radar (`/ferries`) — Planned Roadmap
- Live drive-up standby odds for Tsawwassen and Horseshoe Bay terminals.
- Car deck capacity percentages and queue cam feeds.

### Tool #3: Mountain Snow Line (`/snow`) — Planned Roadmap
- Freezing level elevation tracker for North Shore mountains (Cypress, Grouse, Seymour).
- Road chain advisories and summit webcam matrix.

### Tool #4: Evo & Street Sweeping Radar (`/parking`) — Planned Roadmap
- Vancouver street-sweeping calendar sync and tow-away warning clocks.
- Evo drop-off permitted map layer.

---

## 5. Multi-Tool Expansion Protocol for Future Modules
When adding a new utility module to VanUtils:
1. **Scaffold Directory**: Create `src/tools/<tool-id>/` with types and services.
2. **Register in Config**: Add entry to `src/config/tools.ts`.
3. **Build High-Density Card**: Implement in `src/components/shared/ToolCard.astro` following Section 2 rules (clickable container, maximum live data items, zero fluff).
4. **Implement Tool Route**: Create `src/pages/<tool-id>/index.astro` using `ToolLayout`.
5. **Add Pinning Support**: Store user favorite items in `localStorage.getItem('vanutils_pinned_<tool-id>')` and broadcast changes via CustomEvent.
6. **Verify Build**: Run `npm run check` (0 errors) and `npm run build`.
