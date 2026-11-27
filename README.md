# CITYTRACE — The Truth Behind Every Street

An AI-assisted civic transparency prototype: a 3D district you can click, a permanent
record of what was reported and what was built, and an evidence-bound investigation
layer that reads the whole dataset and shows what does not reconcile.

**Every project, authority, budget, document and photograph in this application is
fictional demonstration data.** Nothing here represents a real government record.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional — enable live Gemini narration:

```bash
cp .env.example .env.local
# then set GEMINI_API_KEY
```

Without a key the product is fully functional: the AI layer falls back to the
deterministic rules engine, and the UI labels which engine produced each answer.

### Persistence (required for any hosted deployment)

Citizen reports, status changes, evidence, watchlists and notifications are kept
in Supabase (Postgres + Storage), so they survive serverless cold starts and are
shared by every user. Without Supabase credentials the app falls back to local
temp files — fine for `npm run dev` or an offline laptop demo, but data is lost
on Vercel.

1. Create a Supabase project (free tier) and run [`supabase/setup.sql`](supabase/setup.sql)
   in its SQL Editor. It creates the `app_state` table and the `issue-photos` bucket.
2. In `.env.local` (and in Vercel → Environment Variables), set:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Settings → API. Server-only; never commit.
   - `CITYTRACE_AUTH_SECRET` — signs session cookies (`openssl rand -base64 32`).
     **Required on Vercel**: sign-in refuses to run there without it.

Photos are resized in the browser (max 1600 px JPEG), which also strips GPS
location and other metadata, then validated by file signature on the server
and stored under random file names.

---

## The demo journey

1. **Overview** — district health, spending split by evidence strength, recurring
   failure sites, live civic trend.
2. **City Explorer** — click the red beacon on Begum Rokeya Sarani Link Road.
3. **Issue file** — the road has been reported **3 separate times** since 2023; the
   latest is reopened. Its permanent history is intact.
4. **Related project** — jump to `CT-DH-R01`: 96.9% of allocation reported spent,
   35% built, four of four milestones missed.
5. **Investigate** — run the deep-dive report: recurrence, schedule slip, spending
   reconciliation, missing information, and citations that link back to records.
6. **Ask** — "Why has the link road been repaired three times?" and follow the cited
   sources.
7. **Report an issue** — file your own; it appears in the register, on the 3D map,
   and in global search immediately.

Reset the demo at any time:

```bash
npm run reset:demo
```

---

## Modules

| Route | What it does |
| --- | --- |
| `/` | Transparency dashboard: KPIs, trend, category and sector comparison, money split, evidence coverage, AI insights |
| `/city-explorer` | Interactive 3D sector with marker filters, sector framing and evidence previews |
| `/civic-issues` | Permanent issue register with status/category/sector filters |
| `/civic-issues/[id]` | Full issue file: history, evidence, related project, prior reports at the location, status management |
| `/civic-issues/report` | Citizen reporting with photo attachment |
| `/public-projects` | Project explorer with search and status/sector filters |
| `/public-projects/[id]` | Project ledger: budget position, milestone schedule, evidence, linked issues |
| `/money-tracker` | Allocated / reported / verified spend with interactive charts |
| `/ai-investigation` | City-wide anomaly sweep, civic Q&A, deep-dive investigations |

## API

| Route | Purpose |
| --- | --- |
| `POST /api/issues` | File a citizen report |
| `PATCH /api/issues/[id]` | Change status (appends to permanent history) |
| `POST /api/ask` | Answer a civic question from the dataset |
| `POST /api/investigate` | Generate an evidence-bound investigation report |

---

## Architecture

```
src/
├─ app/
│  ├─ (app)/              # all shell-wrapped routes
│  └─ api/                # report, status, ask, investigate
├─ components/
│  ├─ layout/             # sidebar, top bar, search, notifications
│  ├─ ui/                 # Panel, Badge, StatCard, PageHeader, skeletons
│  ├─ city/               # R3F scene + explorer
│  ├─ ai/                 # ask, findings, workbench
│  ├─ money/ dashboard/   # Recharts modules
│  └─ evidence/           # evidence tiles
├─ data/                  # seeded sectors, projects, issues, evidence
├─ lib/                   # stats, ask, anomalies, dashboard, issue store
├─ types/                 # domain model
└─ utils/                 # formatting, tones
```

**Data model** — `Sector ──< Issue >── Project ──< Milestone`, with `Evidence`
attached to issues and projects. Recurrence is derived from a shared `locationKey`,
so "the same problem came back" is a data relationship, not a text match.

**Two rules the code enforces:**

- *Money is never merged.* Allocated, reported and independently verified spend are
  separate fields, and "missing" is displayed as missing.
- *Statistics are never typed in.* Every figure is computed from the dataset; the
  dashboard, register and map share one source of truth.

**Citizen reports** are persisted by a small server-side store
(`src/lib/issue-store.ts`) layered over the immutable seed data, so submitted
reports survive reloads and flow into every module.

---

## Commands

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # ESLint (Next 16 removed `next lint`)
npm run typecheck   # tsc --noEmit
npm run check:links # crawl the running app for broken internal links
npm run reset:demo  # clear reports, status changes, notifications and photos
                    # (local temp files + Supabase from .env.local)
npm run reset:demo -- --env=.env.prod --yes   # reset another environment, e.g. production
```
