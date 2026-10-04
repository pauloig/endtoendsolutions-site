# syntax=docker/dockerfile:1

# ---- Stage 1: build estático con Astro -------------------------------------
FROM node:24-alpine AS build

WORKDIR /app

RUN npm install -g pnpm@12.4.2

# Primero los manifiestos: la capa de dependencias se cachea entre builds si el
# lockfile no cambia.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile \
    --config.network-concurrency=1 \
    --config.fetch-retries=5 \
    --config.fetch-timeout=300000

COPY astro.config.mjs tsconfig.json ./
COPY src ./src
COPY public ./public

# Astro incrusta las variables PUBLIC_* en el bundle durante el build, así que
# el Measurement ID de GA4 hay que pasarlo como ARG de build (no en runtime).
ARG PUBLIC_GA_MEASUREMENT_ID=""
ENV PUBLIC_GA_MEASUREMENT_ID=$PUBLIC_GA_MEASUREMENT_ID

RUN pnpm build

# ---- Stage 2: servir los estáticos con nginx ------------------------------
FROM nginx:alpine AS app

COPY nginx/nginx.app.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1