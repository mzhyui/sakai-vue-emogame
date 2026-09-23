# EmoGame Vue dashboard

Vue 3 + PrimeVue implementation of the EmoGame portfolio overview, built on
the Sakai 5 layout. The page reads the same portfolio query layer as the
Streamlit dashboard through `GET /api/dashboard/overview`.

## Run locally

Start the API from the repository root:

```bash
.venv/bin/uvicorn api.main:app --reload --port 8000
```

Then start Vite in another shell:

```bash
cd sakai-vue
npm ci
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000`. In production, route `/api`
to FastAPI through the same-origin reverse proxy. `VITE_API_BASE_URL` can point
at another origin only when that API has an explicit CORS policy.

## Included behavior

- Shared search, hero, quality, score-coverage, cash-coverage and date filters.
- The three portfolio KPIs from the Streamlit overview.
- Quality distribution, score/cash scatter and release/revenue timeline.
- Independent ranking keys for `emotion` and `cash`; localized labels never
  control sorting semantics.
- Explicit score-provenance, cohort-release and missing-data boundaries.
- Responsive Sakai navigation, PrimeVue components, theme configuration and
  dark mode.

## Validate

```bash
npm run build
```

The dashboard API is read-only. Missing numeric values remain `null`; they are
not neutral-imputed or converted to zero by the frontend.
