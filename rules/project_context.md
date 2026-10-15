# Project context — End to End Solutions marketing site

Static marketing site. Astro 7 static output, Tailwind 4, one React island,
nginx-served via Docker. **No backend, no database.** EN at `/`, ES at `/es/`
(7 built pages: Home, About, 404, Privacy Policy in both locales). ~1.7k LOC of
source.

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
| `src/components/ContactForm.tsx` | **Only React island** (`client:visible`). Posts to Web3Forms; mailto fallback when the access key is missing at build time. |
| `Hero.astro` | Split hero (1.6fr/1fr): eyebrow + short h1 + positioning sentence as sub-line + primary CTA + "What I do" link, and a flow card (`<ol>` of 5 steps). **Above-the-fold constraint at 320×568 / 375×667 / 390×844.** |
| `ServicesList.astro` | 5 services as hairline-bordered rows (via `ListRow`); `secondary` flag de-emphasises Team augmentation. No link affordances. |
| `Heading.astro` | Shared Sora heading: `as` (`h1`/`h2`/`h3`), `size` (`display`/`heading`/`subheading`), `tone` (`ink`/`white`). Used on every page. |
| `ListRow.astro` | Hairline row (`title` + slot description, optional `secondary`, `innerClass`). Used by the Home service list and About "How I work". |
| `GradientBand.astro` | The only gradient surface (`bg-brand-gradient-band`). `form` variant = copy + surface card slot, owns `#contact`; `cta` variant = copy + one link. |
| `ContactBand.astro` | Home gradient band: thin wrapper around `GradientBand` (`form` variant) holding the contact copy in EN/ES and the `#contact` anchor; form lives in the slot. |
| `Header.astro` / `Footer.astro` | Nav: About exists in both locales, Work hidden until the page exists. Language switcher (path-preserving) + theme toggle. Wordmark text hidden below 360px so the nav fits at 320px. Footer holds contact details. |
| `src/styles/global.css` | Tailwind 4 `@theme` tokens (`paper`/`surface`/`ink`/`muted`/`line`/`accent`/`danger` + fixed `brand-*`/`wordmark-*`), self-hosted `@font-face`, two gradient utilities (`bg-brand-gradient`, `bg-brand-gradient-band`), theme-toggle CSS. No `tailwind.config.js` — do not add one. |

## Data & persistence

- **No database and no migrations.** Nothing to migrate.
- Only client-side state: `localStorage["e2e_analytics_consent"]` ∈
  `{granted, denied}`. Fail-open to "not measured" if storage is blocked.
- `localStorage["e2e_theme"]` ∈ `{light, dark}` sets `data-theme` on `<html>`.
  Absent → OS `prefers-color-scheme` decides. Applied inline in `<head>` before
  first paint (no flash) and toggled in `Header.astro`.
- Contact form posts name/email/message to Web3Forms (hidden honeypot). With no
  access key at build time it renders a mailto fallback instead.

## Key user flows

1. **Land on Home** → split hero, primary CTA above the fold → `#services`
   (hairline-bordered rows) → `#contact` (gradient band with the form).
2. **Consent** → banner appears → Accept stores `granted` + injects GA4;
   Reject stores `denied` + never contacts Google. Later visits skip the banner.
3. **Unknown URL** → nginx 404 (real status) → friendly 404 page → Home.
4. **Submit form** → posts to Web3Forms and shows a sent state. With no access
   key at build time, the form offers a mailto fallback instead.

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
- **Buttons must stay `bg-brand-violet` with white text.** `bg-accent` flips to
  cyan in dark and puts white on cyan, failing contrast. The one exception is
  the `GradientBand` `cta` link (white on the violet band; a violet button would
  disappear into the gradient).
- **Page background is the `paper` token everywhere; only cards and form
  surfaces use `surface`.** Header, footer and every section sit on `paper`; the
  flow card and the contact form card are the raised surfaces.
- Gradient rule: only the logo mark, the thin hero accent (`bg-brand-gradient`)
  and the band (`bg-brand-gradient-band`, cyan-free) rendered by `GradientBand`
  are gradients. Do not add other gradient surfaces.
- Error text uses `text-danger` (theme-aware `#dc2626` light / `#f87171` dark);
  plain `text-red-600` fails AA on the dark surface.
- Fonts are self-hosted and preloaded in `BaseLayout.astro`; do not reintroduce
  a Google Fonts / CDN `<link>`.
- The no-flash theme script (`BaseLayout.astro`, `is:inline`) and the toggle
  (`Header.astro`) share `localStorage["e2e_theme"]`; change the key in both.
- `[PLACEHOLDER: ...]` markers are intentional deliverables — grep before
  "cleaning up".

## Verified state (2026-10-15)

`pnpm check` clean · `pnpm build` 7 pages · Docker stack serves :80, 404 works
with real status · "GA4 makes zero network requests before consent" · hero CTA
above fold at 320×568 / 375×667 / 390×844 with zero horizontal overflow
(`scrollWidth == clientWidth`) at all three. Hero h1 stays at two lines from
1024px up and three at 320px in both locales.

Design-system pass: Home/About/404/privacy share `Container` + `Heading`;
Home services and About "How I work" share `ListRow`; Home contact and About
closing CTA share `GradientBand` (`form`/`cta`). Page background is `paper` on
every page (body, header, hero, footer); the flow card, form card and cookie
banner are the only `surface` areas. Long-form reading column is
`max-w-[65ch]`; all pages use `py-14 sm:py-16`. Zero horizontal overflow at
320px on every page in both locales.

Theme (checked via computed styles): `data-theme` toggles + persists in
`localStorage["e2e_theme"]`, no flash (inline `<head>` script), wordmark and CTA
colors correct in both themes, only self-hosted fonts requested (no Google
Fonts), all text/background pairs meet WCAG AA (buttons = white on
`#8127fb` = 5.81:1; band text = white on `#5926ab`→`#8127fb` ≥ 5.81:1).

Known: `pnpm audit` reports 1 high (`http-cache-semantics` ≤4.2.0 via astro,
dev-server only, **absent from `dist/`**). No sitemap, no JSON-LD, no CSP.
React runtime costs ~70 KB gzip, deferred until the form scrolls into view.
