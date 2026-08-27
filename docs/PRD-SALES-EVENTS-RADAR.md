# Product Requirements Document (PRD) — VanHeartbeat: Metro Vancouver Warehouse, Sample Sales & Local Deals Radar

## 1. Executive Summary & Vision

### 1.1 Module Overview
- **Module Name**: Metro Vancouver Warehouse, Sample Sales & Local Deals Radar
- **Module Identifier**: `sales-events`
- **Internal Routes**: `/sales` and `/sales/[sale-slug]` (e.g. `/sales/aritzia-warehouse-sale-2026`, `/sales/arcteryx-factory-sale`, `/sales/herschel-sample-sale`, `/sales/mec-gear-swap-vancouver`, `/sales/le-creuset-factory-sale`)
- **Parent Platform**: VanHeartbeat / VanUtils (Astro 5 on Cloudflare Pages)

### 1.2 Strict Real-Data & Anti-Spam Mandate
- **100% Real-World Verified Events**: All sale dates, venue addresses, admission requirements, discount tiers, lineup guidelines, and payment policies are ingested directly from official venue bookings, brand press announcements, and verified organizer schedules:
  - **Major Venue Event Feeds**: Vancouver Convention Centre Public Calendar, PNE Forum Events Directory, Croatian Cultural Centre, Italian Cultural Centre, and Heritage Hall Main St.
  - **Official Brand Clearance Portals**: Verified annual warehouse sales (Aritzia, Arc'teryx, Herschel Supply Co., Duer, Tentree, Outdoor Research, Lululemon, Indochino).
  - **Community Gear Swaps & Annual Plant Sales**: MEC Vancouver Snow & Bike Swap, Vancouver Ski & Snowboard Swap (PNE), VanDusen Botanical Garden Plant Sale, UBC Farm Market Plant Sale.
- **Strict Zero-Affiliate & Zero-Spam Policy**: Generating, linking to, or displaying synthetic promo codes, spammy affiliate coupon links, dropshipping ads, or unverified digital coupons is strictly prohibited. Only verified in-person warehouse sales, designer sample sales, factory outlets, and annual community gear swaps are permitted.

### 1.3 The Problem
- Metro Vancouver is famous for massive warehouse sales, sample sales, and outdoor gear swaps, but essential details—exact dates, venue halls, ticket requirements vs. general walk-in, line-up queue times, bag check rules, and payment methods—are scattered across fleeting social media posts and spam-ridden coupon blogs.
- Shoppers arrive unprepared for strict venue bag policies, lack of fitting rooms, or "credit-only" rules, or miss ticket drop windows for timed entry.
- Vancouverites need a fast, zero-ad, sub-50ms civic radar delivering verified warehouse sale dates, queue intelligence, transit access, and 1-tap calendar synchronization (.ics / Google Calendar).

---

## 2. User Personas & Core Use Cases

| Persona | Motivation | Core Use Case |
| :--- | :--- | :--- |
| **The Fashion & Apparel Hunter** | Seeks premium local brands (Aritzia, Herschel, Duer) at 50–80% off retail. | Checks line-up queue estimates, opening morning start times, and payment rules before heading to the Convention Centre or East Van warehouses. |
| **The Outdoor Enthusiast & Skier** | Seeks discounted GORE-TEX outerwear, skis, snowboards, and climbing gear. | Tracks dates for Arc'teryx Factory Sale and PNE / MEC Ski & Snowboard Swaps with 1-tap calendar alert. |
| **The Home & Garden Enthusiast** | Looks for annual plant sales, ceramics pop-ups, and kitchenware clearances. | Discovers weekend pop-up sales at Heritage Hall, VanDusen, or Croatian Cultural Centre. |

---

## 3. High-Density Dashboard Card Specification (`/`)

In compliance with the **Zero-Fluff, High-Density Card Law**:
- **100% Clickable Container (`<a>`)**: Entire card is a single link navigating directly to `/sales`. Zero nested buttons or distracting secondary links.
- **80%+ Real Data Density**: Displays 6 live upcoming warehouse / sample sale rows:
  1. *Aritzia Annual Warehouse Sale* • **Aug 27–Sep 1** • VCC West Hall • 50–70% Off • *Free Walk-in*
  2. *Arc'teryx Factory Outlet Sale* • **Sep 18–21** • North Van • Technical Shells • *Timed Tickets*
  3. *Herschel Supply Sample Sale* • **Oct 3–5** • East Van • Bags & Apparel • *Credit/Debit Only*
  4. *Vancouver Ski & Snowboard Swap* • **Oct 17–19** • PNE Forum • Skis/Boots/Gear • *Consignment*
  5. *VanDusen Fall Plant Sale* • **Sep 13** • Floral Hall • Perennials & Bulbs • *Free Entry*
  6. *Duer Denim Warehouse Pop-up* • **Nov 7–9** • Kitsilano • Performance Jeans • *Final Sale*
- **⭐ Pinning Synchronization**: Supports client-side pinning via `localStorage.getItem('vanutils_pinned_sales-events')` allowing users to pin the Sales Radar to their homepage dashboard.

---

## 4. Key Functional Requirements (FR)

### 4.1. Active & Upcoming Sales Directory
- **FR-SALES-101 (Category Filtering)**:
  - 1-tap filters: `All`, `Fashion & Apparel`, `Outdoor & Ski Gear`, `Home & Garden`, `Indie & Artisan Sample Sales`.
- **FR-SALES-102 (Time Horizon View)**:
  - Filter by: `This Weekend`, `Next 14 Days`, `Upcoming This Season`.
- **FR-SALES-103 (Discount Tiers & Inventory Focus)**:
  - Displays verified discount ranges (e.g. `50%–80% Off MSRP`) and key inventory categories (Outerwear, Denim, Footwear, Accessories, Skis).

### 4.2. Venue, Admission & Lineup Intelligence
- **FR-SALES-201 (Entry & Ticketing Protocols)**:
  - Explicit badges for `Free Public Walk-in`, `Free Timed Ticket Required`, `Paid VIP Entry`.
- **FR-SALES-202 (Lineup Radar & Peak Queue Advisor)**:
  - Historical queue advice (e.g. "Peak lineup: 6:00 AM – 9:00 AM on Opening Day; walk-in queue clears after 2:00 PM on weekdays").
- **FR-SALES-203 (Venue Logistics & Bag Policy)**:
  - Permitted bag sizes (e.g. "No backpacks or large totes allowed; mandatory coat check on site").
  - Accepted payment methods: `Credit / Debit Only (No Cash)`, `Tap Accepted`, `Final Sale / No Returns`.

### 4.3. 1-Tap Calendar Export (.ics & Google Calendar)
- **FR-SALES-301 (Calendar Integration)**:
  - Generate dynamic `.ics` file downloads and direct Google Calendar links with pre-populated venue addresses, operating hours, and entry tips.

### 4.4. Transit, Cycling & Parking Guide
- **FR-SALES-401 (Mobility & Access)**:
  - Direct walking distances from nearest SkyTrain stations (Waterfront, Hastings / PNE, Main St-Science World), Mobi bike share stations, and nearby public parkades with daily maximum rates.

---

## 5. Technical Architecture & Edge SSR Implementation

### 5.1 Route Structure
- `/sales` — Main high-density sales radar with category filters, search bar, and active sale cards.
- `/sales/[sale-slug]` — Comprehensive single-sale guide (full operating hours, lineup queue tips, venue maps, parking rates, payment methods, inventory guides, and calendar export).

### 5.2 Dynamic Live Loader Protocol (`services/salesService.ts`)
```typescript
/**
 * Asynchronously loads live sales events at the Cloudflare Edge with 1.2s timeout
 */
export async function getLiveSalesEvents(category?: string): Promise<LiveResult<SalesEvent[]>>
```
- Strict 1.2-second timeout using `AbortSignal.timeout(1200)`.
- Returns `Promise<LiveResult<SalesEvent[]>>` (issue #35). This loader's only genuine live signal is a date-based status evaluation (`upcoming`/`active_now`/`concluded`) against `src/tools/sales-events/data/sales.json` schedule data — that evaluation never depends on the venue-feed fetch, so it is always current and never a masked failure.

### 5.3 Tiered Edge Caching Matrix
- `Astro.response.headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=7200')` (Medium-Low Volatility: 30-minute edge cache with 2-hour SWR revalidation).

---

## 6. Data Schema & TypeScript Interfaces

```typescript
// src/tools/sales-events/types.ts

export type SaleCategory = 
  | 'fashion_apparel'
  | 'outdoor_gear'
  | 'home_garden'
  | 'indie_artisan'
  | 'kids_family';

export type EntryType = 
  | 'free_walkin' 
  | 'timed_ticket' 
  | 'paid_vip';

export type PaymentMethod = 
  | 'credit_debit_only' 
  | 'cash_card' 
  | 'all_payments';

export interface SaleDateSchedule {
  date: string;               // "2026-08-27"
  dayOfWeek: string;          // "Thursday"
  openTime: string;           // "07:00"
  closeTime: string;          // "21:00"
  notes?: string;             // "Opening day - doors open 7 AM"
}

export interface SalesEvent {
  id: string;                 // "aritzia-warehouse-sale-2026"
  name: string;               // "Aritzia Annual Warehouse Sale"
  brand: string;              // "Aritzia"
  category: SaleCategory;
  startDate: string;          // "2026-08-27"
  endDate: string;            // "2026-09-01"
  status: 'upcoming' | 'active_now' | 'concluded';
  discountRange: string;      // "50% - 70% Off"
  entryType: EntryType;
  ticketUrl?: string;
  venueName: string;          // "Vancouver Convention Centre (West Building)"
  venueAddress: string;       // "1055 Canada Place, Vancouver, BC"
  hallDetails?: string;       // "Exhibition Halls A & B"
  municipality: string;       // "Vancouver"
  latitude: number;
  longitude: number;
  transitAccess: string;      // "3 min walk from Waterfront SkyTrain (Expo & Canada Line)"
  parkingInfo: string;        // "VCC West Parkade ($24 daily max)"
  schedule: SaleDateSchedule[];
  lineupAdvice: string;       // "Expect 1-2h queue before 9 AM on Thu/Fri. Evening hours have minimal wait."
  bagPolicy: string;          // "No backpacks, large totes, or strollers inside. Mandatory free coat check."
  paymentPolicy: PaymentMethod;
  fittingRoomInfo: string;    // "Communal fitting rooms only. Wear comfortable base layers."
  returnPolicy: string;       // "Final sale on all items. No refunds or exchanges."
  officialSourceUrl: string;
  featuredItems: string[];
  lastUpdated: string;        // ISO 8601
}

export interface SalesOverviewStats {
  activeSalesCount: number;
  upcomingThisMonth: number;
  avgDiscountPercent: number;
  nextMajorSaleName: string;
  nextMajorSaleDate: string;
}
```

---

## 7. Performance Budget & Quality Assurance

- **Edge TTFB**: $< 50\text{ms}$ on Cloudflare YVR PoP.
- **Page Render**: $< 400\text{ms}$.
- **Client JavaScript Payload**: $< 15\text{KB}$.
- **Accessibility & SEO**: Semantic HTML5 markup with valid Schema.org `Event` and `SaleEvent` JSON-LD structured data.
- **Lighthouse Target**: 95+ across Performance, Accessibility, Best Practices, and SEO.

---

## 8. Definition of Done (DoD)

1. **Zero Synthetic / Fake Coupons**: 100% of event entries are verified in-person warehouse sales, sample sales, and community swaps with authentic venues and dates.
2. **True Runtime Edge Execution**: `getLiveSalesEvents()` executes on Cloudflare Edge with 1.2s timeout enforcement.
3. **High-Density Dashboard Card**: Homepage card renders 6 live sale rows with ⭐ pinning synchronization.
4. **Calendar Export Functionality**: 1-tap dynamic `.ics` calendar generation for every sale.
5. **Zero Lint / Build Errors**: `npm run check` and `npm run build` pass with 0 errors.
