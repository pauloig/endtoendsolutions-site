# AGENTS.md

Personal marketing site for **End to End Solutions**. Astro 7 static output,
Tailwind 4, one React island, nginx-served. Currently a scaffold: most copy is
marked `[PLACEHOLDER: ...]`, and `About`/`Work` pages do not exist.

`CLAUDE.md` is a symlink to this file — edit this one.

## Commands

| Command | Notes |
| :-- | :-- |
| `pnpm dev` | **Returns immediately** — Astro 7 runs a background daemon. It is not a blocking process; don't wrap it in `&`/`nohup` or wait for a port banner. |
| `npx astro dev status` / `logs` / `stop` | Manage that daemon. If `pnpm dev` says "already running", check status instead of restarting. |
| `pnpm check` | `astro check` (Astro + TS diagnostics). Run before committing; CI does not exist. |
| `pnpm build` | Static output to `dist/`. |
| `pnpm preview` | Serves `dist/` (has no 404 route handling like nginx does). |

Verification loop, since there is no test suite:
`pnpm check` → `pnpm build` → `HTTP_PORT=8080 docker compose -f docker-compose.prod.yml up --build`.
Use `HTTP_PORT`/`HTTPS_PORT` to avoid privileged/conflicting ports locally.
There is no CI and no pre-commit config in this repo.

## Pins that fail loudly if changed

- **pnpm build-script allowlist lives in `pnpm-workspace.yaml` under
  `allowBuilds`**, not in `package.json`. pnpm 12 ignores both the `pnpm` field
  and the `allowScripts` key that the Astro scaffolder writes; `pnpm install`
  then dies with `ERR_PNPM_IGNORED_BUILDS`. Needs `esbuild` and `sharp`.
- **`typescript` is pinned `^6`.** `@astrojs/check` peers on `^5 || ^6`;
  `typescript@latest` resolves to v7 and fails `pnpm peers check`.
- Node `>=22.12` (see `engines`); Docker build stage is `node:24-alpine`.

## Environment variables are build-time

Astro inlines `PUBLIC_*` into the bundle during `pnpm build`. Consequences:

- `PUBLIC_GA_MEASUREMENT_ID` and `PUBLIC_WEB3FORMS_ACCESS_KEY` are Docker
  **build ARGs** (`docker-compose.prod.yml` → `build.args`), not runtime env
  vars. Changing them requires `--build`.
- `site` in `astro.config.mjs` drives canonical URLs and absolute `og:image`
  URLs. Change it when deploying to another domain, otherwise social cards
  point at the wrong host.

## Analytics must stay consent-gated

`src/components/GoogleAnalytics.astro` **only defines** `window.__e2eLoadGA`
(typed in `src/env.d.ts`); it injects nothing. `CookieBanner.astro` is the sole
caller. Do not add a `<script src="googletagmanager...">` tag to any layout, and
do not call `__e2eLoadGA` outside the banner — GA firing before consent is the
one bug that must not ship.

- Both components share `CONSENT_STORAGE_KEY` from `src/lib/analytics.ts`;
  change it there only.
- The banner ships `hidden` and JS reveals it, so it can't flash for returning
  visitors and stays hidden for no-JS users.
- `define:vars` on a `<script>` implies `is:inline`: those snippets are not
  bundled and are not type-checked.

## nginx / Docker

- This project only builds and runs its own `web` static container. It attaches
  to the external shared reverse proxy ("edge-proxy" repo) via the external
  `edge-net` Docker network with the service alias `e2e-web`. TLS, certificate
  issuance, domain routing, and the shared proxy are all handled externally.
- `.dockerignore` must **not** exclude `nginx/` — the final stage copies
  `nginx/nginx.app.conf` into the image.
- Real 404s come from `error_page 404 /404.html` + `location = /404.html
  { internal; }`.
- `try_files $uri $uri/index.html $uri.html =404` (not `$uri/`, which 301s).
- nginx `add_header` in a child `location` **replaces all** inherited
  server-level `add_header`s. Use `expires` for per-location caching, or the
  security headers silently disappear.

## Conventions worth knowing

- `[PLACEHOLDER: ...]` markers are intentional deliverables, not leftovers to
  clean up. `grep -rn "PLACEHOLDER" src public` lists what still needs content.
- Home is a split hero (left: eyebrow/h1/sub-copy/primary CTA + a "What I do"
  text link to `#services`; right: a flow card with an `<ol>` of five steps),
  then a service list of hairline-bordered rows (two columns at 1024px+), then a
  gradient contact band holding the form. EN at `/`, ES at `/es/`; components
  take a `locale` prop and hold their copy in a `content` dictionary. Below
  1024px the hero stacks with the card after the CTA.
- All top-level chrome (header, footer, every Home section) uses
  `src/components/Container.astro` — `max-w-[1360px]` with `px-6 md:px-10
  lg:px-14` (24/40/56px) — so their edges line up. Adjust widths there, not
  per-section. Long-form pages (About, privacy) keep a `max-w-3xl` reading
  column inside it, left-aligned to the container edge.
- The hero has a hard constraint: **the primary CTA must stay fully above the
  fold at 320×568, 375×667 and 390×844, in both locales**. The h1 is fluid
  (`clamp(1.625rem,1.36rem+1.35vw,2.5rem)`): its floor is 1.625rem rather than
  2rem because the longer Spanish headline pushed the CTA below the fold at
  320px, and its ceiling is 2.5rem to keep the headline within five lines at
  1440px/1920px. Verified by measuring `getBoundingClientRect()`; re-check if you
  lengthen the headline, sub-copy or CTA row.
- The header wordmark text is hidden below 360px (`hidden min-[360px]:inline`)
  so the nav fits at 320px without horizontal overflow; the logo mark remains.
- Gradient rule: the only gradients are the logo mark, the thin hero accent
  (`bg-brand-gradient`, cyan → violet) and the contact band
  (`bg-brand-gradient-band`, cyan-free `#5926ab` → `#8127fb`). Do not add other
  gradient surfaces.
- `ContactForm` is `client:visible`, posts to Web3Forms with honeypot; if the
  access key is missing at build time, it shows a mailto fallback. It does not
  hydrate until scrolled into view — browser tests must scroll to `#contact`
  first.
- Everything except the form is `.astro` with no framework JS. Keep it that way.
- `Header` links: About exists in both locales (`/about`, `/es/about`). Work is
  hidden until the page exists.
- `public/og-image.png` (1200×630) and `favicon.ico` are generated placeholders,
  not hand-drawn art; replace all three brand assets together.
- Styling tokens are CSS-first Tailwind v4 (`@theme` in `src/styles/global.css`);
  there is no `tailwind.config.js` and adding one would be wrong.
- Theme-aware tokens (`paper`/`surface`/`ink`/`muted`/`line`/`accent`) switch via
  `:root[data-theme="dark"]` and a `prefers-color-scheme` fallback. `brand-*`
  tokens are fixed in both themes; **buttons are always `bg-brand-violet` with
  white text** — using `bg-accent` puts white on cyan in dark and fails contrast.
- Fonts are self-hosted (`@fontsource-variable/sora` + `inter`, Latin subset) and
  the two `.woff2` are preloaded in `BaseLayout.astro`. Do not reintroduce a
  Google Fonts / CDN `<link>`.
- The no-flash theme script in `BaseLayout.astro` (`<head>`, `is:inline`) and the
  toggle in `Header.astro` share `localStorage["e2e_theme"]`; change the key in
  both places together.