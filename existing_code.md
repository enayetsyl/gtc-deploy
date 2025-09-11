# c:/EForgeIT/gtc/.gitignore

```ignore
# gtc/.gitignore
node_modules
**/node_modules
.env
.env.*
apps/api/uploads

```

# c:/EForgeIT/gtc/docker-compose.yml

```dockercompose
services:
  mysql:
    image: mysql:8.0.37
    container_name: gtc-mysql
    environment:
      MYSQL_DATABASE: gtc_local
      MYSQL_USER: app
      MYSQL_PASSWORD: app_pw
      MYSQL_ROOT_PASSWORD: root_pw
    ports: ["3307:3306"]
    volumes: [mysql_data:/var/lib/mysql]
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -proot_pw || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 20

  redis:
    image: redis:7
    container_name: gtc-redis
    ports: ["6379:6379"]

  mailpit:
    image: axllent/mailpit:latest
    container_name: gtc-mailpit
    ports: ["1025:1025", "8025:8025"]

  api:
    build: ./apps/api
    container_name: gtc-api
    env_file: ./apps/api/.env.docker
    ports: ["4000:4000"]
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    depends_on:
      - mysql
      - redis

  web:
    build: ./apps/web
    container_name: gtc-web
    env_file: ./apps/web/.env.local
    ports: ["3000:3000"]
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    depends_on:
      - api

volumes:
  mysql_data:

```

# c:/EForgeIT/gtc/package.json

```json
{
  "name": "gtc",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "npm run dev -w @gtc/api & npm run dev -w @gtc/web",
    "build": "npm run build -w @gtc/api && npm run build -w @gtc/web",
    "start": "npm run start -w @gtc/api & npm run start -w @gtc/web"
  }
}
```

# c:/EForgeIT/gtc/apps/api/prisma/schema.prisma

```plaintext
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider          = "mysql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

model Ping {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())

  @@map("_Ping")
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  role         Role      @default(GTC_POINT)
  sectorId     String? // for SECTOR_OWNER
  gtcPointId   String? // for GTC_POINT
  sector       Sector?   @relation("SectorUsers", fields: [sectorId], references: [id])
  gtcPoint     GtcPoint? @relation("PointUsers", fields: [gtcPointId], references: [id])
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

enum Role {
  ADMIN
  SECTOR_OWNER
  GTC_POINT
  EXTERNAL
}

model Sector {
  id        String     @id @default(cuid())
  name      String     @unique
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  points    GtcPoint[]

  // Optional: sector owners (Users with sectorId referencing this)
  users User[] @relation("SectorUsers")
}

model GtcPoint {
  id        String            @id @default(cuid())
  name      String
  email     String            @unique
  sectorId  String
  sector    Sector            @relation(fields: [sectorId], references: [id])
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
  services  GtcPointService[]
  users     User[]            @relation("PointUsers")
}

model Service {
  id         String            @id @default(cuid())
  code       String            @unique
  name       String
  active     Boolean           @default(true)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
  pointLinks GtcPointService[]
}

model GtcPointService {
  id         String        @id @default(cuid())
  gtcPointId String
  serviceId  String
  status     ServiceStatus @default(ENABLED)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  gtcPoint GtcPoint @relation(fields: [gtcPointId], references: [id])
  service  Service  @relation(fields: [serviceId], references: [id])

  @@unique([gtcPointId, serviceId])
}

enum ServiceStatus {
  ENABLED
  DISABLED
  PENDING_REQUEST
}

```

# c:/EForgeIT/gtc/apps/api/prisma/seed.ts

