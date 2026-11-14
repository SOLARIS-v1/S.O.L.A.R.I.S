# ASTRA — Astronaut Health Intelligence Platform
**NASA Space Apps Challenge 2026: Create Health Monitoring Software for Astronauts on Space Missions**

ASTRA is an autonomous health intelligence dashboard designed for long-duration deep space exploration (Lunar Gateway, Mars Transit, and Surface Operations) where Earth-ground communication delay ranges from seconds up to 22 minutes.

ASTRA prioritizes **visual analysis first**, **individual baseline deviation over generic static thresholds**, and **zero invented clinical advice**, ensuring high crew autonomy and explainable clinical decision support.

---

## 1. Key Capabilities & Workflow

- **Monitor**: Continuous telemetry ingestion across 11 physiological parameters (Resting Heart Rate, Systolic/Diastolic Blood Pressure, Fasting Glucose, Core Temperature, Sleep Duration, Mood, Fatigue, SpO2, Respiratory Rate, HRV).
- **Understand**: 14-day rolling personal baselines computed using robust statistics (Median and Median Absolute Deviation / MAD), avoiding generic limits that misjudge individual microgravity adaptation.
- **Detect**: Explainable rule engine flagging multi-indicator cascades (e.g. *Cumulative Sleep-Fatigue Syndrome*, *Febrile Hyperdynamic Pattern*) before isolated numbers trigger acute alarms.
- **Guide**: Direct integration with NASA Human Research Program (HRP) spaceflight hazards with cited non-drug operational countermeasures.
- **Act & Sync**: Dual-console architecture with simulated communication link latency (Station, Lunar, Mars). The ground Medical Officer Console strictly displays downlink-verified records, queueing unsynced telemetry onboard during blackout windows.

---

## 2. Tech Stack & Architecture

- **Core**: React 18, TypeScript, Vite, Tailwind CSS (custom calm space-dark design system tokens).
- **3D Digital Twin**: Three.js, `@react-three/fiber`, `@react-three/drei` with procedural stylized matte ghost geometry, soft rim lighting, contact shadow, 3D pulsing hotspot markers, camera easing, and automatic 2D SVG anatomical fallback.
- **Data Visualization**: Recharts (custom styled) + hand-crafted SVG sparklines with shaded baseline bands (median ± MAD).
- **State & Mock Engine**: Zustand with local storage persistence, deterministic seeded PRNG for 4 crew profiles across 30 mission days.
- **Strict Local-First**: 100% offline compliant, bundled `@fontsource-variable/inter` fonts, no CDN dependencies, CSP enforced (`connect-src 'self'`).

---

## 3. Project Structure

```text
ASTRA/
├── public/
│   ├── favicon.svg                # Vector SVG mission mark
│   └── models/                    # Slot for external human.glb model (procedural fallback active)
├── src/
│   ├── api/
│   │   ├── types.ts               # Core telemetry record, finding, task, and crew schemas
│   │   ├── client.ts              # Abstract ApiClient interface mirroring REST routes
│   │   └── mockClient.ts          # Zustand store, local-first engine, fault injection
│   ├── components/
│   │   ├── body/
│   │   │   ├── Body3DScene.tsx         # R3F Canvas, local rim lighting, camera rig
│   │   │   ├── BodyHotspot.tsx         # 3D pulsing ring markers with hover chip
│   │   │   ├── ProceduralGhostFigure.tsx # Procedural lathe & capsule ghost humanoid
│   │   │   ├── Body2DFallback.tsx      # SVG anatomical projection fallback
│   │   │   └── BodyExplorer.tsx        # Container with 3D/2D toggle and system tags
│   │   ├── common/
│   │   │   ├── StatusBadge.tsx         # Normal (dot), Watch (triangle), Review (diamond), Urgent (octagon)
│   │   │   └── SimulatedBadge.tsx      # Distinct violet telemetry badge (#8E8AB8)
│   │   ├── dashboard/
│   │   │   ├── IndicatorTile.tsx       # Big value (32px), delta arrow, 14d sparkline with baseline band
│   │   │   ├── FindingsTimelineStrip.tsx # Horizontal time axis with severity markers
│   │   │   └── SystemDetailDrawer.tsx  # Subsystem telemetry, 2-sentence rationale, hazard link
│   │   ├── hazards/
│   │   │   └── HazardSideDrawer.tsx    # 5 NASA spaceflight hazards with HRP citations
│   │   ├── navigation/
│   │   │   ├── TopBar.tsx              # Mission day (142/500), environment, link state, astronaut switcher
│   │   │   └── NavTabs.tsx             # 6 primary workflow views
│   │   └── simulator/
│   │       └── SimulatorDrawer.tsx     # Floating telemetry generator, fault injection triggers
│   ├── data/
│   │   ├── thresholds.ts          # NASA-STD-3001 baseline parameters & citations
│   │   └── hazards.ts             # 5 NASA spaceflight hazards (Radiation, Isolation, Distance, Gravity, Environment)
│   ├── mock/
│   │   ├── engine.ts              # Robust z-score, MAD baseline calculation, persistence rules
│   │   └── seed.ts                # Deterministic 30-day history for Alex, Maya, Daniel, Sofia
│   ├── pages/
│   │   ├── CommandPage.tsx        # Screen A: 3D body centerpiece, 8 indicator tiles, findings timeline
│   │   ├── CheckInPage.tsx        # Screen B: 4-step wizard, circular sleep dial, 5-step icon scales
│   │   ├── AnalyticsPage.tsx      # Screen C: 30-day heatmap, co-movement compare overlay, small multiples
│   │   ├── DetectionPage.tsx      # Screen D: Explainable finding cards, observed vs baseline evidence
│   │   ├── TasksPage.tsx          # Screen E: Mission tasks, 5 demand gauges, standardized readiness outputs
│   │   └── MedicalPage.tsx        # Screen F: Surgeon console, 4-crew grid, synced-only records filter
│   ├── App.tsx                    # Shell router, responsive container, regulatory footer
│   ├── index.css                  # Tailwind styles, Inter variable, custom dark scrollbars
│   └── main.tsx                   # React root entrypoint
├── package.json
├── tailwind.config.js             # ASTRA design tokens (#0A0D12, #10141B, #151A23, #7CB6D6, etc.)
└── tsconfig.json
```

