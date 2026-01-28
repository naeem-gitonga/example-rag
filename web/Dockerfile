# Production Dockerfile
# Build context should be project root to access shared/

# Stage 1: Dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY web/package.json web/package-lock.json* ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY web/ .
COPY shared/ /shared/

ARG NEXT_PUBLIC_INGESTION_API_URL
ENV NEXT_PUBLIC_INGESTION_API_URL=${NEXT_PUBLIC_INGESTION_API_URL}

ARG NEXT_PUBLIC_QUERY_API_URL
ENV NEXT_PUBLIC_QUERY_API_URL=${NEXT_PUBLIC_QUERY_API_URL}

RUN npm run build

# Stage 3: Production runtime
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