```typescript
import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@gtc.local";
const PASS = process.env.SEED_ADMIN_PASSWORD || "admin123";

async function main() {
  // sanity row
  await prisma.ping.create({ data: {} });

  // admin user
  const hash = await argon2.hash(PASS);
  await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      email: EMAIL,
      passwordHash: hash,
      name: "Admin",
      role: Role.ADMIN,
    },
  });

  // sectors
  const training = await prisma.sector.upsert({
    where: { name: "Training" },
    update: {},
    create: { name: "Training" },
  });
  const university = await prisma.sector.upsert({
    where: { name: "University" },
    update: {},
    create: { name: "University" },
  });

  // gtc points
  const pointA = await prisma.gtcPoint.upsert({
    where: { email: "point.a@gtc.local" },
    update: {},
    create: {
      name: "GTC Point A",
      email: "point.a@gtc.local",
      sectorId: training.id,
    },
  });
  const pointB = await prisma.gtcPoint.upsert({
    where: { email: "point.b@gtc.local" },
    update: {},
    create: {
      name: "GTC Point B",
      email: "point.b@gtc.local",
      sectorId: university.id,
    },
  });

  // services
  const svcA = await prisma.service.upsert({
    where: { code: "DOC_SIGN" },
    update: {},
    create: { code: "DOC_SIGN", name: "Document Signing" },
  });
  const svcB = await prisma.service.upsert({
    where: { code: "LEAD_INTAKE" },
    update: {},
    create: { code: "LEAD_INTAKE", name: "Lead Intake" },
  });

  // link a couple services to point A
  await prisma.gtcPointService.upsert({
    where: {
      gtcPointId_serviceId: { gtcPointId: pointA.id, serviceId: svcA.id },
    },
    update: {},
    create: { gtcPointId: pointA.id, serviceId: svcA.id, status: "ENABLED" },
  });
  await prisma.gtcPointService.upsert({
    where: {
      gtcPointId_serviceId: { gtcPointId: pointA.id, serviceId: svcB.id },
    },
    update: { status: "DISABLED" },
    create: { gtcPointId: pointA.id, serviceId: svcB.id, status: "DISABLED" },
  });

  console.log("Seeded admin, sectors, points, services.");
}

main().finally(() => prisma.$disconnect());
```

# c:/EForgeIT/gtc/apps/api/src/config/env.ts

```typescript
// apps/api/src/config/env.ts
export const env = {
  port: Number(process.env.PORT || 4000),
  db: process.env.DATABASE_URL!,
  redis: process.env.REDIS_URL!,
};
```

# c:/EForgeIT/gtc/apps/api/src/lib/jwt.ts

```typescript
// src/lib/jwt.ts
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import { redis } from "./redis";
import { randomUUID } from "crypto";

const ACCESS_TTL: string = process.env.ACCESS_TOKEN_TTL ?? "15m";
const REFRESH_TTL_DAYS: number = Number(
  process.env.REFRESH_TOKEN_TTL_DAYS ?? 7
);

const JWT_SECRET: Secret =
  process.env.JWT_SECRET ?? "dev_supersecret_change_me";
const REFRESH_COOKIE = "rt";

type Role = "ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL";

export function signAccessToken(payload: {
  sub: string;
  email: string;
  role: Role;
}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TTL,
  } as SignOptions);
}

export async function signRefreshToken(userId: string) {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti }, JWT_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
  // store jti in redis with ttl
  const ttlSecs = REFRESH_TTL_DAYS * 24 * 60 * 60;
  await redis.set(`refresh:${jti}`, userId, "EX", ttlSecs);
  return { token, jti };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS in prod
    path: "/api/auth/refresh",
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth/refresh" });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as {
    sub: string;
    email: string;
    role: Role;
    iat: number;
    exp: number;
  };
}

export async function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET) as {
    sub: string;
    jti: string;
    iat: number;
    exp: number;
  };
  const exists = await redis.get(`refresh:${decoded.jti}`);
  if (!exists) throw new Error("refresh_revoked");
  return decoded;
}

export async function revokeRefreshToken(jti: string) {
  await redis.del(`refresh:${jti}`);
}
```

# c:/EForgeIT/gtc/apps/api/src/lib/prisma.ts

```typescript
// apps/api/src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
```

# c:/EForgeIT/gtc/apps/api/src/lib/redis.ts

```typescript
// apps/api/src/lib/redis.ts
import { Redis } from "ioredis";
export const redis = new Redis(process.env.REDIS_URL!);
```

# c:/EForgeIT/gtc/apps/api/src/middleware/auth.ts