---

## 4. How to Run Locally

### Prerequisites
- Node.js 18+ (tested on Node v20 / v22 / v24)
- npm 9+

### Commands
```bash
# Clone and enter directory
cd ASTRA

# Install dependencies (fully offline capable once downloaded)
npm install

# Start development server
npm run dev
# -> Opens http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 5. Backend Replacement Contract (FastAPI + SQLite)

To replace the mock data layer with a real Python FastAPI + SQLite backend, implement the endpoints below matching `src/api/client.ts`. Set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=http://localhost:8000/api`.

### Telemetry Record Schema (`POST /api/records`, `GET /api/records`)
```json
{
  "id": "rec-ASTRA-02-heart_rate-1700000000-123",
  "subject_id": "ASTRA-02",
  "type": "heart_rate",
  "value": 84,
  "unit": "bpm",
  "timestamp": "2026-11-14T08:00:00.000Z",
  "source": "simulated_device",
  "is_simulated": true,
  "quality": "ok",
  "mission_phase": "Transit Day 142",
  "synced": true,
  "synced_at": "2026-11-14T08:00:00.000Z"
}
```

### Endpoints Matrix
| Method | Endpoint | Query / Payload | Response Description |
|---|---|---|---|
| `GET` | `/api/records` | `?subject_id=ASTRA-02&limit=50&synced_only=false` | Array of `HealthRecord` objects. When `synced_only=true` (Medical Console), omit unsynced records. |
| `POST` | `/api/records` | Payload: `HealthRecord` (without `id`, `synced`, `synced_at`) | Returns created record. Sets `synced=False` if link is `down`. |
| `GET` | `/api/findings` | `?subject_id=ASTRA-02` | Array of `Finding` objects generated by the Python scoring engine. |
| `PATCH`| `/api/findings/{id}` | Payload: `{"status": "acknowledged", "review_notes": "..."}` | Updates finding status and attaches CMO notes. |
| `GET` | `/api/crew` | None | Returns 4 crew profiles with aggregated status and pending count. |
| `GET` | `/api/tasks` | None | Returns mission tasks with demand profiles and readiness recommendations. |
| `GET` | `/api/link` | None | Returns current link state (`connected`, `limited`, `down`), pending queue count, and last sync timestamp. |
| `POST`| `/api/link` | Payload: `{"state": "connected" \| "limited" \| "down"}` | Toggles link state; if set to `connected`, triggers asynchronous queue drain. |

### Python Detection Engine (`engine/`)
The backend should mirror the robust statistics implemented in `src/mock/engine.ts`:
1. **Baseline**: Rolling median and MAD ($1.4826 \times \text{MAD}$) over the last 14 days, requiring $\ge 5$ observations before establishing baseline.
2. **Robust Z-score**: $Z = \frac{x - \text{median}}{1.4826 \times \text{MAD}}$.
3. **Persistence Rule**: 3 consecutive same-direction readings with $|Z| \ge 1.8$ raises level by +1.
4. **Named Combinations**:
   - Fever ($T \ge 37.6^\circ\text{C}$) + Tachycardia ($\text{HR} \ge 85$ or $Z \ge 2.0$) $\to$ *Febrile Hyperdynamic Pattern*.
   - Sleep Deficit ($< 6.2\text{h}$) + High Fatigue ($\ge 3.5$) $\to$ *Cumulative Sleep-Fatigue Syndrome*.

---

## 6. Regulatory & Ethical Disclaimer

> **Prototype Decision Support, Not a Medical Device.**  
> ASTRA is engineered as a decision-support prototype for the NASA Space Apps Challenge. Reference ranges cite general adult aerospace guidelines (NASA-STD-3001) and are not validated clinical diagnostic limits. In accordance with NASA flight operational protocols, mission task readiness evaluations provide decision support and do not replace authorized command or medical authority.
