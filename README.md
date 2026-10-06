# End to End Solutions

Personal marketing site for **End to End Solutions**: a freelance/consulting
practice positioned as *a senior technical partner who can embed as a
developer, lead architecture decisions, or scale into a small team when the
project needs it.*

> **Status: scaffold.** Every piece of copy marked `[PLACEHOLDER: ...]` still
> needs real content, and the contact form has no backend yet. Only the Home
> page exists.

## Stack

| Concern    | Choice                                        |
| :--------- | :-------------------------------------------- |
| Framework  | Astro 7 (static output)                       |
| Styling    | Tailwind CSS 4 (via `@tailwindcss/vite`)       |
| Islands    | React 19 (only the contact form)               |
| Language   | TypeScript (`astro/tsconfigs/strict`)         |
| Analytics  | Google Analytics 4, gated behind consent       |
| Serving    | nginx (multi-stage Docker build)               |

## Project structure

```text
.
├── nginx/                  # nginx configs (static app + proxy)
│   ├── nginx.app.conf      #   serves dist/ with 404.html support
│   ├── nginx.prod.conf     #   TLS proxy (@SERVER_NAME@ token)
│   ├── nginx.local.conf    #   proxy without TLS (default)
│   └── entrypoint.sh       #   picks the config and bootstraps the certificate
├── public/                 # favicon.svg, favicon.ico, robots.txt, og-image.png
├── src/
│   ├── components/
│   │   ├── ContactForm.tsx # isla de React (UI only)
│   │   ├── CookieBanner.astro
│   │   ├── Footer.astro
│   │   ├── GoogleAnalytics.astro
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   └── ServicesList.astro
│   ├── layouts/
│   │   └── BaseLayout.astro# per-page title/description + Open Graph
│   ├── lib/
│   │   └── analytics.ts    # consent key + measurement ID validation
│   ├── pages/
│   │   ├── 404.astro
│   │   ├── index.astro
│   │   └── privacy-policy.astro
│   └── styles/
│       └── global.css      # design tokens + Tailwind
├── Dockerfile
├── docker-compose.prod.yml
└── astro.config.mjs
```

## Local development

Requires Node `>=22.12` and pnpm.

```sh
pnpm install
cp .env.example .env   # opcional: define PUBLIC_GA_MEASUREMENT_ID
pnpm dev               # http://localhost:4321
```

Other commands:

| Command           | Action                                                |
| :---------------- | :---------------------------------------------------- |
| `pnpm build`      | Static build into `dist/`                             |
| `pnpm preview`    | Serve `dist/` locally before deploying                 |
| `pnpm astro check`| Type-check `.astro`/`.ts`/`.tsx` (needs `@astrojs/check`) |

## Analytics and cookie consent

GA4 never fires before consent:

1. `GoogleAnalytics.astro` only *defines* `window.__e2eLoadGA`; it does not
   inject any Google script.
2. `CookieBanner.astro` shows itself only when there is no stored decision.
   **Accept** stores `granted` and calls `window.__e2eLoadGA()`; **Reject**
   stores `denied` and nothing is requested from Google.
3. On later visits, `granted` loads GA4 on page load without asking again.

The decision lives in `localStorage` under `e2e_analytics_consent`.

The Measurement ID comes from `PUBLIC_GA_MEASUREMENT_ID`. Astro inlines
`PUBLIC_*` variables at **build** time, so changing it requires a rebuild. If
the variable is missing or malformed (`G-XXXXXXX`), the snippet stays inert and
the site keeps working.

## Docker

This project only builds and runs its own static container (`web`). It attaches
to the external shared reverse proxy (separate "edge-proxy" repository) via the
external Docker network `edge-net`, using the service alias `e2e-web`.

- **No TLS, no certbot, no domain-specific proxy config** live in this repo.
- TLS, certificate issuance, and domain routing are handled entirely by the
  external edge-proxy.
- The `web` container serves the static build from `dist/` (including a real 404
  page) and is exposed internally on port 80.

Local/dev usage (serves the site directly):

```sh
docker compose -f docker-compose.prod.yml up --build
```

Notes:

- No database: the site is fully static.
- `PUBLIC_GA_MEASUREMENT_ID` is passed as a **build arg**, so changing it
  requires `--build`.
- The app container serves `dist/404.html` with a real `404` status.

## Placeholders to replace

- Copy and positioning text in `Hero.astro`, `ServicesList.astro`,
  `index.astro`.
- Contact details in `Footer.astro` and `index.astro`
  (`hello@example.com`).
- `site` in `astro.config.mjs` — it drives canonical URLs and absolute
  `og:image` URLs.
- Logo (currently the text "End to End Solutions") in `Header.astro`, plus
  `public/favicon.svg`, `favicon.ico` and `og-image.png`.
- Contact form backend (`ContactForm.tsx` currently simulates a send).
- Real `About` and `Work` pages — the header links point at routes that do not
  exist yet and land on the 404 page.
- Legal review of `privacy-policy.astro`.