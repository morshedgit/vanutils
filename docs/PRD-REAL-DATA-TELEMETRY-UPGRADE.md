# Product Requirements Document (PRD) — VanHeartbeat: 100% Real-Data Ingestion Pipeline & Public Telemetry Upgrade

**Author**: VanHeartbeat Platform Architect  
**Status**: PROPOSED / REVIEW  
**Target Release**: v2.2.0  
**Target Scope**: Docs / Specification Only (`docs/PRD-REAL-DATA-TELEMETRY-UPGRADE.md`)

---

## 1. Executive Summary & Objective

In strict accordance with the **100% Real-Data Mandate** defined in `AGENTS.md`, VanHeartbeat prohibits synthetic, mock, or fake data across all civic utilities.

This PRD specifies the complete modernization of data ingestion pipelines for the four utilities identified during platform audits with synthetic formulas, hardcoded baselines, or stale timestamp-only synchronization:

1. **"Can I Swim" Beach Water Quality (`/swim`)**: Replace the mathematical sine wave formula (`Math.sin(idx) * factor`) with genuine weekly lab-tested E. coli bacteria counts ($\text{CFU}/100\text{mL}$) from Vancouver Coastal Health (VCH) and Fraser Health sampling portals.
2. **Hospital & Urgent Care Wait Times (`/health`)**: Replace static baseline numbers with a live provincial emergency department triage ingestion engine streaming real-time wait times (`waitTimeMinutes`) and patient queue metrics.
3. **Metro Vancouver Air Quality Network (`/air`)**: Connect to continuous BAM-1020 $\text{PM}_{2.5}$ ($\mu\text{g/m}^3$), $\text{NO}_2$, $\text{O}_3$, and $\text{SO}_2$ sensor feeds to compute authentic Environment and Climate Change Canada (ECCC) AQHI indices.
4. **Bridge & Tunnel Travel Times (`/bridges`)**: Upgrade crossing travel times from static baseline estimates to dynamic delay calculations powered by DriveBC Open511 incident severities.

---

## 2. Root Cause Analysis & Audit Findings

```
┌──────────────────────────────┬──────────────────┬────────────────────────────────────────────────────────┐
│ Micro-Utility Module         │ Telemetry Grade  │ Identified Flaw / Required Upstream Solution           │
├──────────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
│ 1. "Can I Swim" Beach Water  │ 🔴 Synthesized   │ Sine wave formula generates historical E. coli counts. │
│                              │                  │ -> Replace with genuine VCH weekly lab sampling.       │
│ 2. Hospital ER Wait Times    │ 🔴 Stale / Mock  │ Static wait times in JSON; sync only touches timestamp.│
│                              │                  │ -> Connect live to provincial ED wait times feed.      │
│ 3. Air Quality BAM-1020      │ 🔴 Stale / Mock  │ Static pollutant values with timestamp touching.       │
│                              │                  │ -> Ingest live BAM-1020 PM2.5 & AQHI sensor telemetry. │
│ 4. Bridge & Tunnel Delays    │ 🟡 Hybrid Live   │ Incidents are live, but travel times are static.       │
│                              │                  │ -> Apply dynamic delay deltas from Open511 severity.   │
└──────────────────────────────┴──────────────────┴────────────────────────────────────────────────────────┘
```

---

## 3. Upstream Data Source Architecture & Technical Specifications

```
+─────────────────────────────────────────────────────────────────────────────+
|                     OFFICIAL PUBLIC DATA INGESTION ENGINE                   |
+─────────────────────────────────────────────────────────────────────────────+
         │                              │                             │
         ▼                              ▼                             ▼
+───────────────────+          +───────────────────+        +───────────────────+
| VANCOUVER COASTAL |          | ED WAIT TIMES BC  |        | CONTINUOUS AIR    |
| HEALTH & FRASER H.|          | (Emergency Triage)|        | SENSOR NETWORK    |
| - Real E. coli CFU|          | - Live ER Minutes |        | - Live PM2.5 ug/m3|
| - 30-Day Geo Means|          | - Patients Waiting|        | - ECCC AQHI Index |
+───────────────────+          +───────────────────+        +───────────────────+
         │                              │                             │
         └──────────────────────┬───────┴─────────────────────────────┘
                                ▼
         +─────────────────────────────────────────────+
         |     SCHEDULED SYNC & EDGE SSR LOADER        |
         | - 1.2s Fast Edge Loader (edgeFetch)         |
         | - Tiered Cache-Control & Stale-While-Reval  |
         | - Zero Synthetic Fallback Protocol          |
         +─────────────────────────────────────────────+
```

---

### 3.1. Module 1: "Can I Swim" Beach Water Quality (`/swim`)

#### Upstream Data Feeds:
- **Vancouver Coastal Health (VCH) Recreational Water Quality**:
  - Open GIS Feature Server: `https://gis.metrovancouver.org/arcgis/rest/services/Hosted/Beach_Sampling_Site/FeatureServer/2/query?where=1%3D1&outFields=*&f=json&outSR=4326`
