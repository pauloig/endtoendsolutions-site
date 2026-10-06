# syntax=docker/dockerfile:1

# ---- Stage 1: static build with Astro -------------------------------------
FROM node:24-alpine AS build

WORKDIR /app

RUN npm install -g pnpm@12.4.2

# Manifests first: the dependency layer is cached between builds as long as
# the lockfile does not change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile \
    --config.network-concurrency=1 \
    --config.fetch-retries=5 \
    --config.fetch-timeout=300000

COPY astro.config.mjs tsconfig.json ./
COPY src ./src
COPY public ./public

# Astro inlines PUBLIC_* variables into the bundle at build time, so the GA4
# Measurement ID has to be passed as a build ARG (not at runtime).
ARG PUBLIC_GA_MEASUREMENT_ID=""
ENV PUBLIC_GA_MEASUREMENT_ID=$PUBLIC_GA_MEASUREMENT_ID

RUN pnpm build

# ---- Stage 2: serve the static files with nginx ----------------------------
FROM nginx:alpine AS app

COPY nginx/nginx.app.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1