```typescript
// src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr || !hdr.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  const token = hdr.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(
  ...roles: Array<"ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL">
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
```

# c:/EForgeIT/gtc/apps/api/src/middleware/error.ts

```typescript
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ error: "ValidationError", issues: err.issues });
  }
  return res.status(500).json({ error: "InternalServerError" });
}
```

# c:/EForgeIT/gtc/apps/api/src/queues/worker.ts

```typescript
// apps/api/src/queues/worker.ts
import { Worker } from "bullmq";
const connection = { connection: { url: process.env.REDIS_URL! } };
new Worker(
  "emails",
  async (job) => {
    /* send email */
  },
  connection
);
```

# c:/EForgeIT/gtc/apps/api/src/routes/auth.ts

```typescript
// src/routes/auth.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import argon2 from "argon2";
import {
  clearRefreshCookie,
  revokeRefreshToken,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "ValidationError", issues: parsed.error.issues });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const access = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as any,
  });
  const { token: refresh } = await signRefreshToken(user.id);
  setRefreshCookie(res, refresh);

  res.json({
    accessToken: access,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

authRouter.post("/refresh", async (req, res) => {
  const rt = req.cookies?.rt as string | undefined;
  if (!rt) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const decoded = await verifyRefreshToken(rt);
    // rotate refresh token: revoke old, issue new
    await revokeRefreshToken(decoded.jti);
    const { token: newRefresh } = await signRefreshToken(decoded.sub);
    setRefreshCookie(res, newRefresh);

    // fetch user (role/email may have changed)
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ error: "User not found" });

    const access = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as any,
    });
    return res.json({ accessToken: access });
  } catch (e) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

authRouter.post("/logout", async (req, res) => {
  const rt = req.cookies?.rt as string | undefined;
  if (rt) {
    try {
      const decoded = await verifyRefreshToken(rt);
      await revokeRefreshToken(decoded.jti);
    } catch {
      // ignore
    }
  }
  clearRefreshCookie(res);
  return res.json({ ok: true });
});
```

# c:/EForgeIT/gtc/apps/api/src/routes/health.ts

```typescript
// apps/api/src/routes/health.ts
import { Router } from "express";
export const router = Router();
router.get("/", (_req, res) => res.json({ ok: true }));
```

# c:/EForgeIT/gtc/apps/api/src/routes/me.ts

```typescript
// src/routes/me.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!me) return res.status(404).json({ error: "Not found" });
  return res.json(me);
});
```

# c:/EForgeIT/gtc/apps/api/src/sockets/index.ts

```typescript
// apps/api/src/sockets/index.ts
import type { Server } from "socket.io";
export function initSockets(io: Server) {
  io.on("connection", (socket) => {
    socket.emit("hello", { message: "connected" });
  });
}
```

# c:/EForgeIT/gtc/apps/api/src/types/express.d.ts

```typescript
// src/types/express.d.ts
import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: "ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL";
    };
  }
}
```

# c:/EForgeIT/gtc/apps/api/src/index.ts

```typescript
// apps/api/src/index.ts
import { createServer } from "http";
import { Server } from "socket.io";
import { initSockets } from "./sockets";
import { app } from "./server";

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
initSockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
```

# c:/EForgeIT/gtc/apps/api/src/server.ts

```typescript
// apps/api/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { errorHandler } from "./middleware/error";
import { router as healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { adminSectors } from "./routes/admin.sectors";
import { adminPoints } from "./routes/admin.points";
import { adminServices } from "./routes/admin.services";

export const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/admin/sectors", adminSectors);
app.use("/api/admin/points", adminPoints);
app.use("/api/admin/services", adminServices);

app.use(errorHandler);
```

# c:/EForgeIT/gtc/apps/api/.dockerignore

```ignore
# apps/api/.dockerignore
node_modules
dist
npm-debug.log
uploads

```

# c:/EForgeIT/gtc/apps/api/.env

