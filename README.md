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

---

## Deploying to Vercel

The application is fully prepared for Vercel deployment with zero cold-start penalty, utilizing bundled SQLite persistence.

### Two Supported Ways to Deploy on Vercel

You can deploy either directly from the **Repository Root** (default) or by setting the **Root Directory to `app`**. Both work out-of-the-box.

#### Option A: Default Root Deployment (Recommended & Simplest)
1. Push your repository to GitHub.
2. Import the `Perfumery` repository in the [Vercel Dashboard](https://vercel.com/new).
3. Leave **Root Directory** as `./` (default).
4. Go to **Settings** → **General** → **Node.js Version** and ensure **`22.x`** is selected *(mandatory for Node.js native `node:sqlite`)*.
5. Click **Deploy**.

> [!NOTE]
> The root `package.json` and `vercel.json` automatically run `postinstall` to install Nuxt dependencies, build the Nitro server, and mirror `.output` with the bundled `perfumery.db`.

#### Option B: Subfolder Deployment (`Root Directory: app`)
1. In the Vercel project creation / settings modal:
   - Click **Edit** next to **Root Directory** and choose **`app`**.
2. Go to **Settings** → **General** → **Node.js Version** and select **`22.x`**.
3. Click **Deploy**.

### What Was Fixed to Prevent Vercel Build Errors
- **Production `devDependencies` Stripping**: Moved Nuxt modules (`@nuxtjs/tailwindcss`, `@nuxtjs/google-fonts`, `@nuxt/icon`) into `dependencies` in `app/package.json` so that Vercel's `NODE_ENV=production` build doesn't omit them.
- **Root Directory Mismatch**: Added root `vercel.json` and output sync in root `package.json` so Vercel finds `.output` whether building from root or `app/`.
- **Node.js 22 Engine**: Enforced `"engines": { "node": ">=22.5.0" }` for `node:sqlite`.
- **Automated Database Packaging**: `app/nuxt.config.ts` bundles `app/server/data/perfumery.db` into the serverless function package during the build hook.

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
