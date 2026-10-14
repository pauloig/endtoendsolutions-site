# End to End Solutions

Personal marketing site for **End to End Solutions**: a freelance/consulting
practice positioned as *a senior technical partner who can embed as a
developer, lead architecture decisions, or scale into a small team when the
project needs it.*

> **Status: scaffold.** Every piece of copy marked `[PLACEHOLDER: ...]` still
> needs real content. Only the Home
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
│       └── global.css      # theme tokens, fonts, Tailwind
├── Dockerfile
├── docker-compose.prod.yml
└── astro.config.mjs
```

## Local development

Requires Node `>=22.12` and pnpm.

```sh
pnpm install
cp .env.example .env   # opcional: define PUBLIC_GA_MEASUREMENT_ID y/o PUBLIC_WEB3FORMS_ACCESS_KEY
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

## Design tokens and theming

Styling is CSS-first Tailwind 4: all tokens live in `@theme` inside
`src/styles/global.css`. **There is no `tailwind.config.js` — do not add one.**

- **Semantic tokens** (`paper`, `surface`, `ink`, `muted`, `line`, `accent`)
  resolve per theme. Light is the default; `:root[data-theme="dark"]` overrides
  them, and `@media (prefers-color-scheme: dark)` applies them when no explicit
  choice is stored.
- **Brand tokens** (`brand-violet` `#8127fb`, `brand-cyan` `#41c6ed`,
  `brand-blue` `#2a80bb`, plus `brand-violet-ink` for hover) are identical in
  both themes. Buttons use `bg-brand-violet` with white text — never `accent`,
  which flips to cyan in dark.
- **Wordmark** colors come from `wordmark-primary` / `wordmark-secondary` and
  are overridden per theme.
- **Gradient** `--brand-gradient` (cyan → violet at 135°, exposed as
  `bg-brand-gradient`) is reserved for the logo mark and the thin hero accent.

Fonts are self-hosted through `@fontsource-variable/sora` (headings, 500/700)
and `@fontsource-variable/inter` (body, 400/600), Latin subset only, with
`font-display: swap`. The two `.woff2` files are preloaded in `BaseLayout.astro`.
No request goes to Google Fonts or any CDN.

The theme toggle in `Header.astro` sets `data-theme` on `<html>` and persists
the choice in `localStorage["e2e_theme"]` (`"light"` | `"dark"`). A tiny inline
script in the `BaseLayout.astro` `<head>` applies the stored value before first
paint, so there is no flash. With no stored value, the OS preference wins.

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
- `PUBLIC_GA_MEASUREMENT_ID` and `PUBLIC_WEB3FORMS_ACCESS_KEY` are passed as
  **build args**, so changing them requires `--build`.
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
- About exists in both locales (`/about`, `/es/about`). Work is hidden until
  the page exists.
- Legal review of `privacy-policy.astro`.