- **Fraser Health Beach Water Quality Portal**:
  - URL: `https://www.fraserhealth.ca/health-topics-a-to-z/recreational-water/beach-water-quality`

#### Pipeline Requirements:
- Ingest actual laboratory-analyzed water samples:
  - **Geometric Mean (30-day)**: Calculated from the last 5 genuine laboratory water samples.
  - **Latest Single Sample**: The most recent lab reading with exact collection date (`sampleDate`).
- **Water Safety Status Standards**:
  - `safe`: Geometric mean $\le 200\text{ CFU}/100\text{mL}$ AND latest single sample $\le 235\text{ CFU}/100\text{mL}$.
  - `caution`: Single sample between $235\text{ CFU}$ and $400\text{ CFU}/100\text{mL}$.
  - `advisory`: Geometric mean $> 200\text{ CFU}/100\text{mL}$ OR single sample $> 400\text{ CFU}/100\text{mL}$.
- **Zero Mock Rule**: If an upstream lab sample is unavailable, the system flags the beach as `unmonitored` or retains the last known authentic lab date with `isStale: true`, **never synthesizing a number**.

---

### 3.2. Module 2: Hospital & Urgent Care Wait Times (`/health`)

#### Upstream Data Feed:
- **Provincial Emergency Department Telemetry Feed**:
  - Endpoint: `https://www.edwaittimes.ca/legacy`
  - Ingestion: Extract live `locationsWithWaitTimes` from Next.js state payload.

#### Ingested Facilities:
- **Vancouver General Hospital (VGH)** (`slug: "VGH"`)
- **St. Paul's Hospital (SPH)** (`slug: "SPH"`)
- **BC Children's Hospital** (`slug: "BCHBCCHILDREN"`)
- **Lions Gate Hospital (LGH)** (`slug: "LGH"`)
- **Richmond Hospital (RHS)** (`slug: "RHS"`)
- **Mount Saint Joseph Hospital (MSJ)** (`slug: "MSJ"`)
- **Burnaby Hospital (BH)** (`slug: "BH"`)
- **Royal Columbian Hospital (RCH)** (`slug: "RCH"`)
- **Surrey Memorial Hospital (SMH)** (`slug: "SMH-A"`)
- **Urgent & Primary Care Centres (UPCCs)**: City Centre, REACH, North Vancouver Centre, Richmond City Centre, Edmonds, Metrotown, Port Moody, Surrey Whalley.

#### Triage Intensity Classification:
- `low`: $< 90\text{ minutes}$
- `moderate`: $90\text{ to }210\text{ minutes}$
- `high`: $> 210\text{ minutes}$
- `unavailable`: Outside operating hours or data unposted.

---

### 3.3. Module 3: Metro Vancouver Air Quality Network (`/air`)

#### Upstream Data Feed:
- **Continuous BAM-1020 Air Quality Model & Sensor Telemetry**:
  - Endpoint: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5&timezone=America/Vancouver`

#### ECCC AQHI Formula Implementation:
$$\text{AQHI} = \left(\frac{10}{10.4}\right) \times 100 \times \left[(e^{0.000537 \times \text{O}_3} - 1) + (e^{0.000871 \times \text{NO}_2} - 1) + (e^{0.000487 \times \text{PM}_{2.5}} - 1)\right]$$

- Map computed integer (1-10+) to health risk category:
  - $1-3$: `low`
  - $4-6$: `moderate`
  - $7-10$: `high`
  - $10+$: `very_high`
- Ingest rolling 24-hour hourly $\text{PM}_{2.5}$ arrays for historical sparklines.

---

### 3.4. Module 4: Dynamic Bridge Crossing Delays (`/bridges`)

#### Calculation & Incident Factor Matrix:
- Combine baseline transit times with active DriveBC Open511 incidents:
  - **Major Incident / Vehicle Stall**: Add $+14\text{ minutes}$ delay, set status to `heavy`.
  - **Minor Incident / Shoulder Work**: Add $+6\text{ minutes}$ delay, set status to `moderate`.
  - **No Active Incidents**: Normal baseline travel times with live counterflow state.

---

## 4. Implementation Protocol & Verification Rules

1. **Strict 1.2s Fast Edge Loader SLA**:
   - `edgeFetch()` AbortSignal timeout set to $1200\text{ms}$.
   - Tiered Edge Cache-Control (`s-maxage=60..300, stale-while-revalidate=120..600`).
2. **Deterministic Build-Time Synchronization**:
   - `npm run data:sync:all` must execute cleanly before production builds.
3. **Zero-Mock Verification Mandate**:
   - `grep -rn "Math.sin" scripts/` must return 0 results.
   - `grep -rn "Math.random" src/ scripts/` must return 0 results.
4. **Code Quality**:
   - `npm run check` must pass with 0 errors across 198 project files.
   - `npm run build` must compile cleanly under Cloudflare Pages Edge SSR (`output: "server"`).
