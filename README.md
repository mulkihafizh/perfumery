# Perfumery — Community Fragrance Intelligence & Leaderboard

An archival fragrance intelligence platform that aggregates, cleans, ranks, and analyzes community perfume discussions across the **Motion Ime Discord** server and the **r/fragrance Reddit** archive.

Built with **Nuxt 3** (SSR + Nitro), **Tailwind CSS**, and **Node.js Native SQLite** (`node:sqlite`), featuring sub-millisecond paginated queries, proximity-based entity extraction, and live catalog reconciliation.

---

## Architecture Overview

```
                                  DATA SOURCES
                                 ──────────────
                 ┌──────────────────────────────────────────────┐
                 │  • Kaggle Fragrantica Master CSV             │
                 │  • Sociolla Indonesian Fragrance Category    │
                 │  • Reddit r/fragrance Archive (922k zst)     │
                 │  • Discord Community Export (83k json)       │
                 └──────────────────────┬───────────────────────┘
                                        │
                         INGESTION & CATALOG PIPELINE
                         ────────────────────────────
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │           perfume_catalog.json            │
                  │       (1,090 Brands, 22,724 Models)       │
                  └─────────────┬─────────────────────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
      [Reddit Extractor]                [Discord Extractor]
     Phase-1 Quick Reject              stream-json Pipeline
     Proximity Validation             Context Message Trees
               │                                 │
               └────────────────┬────────────────┘
                                │
                                ▼
                 [Unified Leaderboard Reconciler]
                  app/public/data/leaderboard.json
                                │
                                ▼
                     [SQLite Database Builder]
                    app/server/data/perfumery.db
                                │
                                ▼
                       APPLICATION RUNTIME
                      ─────────────────────
                 ┌───────────────────────────────┐
                 │  Nitro Server API (/api/...)  │
                 │   • /api/stats (Metadata)     │
                 │   • /api/perfumes (Paginated) │
                 │   • /api/perfumes/:slug       │
                 └──────────────┬────────────────┘
                                │
                                ▼
                  Nuxt 3 Spec Sheet / Ateliers UI
                 (Tailwind CSS + Plus Jakarta Sans)
```

---

## Prerequisites

- **Node.js**: `v22.5.0` or higher (required for native `node:sqlite` / `DatabaseSync`).
- **Python**: `3.10` or higher (required for Reddit `.zst` extraction and Sociolla crawler).
- **Package Manager**: `npm` (included with Node.js).

Install Python dependencies:
```bash
python -m pip install -r requirements.txt
```

---

## Quickstart (Local Development)

1. **Install Dependencies**:
   ```bash
   npm install
   npm --prefix app install
   ```

2. **Verify or Rebuild SQLite Database**:
   ```bash
   npm run db:build
   ```

3. **Start the Nuxt Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production Build & Preview**:
   ```bash
   npm run build
   node app/.output/server/index.mjs
   ```

---

## Data Pipeline & Maintenance

| Command | Description |
| :--- | :--- |
| `npm run pipeline:run` | **Full Parallel Pipeline**: Runs Reddit extractor and Discord extractor simultaneously, merges unified leaderboard, and compiles the SQLite database (~4.5 minutes). |
| `npm run db:build` | **Fast SQLite Compiler**: Rebuilds `app/server/data/perfumery.db` with B-Tree indexes from the unified JSON in ~1.5 seconds. |
| `npm run catalog:sync:sociolla` | **Sociolla Live Sync**: Crawls Category 145 on Sociolla with dual HTML/API fallback and polite jitter, normalizing titles and updating `perfume_catalog.json`. |
| `npm run reddit:fetch` | Downloads latest Reddit comments via Pushshift / Arctic Shift API into `.zst` stream. |
| `npm run reddit:extract` | Runs standalone Reddit comment extractor (`scripts/reddit_extractor.py`). |
| `npm run build:global` | Runs standalone Discord extractor (`scripts/build-global-leaderboard.js`). |
| `npm run build:unified` | Merges Reddit rankings and Discord threads into unified JSON. |
| `npm run reddit:verify` | Runs accuracy, recall, and false-positive verification suite. |

