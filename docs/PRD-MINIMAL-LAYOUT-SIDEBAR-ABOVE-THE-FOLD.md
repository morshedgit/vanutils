# Product Requirements Document (PRD) — VanHeartbeat: Ultra-Minimal Layout, Left-Anchor Sidebar & 2-Rows Above-the-Fold Viewport Optimization

**Author**: VanHeartbeat UI/UX Architect  
**Status**: DRAFT / PROPOSED  
**Target Release**: v2.3.0  
**Scope**: Platform Layout, Header Navigation, Left Sidebar Filter Rail, Typography Cleanliness & Above-the-Fold Real Estate  

---

## 1. Executive Summary & Objective

### 1.1 Objective
Eliminate wasted vertical viewport real estate on the homepage and across all views by transitioning to an **ultra-compact top menu**, **icon-free typographic design**, and **left-anchored vertical category sidebar**. 

This redesign guarantees that at least **two full rows of live telemetry cards (6–8 cards total) are visible above the fold** on standard 1080p, 1440p, and laptop screens without requiring any scrolling.

### 1.2 The Problem
Currently, the homepage wastes $\sim 280-350\text{px}$ of vertical space before the utility grid starts:
1. **Tall Header Bar (`64px`)**: Contains decorative emoji icons (`🌊 Outdoors`, `⛴️ Transit`, `🏥 Health`, `🏛️ Civic`) and redundant nested drop-downs.
2. **Heavy Main Top Padding (`32px`)**: Pushes content further down the screen.
3. **Verbose Title & Subtitle (`60-80px`)**: Takes up vertical height above the cards.
4. **Horizontal Filter Pills Bar (`50-60px`)**: Sits in the vertical document flow directly above the card grid.
5. **Result**: On a typical desktop screen ($800-900\text{px}$ available viewport height), only 1 row of cards is visible. The second row is pushed below the fold.

---

## 2. Target Design & Above-the-Fold Viewport Geometry

```
+─────────────────────────────────────────────────────────────────────────────────────────────+
| [VanHeartbeat] Live Pulse (44px Compact Header)                     [City Search] [Theme]   |
+─────────────────────────────────────────────────────────────────────────────────────────────+
| LEFT SIDEBAR (Sticky)  │ MAIN TELEMETRY GRID (Starts at Y = 56px)                           |
|                        │                                                                     |
| FILTERS                │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────┐ |
| • All Utilities (16)   │ │  WEATHER      │ │  FERRIES      │ │  SNOW LINE    │ │  BRIDGES  │ |
| • Outdoors & Snow (4)  │ │  19.4°C       │ │  82% Deck     │ │  0°C @ 4430m  │ │  FLOWING  │ |
| • Transit & Roads (3)  │ └───────────────┘ └───────────────┘ └───────────────┘ └───────────┘ |
| • Health & Triage (3)  │                                                                     |
| • Civic & Market (6)   │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────┐ |
|                        │ │  ER WAIT      │ │  AIR QUALITY  │ │  SPORTS       │ │  PARKING  │ |
| STATUS                 │ │  VGH: 149m    │ │  AQHI 2 (LOW) │ │  Canucks 7PM  │ │  CLEARED  │ |
| 16 Feeds Active        │ └───────────────┘ └───────────────┘ └───────────────┘ └───────────┘ |
|                        │                                                                     |
| (Zero wasted height)   │ ▲▲▲ BOTH ROWS 100% VISIBLE ABOVE THE FOLD (Height < 720px) ▲▲▲      |
+─────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Core Functional & UI Specifications

### 3.1. Ultra-Slim Header Navigation (`Header.astro`)
- **Reduced Height**: Compact `h-11` (44px) or `h-12` (48px) bar (down from 64px).
- **Zero Icon/Emoji Clutter**:
  - Remove all emoji icons (`🌊`, `⛴️`, `🏥`, `🏛️`, `🎾`, `🎈`, etc.) from top navigation links.
  - Clean text typography only: `Overview`, `Outdoors`, `Transit`, `Health`, `Civic`, `About`, `Contact`.
- **Streamlined Brand Badge**:
  - Minimalist `VanHeartbeat` logo text + micro emerald pulsing dot.
  - Remove verbose multi-line subtitle text on desktop.
- **Controls**: Clean minimal `GeoPicker` + `ThemeToggle`.

---

### 3.2. Left Anchor Category Sidebar (`src/pages/index.astro`)
- **Desktop Viewport ($\ge 1024\text{px}$)**:
  - Move category filtering out of the vertical document flow and position it as a **sticky Left Anchor Sidebar** (`w-52` / `w-56`).
  - Vertical list of categories with live count badges:
    - `All Utilities (16)`
    - `Outdoors & Snow (4)`
    - `Transit & Roads (3)`
    - `Health & Daily (3)`
    - `Civic & Housing (6)`
  - Active category indicator with clean background pill styling.
  - Live pulse status counter embedded in the sidebar footer (`● 16 Live Feeds Active`).
- **Mobile / Tablet Viewport ($< 1024\text{px}$)**:
  - Convert to an ultra-slim horizontal swipe rail with minimal vertical padding (`py-1.5`) and zero emoji clutter.

---

### 3.3. Minimal Inline Header & Main Content Area
- **PlatformLayout Padding**:
  - Reduce `main` top padding from `py-6 sm:py-8` (24-32px) to `pt-3 pb-6 sm:pt-4 sm:pb-8` (12-16px).
- **Condensed Heading**:
  - Replace large multi-line hero block with an ultra-compact single line header or eliminate redundant title text to start the card grid immediately at $Y \approx 56\text{px}$.

---

### 3.4. Global Icon & Emoji Cleanup
- **Anti-Clutter Law**:
  - Remove decorative emoji prefixes across headers, category buttons, drop-down menus, and card wrappers.
  - Rely on high-contrast typography, status color dots (emerald, amber, rose, sky), and direct numeric telemetry.

---

## 4. Technical Layout Architecture

```html
<!-- Platform Structure (index.astro) -->
<div class="flex flex-col lg:flex-row gap-6 items-start w-full">
  
  <!-- Sticky Left Sidebar (lg:w-52 shrink-0 sticky top-16) -->
  <aside class="hidden lg:block w-52 shrink-0 sticky top-16 space-y-4">
    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Categories</div>
    <nav class="space-y-1" id="sidebar-category-filters">
      <!-- Clean Text Filter Buttons -->
    </nav>
    <div class="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
      <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
      16 Feeds Live
    </div>
  </aside>

  <!-- Main Grid (flex-1) -->
  <section class="flex-1 w-full">
    <!-- Mobile Filter Rail -->
    <div class="lg:hidden flex overflow-x-auto gap-1.5 pb-3">...</div>

    <!-- 3/4-Column High-Density Grid (Starts immediately at Top) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
      <!-- Tool Cards -->
    </div>
  </section>
</div>
```

---

## 5. Verification & Acceptance Criteria

1. **Two Rows Above the Fold**:
   - On a standard $1920 \times 1080$ screen (and $1440 \times 900$ laptop), at least 2 full rows (6–8 cards) are 100% visible above the fold without scrolling.
2. **Zero Icon/Emoji Clutter**:
   - Navigation links, category tabs, and header dropdowns contain zero decorative emojis.
3. **Responsive Sidebar**:
   - Desktop ($\ge 1024\text{px}$) displays the sticky left filter sidebar.
   - Mobile/Tablet displays a slim horizontal scroll strip.
4. **Performance & Build**:
   - `npm run check` passes with 0 errors across 198 project files.
   - `npm run build` succeeds for Cloudflare Pages Edge SSR.
