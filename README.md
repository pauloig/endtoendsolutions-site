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

### HTTP (default — how the acceptance check runs)

```sh
docker compose -f docker-compose.prod.yml up --build
```

Serves the site on <http://localhost>.

### HTTPS (production)

Requires the domain to resolve to the host and port 80 reachable from the
internet.

```sh
TLS_ENABLED=1 SERVER_NAME=endtoendsolutions.dev \
  docker compose -f docker-compose.prod.yml --profile tls up --build -d
```

With `TLS_ENABLED=1` the proxy redirects port 80 to HTTPS, bootstraps a
temporary self-signed certificate so nginx can boot, and the `certbot` service
(only started by the `tls` profile) issues and renews the real certificate via
the ACME `http-01` challenge. The proxy entrypoint reloads nginx every 6h to
pick up renewals.

Useful overrides (see `.env.example`): `HTTP_PORT`, `HTTPS_PORT`,
`SERVER_NAME`, `LETSENCRYPT_EMAIL`.

Notes:

- No database: the site is fully static.
- `PUBLIC_GA_MEASUREMENT_ID` is passed as a **build arg**, so changing it
  requires `--build`.
- The app container serves `dist/404.html` with a real `404` status; the proxy
  does not intercept upstream errors (`proxy_intercept_errors off`).

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