```properties
PORT=4000
DATABASE_URL="mysql://app:app_pw@127.0.0.1:3307/gtc_local"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET="dev_supersecret_change_me"
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_FROM="GTC <noreply@gtc.local>"
APP_BASE_URL="http://localhost:3000"
FILE_STORAGE_ROOT="./uploads"
QUEUE_CONCURRENCY=8
SHADOW_DATABASE_URL="mysql://root:root_pw@127.0.0.1:3307/gtc_shadow"

```

# c:/EForgeIT/gtc/apps/api/.env.docker

```bash
# apps/api/.env.docker  (container dev)
PORT=4000
DATABASE_URL="mysql://app:app_pw@mysql:3306/gtc_local"
REDIS_URL="redis://redis:6379"
JWT_SECRET="dev_supersecret_change_me"
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_FROM="GTC <noreply@gtc.local>"
APP_BASE_URL="http://localhost:3000"
FILE_STORAGE_ROOT="./uploads"
QUEUE_CONCURRENCY=8
SHADOW_DATABASE_URL="mysql://root:root_pw@127.0.0.1:3307/gtc_shadow"


```

# c:/EForgeIT/gtc/apps/api/Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

```

# c:/EForgeIT/gtc/apps/api/package.json

```json
{
  "name": "@gtc/api",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "migrate": "prisma migrate dev",
    "seed": "ts-node prisma/seed.ts",
    "worker": "tsx watch src/queues/worker.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "argon2": "^0.44.0",
    "bullmq": "^5.58.5",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^4.21.2",
    "ioredis": "^5.7.0",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.8.1",
    "uuid": "^13.0.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/argon2": "^0.14.1",
    "@types/cookie-parser": "^1.4.9",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.23",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20.19.13",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "tsx": "^4.20.5",
    "typescript": "^5.9.2"
  }
}
```

# c:/EForgeIT/gtc/apps/api/tsconfig.json

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src", "prisma"]
}
```

# c:/EForgeIT/gtc/apps/web/.dockerignore

```ignore
# apps/web/.dockerignore
node_modules
.next
npm-debug.log

```

# c:/EForgeIT/gtc/apps/web/.env.local

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

```

# c:/EForgeIT/gtc/apps/web/.gitignore

```ignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

```

# c:/EForgeIT/gtc/apps/web/components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {}
}
```

# c:/EForgeIT/gtc/apps/web/Dockerfile

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

```

# c:/EForgeIT/gtc/apps/web/eslint.config.mjs

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
```

# c:/EForgeIT/gtc/apps/web/next-env.d.ts

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference path="./.next/types/routes.d.ts" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

# c:/EForgeIT/gtc/apps/web/next.config.ts

```typescript
// apps/web/next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
```

# c:/EForgeIT/gtc/apps/web/package.json

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.3",
    "@tanstack/react-query": "^5.87.4",
    "axios": "^1.11.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.543.0",
    "next": "15.5.2",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "socket.io-client": "^4.8.1",
    "tailwind-merge": "^3.3.1",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20.19.13",
    "@types/react": "^19.1.12",
    "@types/react-dom": "^19.1.9",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.35.0",
    "eslint-config-next": "^15.5.2",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.13",
    "tw-animate-css": "^1.3.8",
    "typescript": "^5.9.2"
  }
}
```

# c:/EForgeIT/gtc/apps/web/tsconfig.json

```jsonc
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

# c:/EForgeIT/gtc/apps/web/postcss.config.mjs

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

# c:/EForgeIT/gtc/apps/web/src/app/globals.css

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

# c:/EForgeIT/gtc/apps/web/src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GTC",
  description: "Network GTC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

# c:/EForgeIT/gtc/apps/web/src/app/page.tsx

```tsx
// apps/web/src/app/page.tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">GTC Web</h1>
    </main>
  );
}
```

# c:/EForgeIT/gtc/apps/web/src/app/(auth)/login/page.tsx