---

## Deploying to Vercel

The application is fully prepared for Vercel deployment with zero cold-start penalty, utilizing bundled SQLite persistence.

### Step 1: Push Repository to GitHub
Ensure all code and the generated database (`app/server/data/perfumery.db`) are pushed to your repository.

### Step 2: Import Project into Vercel
1. Open [Vercel Dashboard](https://vercel.com/new).
2. Select your `Perfumery` repository.

### Step 3: Configure Project Settings (Crucial)
Configure the following settings in the Vercel deployment form:

- **Framework Preset**: `Nuxt.js`
- **Root Directory**: Click **Edit** and select **`app`**.
- **Node.js Version**: Navigate to **Settings** → **General** → **Node.js Version** and select **`22.x`** *(required for `node:sqlite`)*.
- **Build Command**: `npm run build` (or leave default `nuxt build`).
- **Output Directory**: `.output` (automatically detected).

> [!NOTE]
> Setting the Root Directory to `app` isolates the Nuxt 3 web app and avoids uploading local data processing files (`raw-export.json`, `.zst` archives) to Vercel.

### Step 4: Automated SQLite Packaging
You do not need to configure external storage. `app/nuxt.config.ts` includes a Nitro compilation hook:
```typescript
nitro: {
  hooks: {
    compiled(nitro) {
      // Bundles perfumery.db alongside serverless runtime
    }
  }
}
```
During build, Nitro copies `perfumery.db` into the server output. `app/server/utils/db.ts` automatically resolves the database in the Vercel serverless container (`/var/task/data/perfumery.db`) in read-only mode with indexed B-Tree performance.

---

## Project Structure

```
Perfumery/
├── app/                           # Nuxt 3 Full-Stack Application
│   ├── app/                       # Vue 3 Components, Pages, Composables
│   │   ├── assets/css/main.css    # Monastic / Editorial Design System
│   │   ├── components/            # LeaderboardTable, StatsOverview, ThreadViewer, etc.
│   │   ├── composables/           # usePerfumeData.ts (State & API client)
│   │   └── pages/                 # index.vue (Leaderboard), perfume/[slug].vue (Spec Sheet)
│   ├── public/                    # Static Assets (favicon, robots.txt, data)
│   ├── server/                    # Nitro Server Engine
│   │   ├── api/                   # /api/stats, /api/perfumes, /api/perfumes/:slug
│   │   ├── data/perfumery.db      # Production SQLite B-Tree Database (92 MB)
│   │   └── utils/db.ts            # node:sqlite Database Manager
│   ├── nuxt.config.ts             # Nuxt & Nitro Bundling Configuration
│   ├── tailwind.config.ts         # Typography & Color Tokens
│   └── vercel.json                # Vercel Runtime Settings
│
├── scripts/                       # Ingestion & Data Mining Pipeline
│   ├── run-parallel-pipeline.js   # Parallel Pipeline Orchestrator
│   ├── reddit_extractor.py        # Reddit .zst Streaming Extractor
│   ├── build-global-leaderboard.js# Discord Stream Parser & Matcher
│   ├── build-unified-leaderboard.js# Leaderboard Aggregator & Reconciler
│   ├── build-sqlite-db.js         # SQLite Database Compiler
│   ├── build_perfume_catalog.py   # Kaggle CSV Catalog Generator
│   ├── fetch_reddit_comments.py   # Reddit Stream Fetcher
│   └── verify_reddit_pipeline.py  # Precision & Accuracy Verification Suite
│
├── sync_sociolla_to_catalog.py    # Sociolla Live Category Crawler & Reconciler
├── perfume_catalog.json           # Master Catalog (1,090 Brands, 22,724 Models)
├── requirements.txt               # Python Dependencies
├── package.json                   # Root Orchestration Scripts
└── README.md                      # Documentation
```

---

## License

Private repository. All rights reserved.
