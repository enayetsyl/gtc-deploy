###############################################
# Production Dockerfile for @gtc/api
# - Multi-stage for smaller runtime image
# - Compiles TypeScript ahead of time
# - Runs prisma migrate deploy on startup
# - Uploads disabled by default via feature flag
###############################################

# ---- deps stage ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json ./
# Use npm ci when lockfile is present (monorepo root lock not copied here); fallback to install
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client before building TS for type safety
RUN npx prisma generate
RUN npm run build

# ---- prune prod deps ----
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
	UPLOADS_ENABLED=false
# Install runtime dependencies required by Prisma query engine (OpenSSL 1.1) and some native modules
RUN apk add --no-cache openssl libc6-compat
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

# Expose the internal port your app listens on (Render will set PORT env)
EXPOSE 4000

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