```tsx
"use client";

import { useState } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth, User } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    root?: string;
  }>({});

  const loginResponseSchema = z.object({
    accessToken: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
    }),
  });

  const mutate = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await api.post("/api/auth/login", payload);
      const parsed = loginResponseSchema.parse(res.data);
      // map API shape to client shape expected by login()
      return { token: parsed.accessToken, user: parsed.user as User };
    },
    onSuccess: (data) => {
      login(data);
      router.replace("/dashboard");
    },
    onError: (e: unknown) => {
      const getErrMsg = (err: unknown): string => {
        if (typeof err === "object" && err !== null) {
          const maybe = err as Record<string, unknown>;
          const response = maybe.response as
            | Record<string, unknown>
            | undefined;
          const data = response?.data as Record<string, unknown> | undefined;
          const error = data?.error;
          if (typeof error === "string") return error;
        }
        return "Login failed";
      };
      setErrors((prev) => ({ ...prev, root: getErrMsg(e) }));
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as "email" | "password";
        fieldErrs[k] = i.message;
      });
      setErrors(fieldErrs);
      return;
    }
    mutate.mutate(parsed.data);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-gray-500">
            Use your admin or point credentials.
          </p>
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-md border px-3 py-2"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            value={form.password}
            onChange={(e) =>
              setForm((s) => ({ ...s, password: e.target.value }))
            }
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password}</p>
          )}
        </div>

        {errors.root && (
          <div className="text-sm text-red-600">{errors.root}</div>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-black text-white py-2 font-medium disabled:opacity-60"
          disabled={mutate.isPending}
        >
          {mutate.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
```

# c:/EForgeIT/gtc/apps/web/src/app/(protected)/dashboard/page.tsx

```tsx
"use client";

import Protected from "@/components/protected";
import { useAuth } from "@/providers/auth-provider";

export default function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <Protected>
      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <button
            onClick={logout}
            className="rounded-md border px-3 py-1.5 hover:bg-gray-50"
          >
            Logout
          </button>
        </header>

        <section className="rounded-xl border p-6">
          <p className="text-lg">
            Welcome, <span className="font-semibold">{user?.name}</span>.
          </p>
          <p className="text-gray-600 mt-2">
            Your role: <span className="font-mono">{user?.role}</span>
          </p>
        </section>
      </main>
    </Protected>
  );
}
```

# c:/EForgeIT/gtc/apps/web/src/components/protected.tsx

```tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthed) router.replace("/login");
  }, [isAuthed, router]);

  if (!isAuthed) return null;
  return <>{children}</>;
}
```

# c:/EForgeIT/gtc/apps/web/src/lib/axios.ts

```typescript
// apps/web/src/lib/axios.ts
import axios from "axios";
export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 && onUnauthorized) onUnauthorized();
    return Promise.reject(err);
  }
);
```

# c:/EForgeIT/gtc/apps/web/src/lib/queryClient.ts

```typescript
// apps/web/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient();
```

# c:/EForgeIT/gtc/apps/web/src/lib/utils.ts

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

# c:/EForgeIT/gtc/apps/web/src/providers/auth-provider.tsx

```tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setOnUnauthorized } from "@/lib/axios";

export type Role = "ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL";
export type User = { id: string; name: string; email: string; role: Role };

type AuthState = {
  user: User | null;
  token: string | null;
};
type AuthCtx = {
  user: User | null;
  token: string | null;
  isAuthed: boolean;
  login: (data: { token: string; user: User }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

const STORAGE_KEY = "gtc_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ user, token }, setState] = useState<AuthState>({
    user: null,
    token: null,
  });

  // load from storage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AuthState = JSON.parse(raw);
        setState(parsed);
        if (parsed.token) {
          api.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
        }
      }
    } catch {}
  }, []);

  // global 401 handler
  useEffect(() => {
    setOnUnauthorized(() => logout);
  }, []);

  const login = (data: { token: string; user: User }) => {
    setState({ user: data.user, token: data.token });
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: data.user, token: data.token })
    );
  };

  const logout = () => {
    setState({ user: null, token: null });
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const value = useMemo<AuthCtx>(
    () => ({ user, token, isAuthed: Boolean(user && token), login, logout }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
```

# c:/EForgeIT/gtc/apps/web/src/providers/query-provider.tsx

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";

export default function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
          mutations: { retry: 0 },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

admin@gtc.local
admin123