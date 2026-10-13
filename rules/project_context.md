# Project context — End to End Solutions marketing site

Static marketing site. Astro 7 static output, Tailwind 4, one React island,
nginx-served via Docker. **Scaffold state: no backend, no database, not
deployed.** 5 routes (Home, About, 404, Privacy Policy). 885 LOC of source.

`CLAUDE.md` is a symlink to `AGENTS.md`. Deep toolchain/deployment gotchas
live there; this file is the map.

## Architecture

```
astro build (pnpm build)  ──>  dist/            static, no runtime
   index.html / 404.html / privacy-policy/index.html
   _astro/*.css  +  *.{js}                     hashed, long cache
        │
        ▼
   Docker stage 2: nginx:alpine                nginx/nginx.app.conf
        │  serves dist/, error_page 404 -> 404.html (real 404 status)
        ▼
   Docker stage 1 proxy: nginx:alpine          nginx/nginx.{prod,local}.conf
        │  reverse proxy, 6h reload loop (TLS mode only)
        ▼
   certbot (profile: tls, ACME http-01 via webroot)
```

- **No database, no API, no server-side code.** Nothing to migrate.
- `PUBLIC_*` env vars are **inlined at build time** by Astro, not read at
  runtime. `PUBLIC_GA_MEASUREMENT_ID` is therefore a Docker build ARG.
- `site:` in `astro.config.mjs` drives canonical URLs and absolute `og:image`
  URLs — must change with the deploy domain.
- Base images (`nginx:alpine`, `certbot/certbot`, `node:24-alpine`) are
  unpinned; pnpm is pinned to 12.4.2 inside the Dockerfile.

## Modules

| Path | Responsibility |
| :-- | :-- |
| `src/layouts/BaseLayout.astro` | Document shell. Per-page `title`/`description` props, canonical, OG + Twitter cards, skip-link, mounts GA + banner. |
| `src/components/GoogleAnalytics.astro` | **Defines `window.__e2eLoadGA` only.** Injects no Google script. ID read from env and regex-validated (`src/lib/analytics.ts`). |
| `src/components/CookieBanner.astro` | Consent UI. Ships `hidden`; JS reveals it only when no stored decision. Sole caller of `__e2eLoadGA`. |
| `src/lib/analytics.ts` | Shared `CONSENT_STORAGE_KEY` + `isValidMeasurementId`. Single source for both analytics components. |
| `src/components/ContactForm.tsx` | **Only React island** (`client:visible`). UI + simulated submit; no network call. |
| `Hero.astro` | Positioning + CTA. **Above-the-fold constraint at 320×568.** |
| `ServicesList.astro` | 5 services; `secondary` flag de-emphasises Team augmentation. |
| `Header.astro` / `Footer.astro` | Nav (About/Work intentionally 404) and contact placeholders. |
| `src/styles/global.css` | Tailwind 4 `@theme` tokens (`paper`/`ink`/`accent`). No `tailwind.config.js` — do not add one. |

## Data & persistence

- **No database and no migrations.** Nothing to migrate.
- Only client-side state: `localStorage["e2e_analytics_consent"]` ∈
  `{granted, denied}`. Fail-open to "not measured" if storage is blocked.
- Contact form collects name/email/message in component state and discards on
  submit. **No message ever leaves the browser.**

## Key user flows

1. **Land on Home** → hero + CTA above the fold → `#services` → `#contact`.
2. **Consent** → banner appears → Accept stores `granted` + injects GA4;
   Reject stores `denied` + never contacts Google. Later visits skip the banner.
3. **Unknown URL** → nginx 404 (real status) → friendly 404 page → Home.
4. **Submit form** → simulated "sent" state. No submission. **Flow incomplete.**

## Gotchas that will bite

- **Certbot never issues the real cert** (`nginx/entrypoint.sh:25` creates
  `/etc/letsencrypt/live/$DOMAIN`, then `docker-compose.prod.yml:59` tests
  `[ ! -d ... ]`, so `certonly` is always skipped). TLS mode serves a 1-day
  self-signed cert forever. Fix the condition before any real TLS deploy.
- **Proxy 502s after `web` is recreated**: no `resolver` in the proxy configs,
  so `proxy_pass http://web:80` resolves once at config load; the 6h reload
  loop exists only in the TLS branch.
- nginx `add_header` inside a `location` **replaces all** inherited
  server-level `add_header`s — use `expires` for per-location caching or the
  security headers vanish.
- Missing asset under `/_astro/` returns the HTML 404 page (content-type
  mismatch) because `error_page` applies to all 404s.
- `pnpm dev` **returns immediately** (background daemon). Manage with
  `npx astro dev status|logs|stop`.
- pnpm build-script allowlist lives in `pnpm-workspace.yaml` (`allowBuilds`),
  not `package.json`; `typescript` is pinned `^6` because `@astrojs/check`
  rejects v7.
- `define:vars` on `<script>` implies `is:inline` → the two analytics snippets
  are neither bundled nor type-checked.
- `/privacy-policy` prose hardcodes the `e2e_analytics_consent` key; renaming
  the constant silently desyncs the legal text.
- `[PLACEHOLDER: ...]` markers are intentional deliverables — grep before
  "cleaning up".

## Verified state (2026-10-04)

`pnpm check` clean · `pnpm build` 3 pages · Docker stack serves :80, 404 works
with real status · 23/23 headless-Chrome checks incl. "GA4 makes zero network
requests before consent" · hero CTA above fold at 320×568 / 375×667 / 390×844 /
1440×900.

Known: `pnpm audit` reports 1 high (`http-cache-semantics` ≤4.2.0 via astro,
dev-server only, **absent from `dist/`**). No sitemap, no JSON-LD, no CSP.
React runtime costs ~70 KB gzip, deferred until the form scrolls into view.
