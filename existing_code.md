# .gitignore
```
# gtc/.gitignore
node_modules
**/node_modules
.env
.env.*
apps/api/uploads

```

# docker-compose.yml
```
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

# package.json
```
{
  "name": "gtc",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "dev": "npm run dev -w @gtc/api & npm run dev -w @gtc/web",
    "build": "npm run build -w @gtc/api && npm run build -w @gtc/web",
    "start": "npm run start -w @gtc/api & npm run start -w @gtc/web"
  },
  "packageManager": "pnpm@10.15.0+sha512.486ebc259d3e999a4e8691ce03b5cac4a71cbeca39372a9b762cb500cfdf0873e2cb16abe3d951b1ee2cf012503f027b98b6584e4df22524e0c7450d9ec7aa7b"
}

```

# apps/api/.dockerignore
```
# apps/api/.dockerignore
node_modules
dist
npm-debug.log
uploads

```

# apps/api/.env
```
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

# apps/api/.env.docker
```
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

# apps/api/Dockerfile
```
# apps/api/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

```

# apps/api/package.json
```
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
    "nodemailer": "^7.0.6",
    "socket.io": "^4.8.1",
    "uuid": "^13.0.0",
    "zod": "^3.25.76",
        "mime-types": "^2.1.35",
    "multer": "^1.4.5-lts.1",
    "pdf-lib": "^1.17.1",
    "sanitize-filename": "^1.6.3"
  },
  "devDependencies": {
    "@types/argon2": "^0.14.1",
    "@types/cookie-parser": "^1.4.9",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.23",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20.19.13",
    "@types/nodemailer": "^7.0.1",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "tsx": "^4.20.5",
    "typescript": "^5.9.2"
  }
}

```

# apps/api/tsconfig.json
```
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
  "include": [
    "src",
    "prisma"
  ]
}
```
# apps/api/prisma/schema.prisma
```
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
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String
  name          String
  role          Role           @default(GTC_POINT)
  sectorId      String? // for SECTOR_OWNER
  gtcPointId    String? // for GTC_POINT
  sector        Sector?        @relation("SectorUsers", fields: [sectorId], references: [id])
  gtcPoint      GtcPoint?      @relation("PointUsers", fields: [gtcPointId], references: [id])
  notifications Notification[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  uploadedConventionDocuments ConventionDocument[] @relation("UserUploadedConventionDocuments")
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
  users       User[]       @relation("SectorUsers")
  conventions Convention[]
}

model GtcPoint {
  id          String            @id @default(cuid())
  name        String
  email       String            @unique
  sectorId    String
  sector      Sector            @relation(fields: [sectorId], references: [id])
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  services    GtcPointService[]
  users       User[]            @relation("PointUsers")
  conventions Convention[]
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

enum NotificationType {
  LEAD_NEW
  CONVENTION_UPLOADED
  CONVENTION_STATUS
  SERVICE_REQUEST
  SERVICE_STATUS
  GENERIC
}

model Notification {
  id          String           @id @default(cuid())
  userId      String
  type        NotificationType @default(GENERIC)
  subject     String
  contentHtml String?
  read        Boolean          @default(false)
  createdAt   DateTime         @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, read, createdAt])
}

enum ConventionStatus {
  NEW
  UPLOADED
  APPROVED
  DECLINED
}

enum ConventionDocKind {
  PREFILL
  SIGNED
  OTHER
}

model Convention {
  id               String           @id @default(cuid())
  gtcPointId       String
  sectorId         String
  status           ConventionStatus @default(NEW)
  internalSalesRep String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  gtcPoint  GtcPoint             @relation(fields: [gtcPointId], references: [id])
  sector    Sector               @relation(fields: [sectorId], references: [id])
  documents ConventionDocument[]

  @@index([gtcPointId, status, createdAt])
}

model ConventionDocument {
  id           String            @id @default(cuid())
  conventionId String
  kind         ConventionDocKind @default(SIGNED)
  fileName     String
  path         String
  mime         String
  size         Int
  checksum     String
  uploadedById String?
  createdAt    DateTime          @default(now())

  convention Convention @relation(fields: [conventionId], references: [id])
  uploadedBy User?      @relation("UserUploadedConventionDocuments", fields: [uploadedById], references: [id])

  @@index([conventionId, createdAt])
}

```

# apps/api/prisma/seed.ts
```
import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@gtc.local";
const PASS  = process.env.SEED_ADMIN_PASSWORD || "admin123";

async function main() {
  // sanity row
  await prisma.ping.create({ data: {} });

  // admin user
  const hash = await argon2.hash(PASS);
  await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, passwordHash: hash, name: "Admin", role: Role.ADMIN },
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
    create: { name: "GTC Point A", email: "point.a@gtc.local", sectorId: training.id },
  });
  const pointB = await prisma.gtcPoint.upsert({
    where: { email: "point.b@gtc.local" },
    update: {},
    create: { name: "GTC Point B", email: "point.b@gtc.local", sectorId: university.id },
  });

  // GTC Point user for testing uploads
const pointUser = await prisma.user.upsert({
  where: { email: "user.pointa@gtc.local" },
  update: {},
  create: {
    email: "user.pointa@gtc.local",
    passwordHash: await argon2.hash("point123"),
    name: "Point A User",
    role: Role.GTC_POINT,
    gtcPointId: pointA.id,
  },
});
console.log("Seeded point user:", pointUser.email, "(pass: point123)");


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
    where: { gtcPointId_serviceId: { gtcPointId: pointA.id, serviceId: svcA.id } },
    update: {},
    create: { gtcPointId: pointA.id, serviceId: svcA.id, status: "ENABLED" },
  });
  await prisma.gtcPointService.upsert({
    where: { gtcPointId_serviceId: { gtcPointId: pointA.id, serviceId: svcB.id } },
    update: { status: "DISABLED" },
    create: { gtcPointId: pointA.id, serviceId: svcB.id, status: "DISABLED" },
  });

  console.log("Seeded admin, sectors, points, services.");
}

main().finally(() => prisma.$disconnect());

```

# apps/api/src/config/env.ts
```
// apps/api/src/config/env.ts
export const env = {
  port: Number(process.env.PORT || 4000),
  db: process.env.DATABASE_URL!,
  redis: process.env.REDIS_URL!,
};

```

# apps/api/src/lib/jwt.ts
```
// src/lib/jwt.ts
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import { redis } from "./redis";
import { randomUUID } from "crypto";

const ACCESS_TTL: string = process.env.ACCESS_TOKEN_TTL ?? "15m";
const REFRESH_TTL_DAYS: number = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "dev_supersecret_change_me";
const REFRESH_COOKIE = "rt";

type Role = "ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL";

export function signAccessToken(payload: { sub: string; email: string; role: Role }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL } as SignOptions);
}

export async function signRefreshToken(userId: string) {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti }, JWT_SECRET, { expiresIn: `${REFRESH_TTL_DAYS}d` });
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
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: Role; iat: number; exp: number };
}

export async function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; jti: string; iat: number; exp: number };
  const exists = await redis.get(`refresh:${decoded.jti}`);
  if (!exists) throw new Error("refresh_revoked");
  return decoded;
}

export async function revokeRefreshToken(jti: string) {
  await redis.del(`refresh:${jti}`);
}

```

# apps/api/src/lib/mailer.ts
```
import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "127.0.0.1",
  port: Number(process.env.MAIL_PORT || 1025),
  secure: false,
});


```
# apps/api/src/lib/prisma.ts
```
// apps/api/src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();


```
# apps/api/src/lib/redis.ts
```
// apps/api/src/lib/redis.ts
import { Redis } from "ioredis";
export const redis = new Redis(process.env.REDIS_URL!);

``` 

# apps/api/src/middlewares/auth.ts
```
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

export function requireRole(...roles: Array<"ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

```

# apps/api/src/middlewares/error.ts
```
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

export function requireRole(...roles: Array<"ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
```

# apps/api/src/queues/email.ts
```
import { Queue } from "bullmq";

export type EmailJob = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

export const emailQueue = new Queue<EmailJob>("emails", {
  connection: { url: process.env.REDIS_URL! },
});

export async function enqueueEmail(data: EmailJob) {
  return emailQueue.add("send", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}

```
# apps/api/src/queues/worker.ts
```
import { Worker, Job } from "bullmq";
import { mailer } from "../lib/mailer";
import type { EmailJob } from "./email";

const worker = new Worker<EmailJob>(
  "emails",
  async (job: Job<EmailJob>) => {
    const { to, subject, html, text } = job.data;
    await mailer.sendMail({
      from: process.env.MAIL_FROM || "GTC <noreply@gtc.local>",
      to,
      subject,
      html,
      text: html ? undefined : text ?? " ",
    });
  },
  { connection: { url: process.env.REDIS_URL! } }
);

worker.on("completed", (job) => console.log("[email] sent", job.id));
worker.on("failed", (job, err) => console.error("[email] failed", job?.id, err));

```
# apps/api/src/routes/admin.conventions.ts
```
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { onConventionDecision } from "../services/conventions";
import path from "node:path";
import fs from "node:fs/promises";
import archiver from "archiver";
import sanitize from "sanitize-filename";

export const adminConventions = Router();
adminConventions.use(requireAuth, requireRole("ADMIN"));

// list (basic filters)
adminConventions.get("/", async (req, res) => {
  const status = (req.query.status as string | undefined)?.toUpperCase() as
    | "NEW"
    | "UPLOADED"
    | "APPROVED"
    | "DECLINED"
    | undefined;

  const where = status ? { status: status as any } : {};
  const items = await prisma.convention.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
    take: 200,
  });
  res.json({ items });
});

// decision (approve/decline, optional internalSalesRep)
const decisionSchema = z.object({
  action: z.enum(["APPROVE", "DECLINE"]),
  internalSalesRep: z.string().min(1).optional(),
});
adminConventions.patch("/:id", async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
  const body = decisionSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });

  const approved = body.data.action === "APPROVE";
  const conv = await prisma.convention.update({
    where: { id },
    data: {
      status: approved ? "APPROVED" : "DECLINED",
      internalSalesRep: body.data.internalSalesRep,
    },
  });

  await onConventionDecision(conv.id, approved, body.data.internalSalesRep);

  res.json(conv);
});


// GET /api/admin/conventions/:id/archive → zip all documents for a convention (admin-only)
adminConventions.get("/:id/archive", async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);

  // pull convention + docs (ordered newest first)
  const conv = await prisma.convention.findUnique({
    where: { id },
    include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!conv) return res.status(404).json({ error: "Convention not found" });

  // filename: convention-<id>-<point>-<sector>.zip (sanitized)
  const safePoint = sanitize(conv.gtcPoint?.name ?? "point");
  const safeSector = sanitize(conv.sector?.name ?? "sector");
  const zipName = `convention-${conv.id}-${safePoint}-${safeSector}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    // terminate stream on error
    res.status(500).end();
  });

  archive.pipe(res);

  // add each existing file by absolute path; name inside zip = timestamp_kind_filename
  for (const d of conv.documents) {
    const absPath = path.resolve("uploads", "." + d.path); // mirrors your single-file download path
    try {
      await fs.access(absPath);
      const ts = new Date(d.createdAt).toISOString().replace(/[:T]/g, "-").slice(0, 19);
      const entryName = `${ts}_${d.kind}_${sanitize(d.fileName)}`;
      archive.file(absPath, { name: entryName });
    } catch {
      // skip missing file (keeps export resilient)
    }
  }

  // finalize stream
  void archive.finalize();
});

```
# apps/api/src/routes/admin.points.ts
```
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { onServiceStatusChanged } from "../services/services";

export const adminPoints = Router();
adminPoints.use(requireAuth, requireRole("ADMIN"));

adminPoints.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const [items, total] = await Promise.all([
    prisma.gtcPoint.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { sector: true },
    }),
    prisma.gtcPoint.count(),
  ]);
  res.json({ items, total, page, pageSize });
});

const createSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  sectorId: z.string().min(1),
});

adminPoints.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const point = await prisma.gtcPoint.create({ data: parsed.data });
  res.status(201).json(point);
});

const idParam = z.object({ id: z.string().min(1) });
const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  sectorId: z.string().min(1).optional(),
});

adminPoints.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const point = await prisma.gtcPoint.findUnique({ where: { id }, include: { sector: true, services: true } });
  if (!point) return res.status(404).json({ error: "Not found" });
  res.json(point);
});

adminPoints.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  const point = await prisma.gtcPoint.update({ where: { id }, data: body.data });
  res.json(point);
});

adminPoints.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const svcCount = await prisma.gtcPointService.count({ where: { gtcPointId: id } });
  if (svcCount > 0) return res.status(409).json({ error: "Point has service links; remove them first." });
  await prisma.gtcPoint.delete({ where: { id } });
  res.json({ ok: true });
});

// list services for a point (optional helper)
adminPoints.get("/:id/services", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const items = await prisma.gtcPointService.findMany({
    where: { gtcPointId: id },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items });
});

const svcActionSchema = z.object({ action: z.enum(["ENABLE", "DISABLE"]) });

/** PATCH /api/admin/points/:id/services/:serviceId  { action: "ENABLE"|"DISABLE" } */
adminPoints.patch("/:id/services/:serviceId", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const serviceId = z.string().min(1).parse(req.params.serviceId);
  const body = svcActionSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });

  const svc = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!svc) return res.status(404).json({ error: "Service not found" });

  const status = body.data.action === "ENABLE" ? "ENABLED" : "DISABLED";
  const link = await prisma.gtcPointService.upsert({
    where: { gtcPointId_serviceId: { gtcPointId: id, serviceId } },
    update: { status },
    create: { gtcPointId: id, serviceId, status },
  });

  await onServiceStatusChanged(id, serviceId, status as any);

  res.json(link);
});

```

# apps/api/src/routes/admin.sectors.ts
```
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminSectors = Router();
adminSectors.use(requireAuth, requireRole("ADMIN"));

// list with basic pagination
adminSectors.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const [items, total] = await Promise.all([
    prisma.sector.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.sector.count(),
  ]);
  res.json({ items, total, page, pageSize });
});

const createSchema = z.object({ name: z.string().min(2).max(100) });

adminSectors.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const sector = await prisma.sector.create({ data: parsed.data });
  res.status(201).json(sector);
});

const idParam = z.object({ id: z.string().min(1) });
const updateSchema = z.object({ name: z.string().min(2).max(100) });

adminSectors.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const sector = await prisma.sector.findUnique({ where: { id } });
  if (!sector) return res.status(404).json({ error: "Not found" });
  res.json(sector);
});

adminSectors.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  const sector = await prisma.sector.update({ where: { id }, data: body.data });
  res.json(sector);
});

adminSectors.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  // optional safety: prevent delete if points exist
  const count = await prisma.gtcPoint.count({ where: { sectorId: id } });
  if (count > 0) return res.status(409).json({ error: "Sector has points; move or delete them first." });
  await prisma.sector.delete({ where: { id } });
  res.json({ ok: true });
});

```

# apps/api/src/routes/admin.services.ts
```
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminServices = Router();
adminServices.use(requireAuth, requireRole("ADMIN"));

adminServices.get("/", async (req, res) => {
  const items = await prisma.service.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

const createSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(200),
  active: z.boolean().optional().default(true),
});

adminServices.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const service = await prisma.service.create({ data: parsed.data });
  res.status(201).json(service);
});

const idParam = z.object({ id: z.string().min(1) });
const updateSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/).optional(),
  name: z.string().min(2).max(200).optional(),
  active: z.boolean().optional(),
});

adminServices.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return res.status(404).json({ error: "Not found" });
  res.json(service);
});

adminServices.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  const service = await prisma.service.update({ where: { id }, data: body.data });
  res.json(service);
});

adminServices.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const links = await prisma.gtcPointService.count({ where: { serviceId: id } });
  if (links > 0) return res.status(409).json({ error: "Service is linked to points; unlink first." });
  await prisma.service.delete({ where: { id } });
  res.json({ ok: true });
});

```
# apps/api/src/routes/auth.ts
```
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
    return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const access = signAccessToken({ sub: user.id, email: user.email, role: user.role as any });
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

    const access = signAccessToken({ sub: user.id, email: user.email, role: user.role as any });
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
# apps/api/src/routes/conventions.ts
```
import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { storage } from "../storage/provider";
import { buildPrefillPdf } from "../utils/pdf";
import { onConventionUploaded } from "../services/conventions";
import { lookup as mimeLookup } from "mime-types";
import path from "node:path";
import fs from "node:fs/promises";

export const conventionsRouter = Router();
conventionsRouter.use(requireAuth);

// 4.1 Create a convention (GTC point or admin)
const createSchema = z.object({
  gtcPointId: z.string().uuid().optional(), // admin may specify; point users derive from profile
  sectorId: z.string().uuid().optional(),   // admin may specify
});
conventionsRouter.post("/", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });

  let { gtcPointId, sectorId } = parsed.data;

  // If GTC_POINT user, derive from their mapping
  if (req.user!.role === "GTC_POINT") {
    const me = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { gtcPoint: { include: { sector: true } } },
    });
    if (!me?.gtcPoint) return res.status(409).json({ error: "User is not attached to a GTC Point" });
    gtcPointId = me.gtcPoint.id;
    sectorId = me.gtcPoint.sectorId;
  } else {
    // admin path: both ids required
    if (!gtcPointId || !sectorId) return res.status(400).json({ error: "gtcPointId and sectorId are required for admin" });
  }

  const conv = await prisma.convention.create({
    data: { gtcPointId: gtcPointId!, sectorId: sectorId!, status: "NEW" as any },
  });
  res.status(201).json(conv);
});

// 4.2 Prefill PDF (no DB write) – return a flattened simple PDF
const prefillSchema = z.object({
  applicantName: z.string().min(1).optional(),
  pointName: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
});
conventionsRouter.post("/prefill", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const parsed = prefillSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });

  let pointName = parsed.data.pointName;
  if (!pointName && req.user!.role === "GTC_POINT") {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { gtcPoint: true } });
    pointName = me?.gtcPoint?.name || undefined;
  }

  const pdf = await buildPrefillPdf({ title: parsed.data.title, applicantName: parsed.data.applicantName, pointName });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="convention-prefill.pdf"`);
  res.send(pdf);
});

// 4.3 Upload signed convention file → stores file + creates ConventionDocument + update status + notify admins
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB

conventionsRouter.post("/:id/upload", requireRole("GTC_POINT", "ADMIN"), upload.single("file"), async (req, res) => {
  const id = req.params.id;
  const conv = await prisma.convention.findUnique({ where: { id }, include: { gtcPoint: true, sector: true } });
  if (!conv) return res.status(404).json({ error: "Convention not found" });

  // GTC point can only upload to its own convention
  if (req.user!.role === "GTC_POINT") {
    const belongs = await prisma.user.findFirst({
      where: { id: req.user!.id, gtcPointId: conv.gtcPointId },
      select: { id: true },
    });
    if (!belongs) return res.status(403).json({ error: "Forbidden" });
  }

  const file = req.file;
  if (!file) return res.status(400).json({ error: "file is required (multipart/form-data)" });

  if (conv.status === "APPROVED" || conv.status === "DECLINED") {
    return res.status(409).json({ error: "Convention is finalized; uploads are locked" });
  }

  const was = conv.status;

  // PDF magic bytes: %PDF
  const b = file.buffer;
  const isPdfMagic = b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  if (!isPdfMagic) return res.status(400).json({ error: "File does not look like a valid PDF" });

  const mime = file.mimetype || mimeLookup(file.originalname) || "application/octet-stream";
  if (!String(mime).startsWith("application/pdf")) {
    return res.status(400).json({ error: "Only PDF uploads are allowed" });
  }

  const stored = await storage.put({ buffer: file.buffer, mime: String(mime), originalName: file.originalname });

  const { doc, statusChanged } = await prisma.$transaction(async (tx) => {
    const created = await tx.conventionDocument.create({
      data: {
        conventionId: conv.id,
        kind: "SIGNED",
        fileName: stored.fileName,
        path: stored.path,
        mime: stored.mime,
        size: stored.size,
        checksum: stored.checksum,
        uploadedById: req.user!.id,
      },
    });

    let changed = false;
    if (was !== "UPLOADED") {
      await tx.convention.update({ where: { id: conv.id }, data: { status: "UPLOADED" } });
      changed = true;
    }
    return { doc: created, statusChanged: changed };
  });

  if (statusChanged) {
    await onConventionUploaded(conv.id);
  }

  res.status(201).json({ ok: true, document: doc, downloadUrl: `/uploads${stored.path}` });
});

// 4.4 List my conventions (point sees own, admin sees all)
conventionsRouter.get("/", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

  const where =
    req.user!.role === "ADMIN"
      ? {}
      : {
          gtcPoint: { users: { some: { id: req.user!.id } } },
        };

  const [items, total] = await Promise.all([
    prisma.convention.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.convention.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});


// list documents for a convention
conventionsRouter.get("/:id/documents", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const id = req.params.id;
  const docConv = await prisma.convention.findUnique({
    where: { id },
    include: { gtcPoint: { include: { users: { select: { id: true } } } }, documents: true },
  });
  if (!docConv) return res.status(404).json({ error: "Convention not found" });

  if (req.user!.role !== "ADMIN") {
    const allowed = docConv.gtcPoint.users.some(u => u.id === req.user!.id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
  }

  res.json({ items: docConv.documents });
});

// download a single document (auth-checked)
conventionsRouter.get("/:id/documents/:docId/download", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const { id, docId } = req.params;
  const doc = await prisma.conventionDocument.findUnique({
    where: { id: docId },
    include: { convention: { include: { gtcPoint: { include: { users: { select: { id: true } } } } } } },
  });
  if (!doc || doc.conventionId !== id) return res.status(404).json({ error: "Document not found" });

  if (req.user!.role !== "ADMIN") {
    const allowed = doc.convention.gtcPoint.users.some(u => u.id === req.user!.id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
  }

  const absPath = path.resolve("uploads", "." + doc.path); // same folder you already use
  try {
    await fs.access(absPath);
  } catch {
    return res.status(410).json({ error: "File missing from storage" });
  }

  res.setHeader("Content-Type", doc.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
  res.sendFile(absPath);
});
```

# apps/api/src/routes/dev.ts
```
import { Router } from "express";
import { notifyUser } from "../services/notifications";
import { requireAuth, requireRole } from "../middleware/auth";

export const devNotify = Router();
devNotify.use(requireAuth, requireRole("ADMIN"));

devNotify.post("/test", async (req, res) => {
  const userId = req.user!.id;
  const n = await notifyUser({
    userId,
    subject: "Test notification",
    contentHtml: "<p>Hello from Phase 3!</p>",
    type: "GENERIC",
  });
  res.json(n);
});

```

# apps/api/src/routes/health.ts
```
// apps/api/src/routes/health.ts
import { Router } from "express";
export const router = Router();
router.get("/", (_req, res) => res.json({ ok: true }));

```
# apps/api/src/routes/me.ts
```
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

# apps/api/src/routes/notifications.me.ts
```
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

export const meNotifications = Router();
meNotifications.use(requireAuth);

// cursor pagination
meNotifications.get("/", async (req, res) => {
  const take = Math.min(50, Math.max(1, Number(req.query.take ?? 20)));
  const cursor = (req.query.cursor as string | undefined) || undefined;

  const items = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > take;
  const sliced = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;

  res.json({ items: sliced, nextCursor });
});

meNotifications.get("/unread-count", async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  });
  res.json({ unread: count });
});

meNotifications.post("/:id/read", async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
  const notif = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  res.json(notif);
});

```

# apps/api/src/routes/point.services.ts
```
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { onServiceRequested } from "../services/services";

export const pointServices = Router();
pointServices.use(requireAuth, requireRole("GTC_POINT"));

async function myPointId(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.gtcPointId) {
    const err: any = new Error("User is not attached to a GTC Point");
    err.status = 409;
    throw err;
  }
  return u.gtcPointId;
}

/** GET /api/point/services → my point’s services (with Service details) */
pointServices.get("/", async (req, res) => {
  let pointId: string;
  try {
    pointId = await myPointId(req.user!.id);
  } catch (e: any) {
    return res.status(e.status ?? 500).json({ error: e.message ?? "Error" });
  }
  const items = await prisma.gtcPointService.findMany({
    where: { gtcPointId: pointId },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items });
});

/** POST /api/point/services/requests → set PENDING_REQUEST (by id or code) */
const requestSchema = z
  .object({
    serviceId: z.string().min(1).optional(),
    serviceCode: z.string().regex(/^[A-Z0-9_]+$/).optional(),
  })
  .refine((d) => d.serviceId || d.serviceCode, { message: "serviceId or serviceCode required" });

pointServices.post("/requests", async (req, res) => {
  let pointId: string;
  try {
    pointId = await myPointId(req.user!.id);
  } catch (e: any) {
    return res.status(e.status ?? 500).json({ error: e.message ?? "Error" });
  }

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });

  const svc = parsed.data.serviceId
    ? await prisma.service.findUnique({ where: { id: parsed.data.serviceId } })
    : await prisma.service.findUnique({ where: { code: parsed.data.serviceCode! } });
  if (!svc || !svc.active) return res.status(404).json({ error: "Service not found or inactive" });

  const existing = await prisma.gtcPointService.findUnique({
    where: { gtcPointId_serviceId: { gtcPointId: pointId, serviceId: svc.id } },
  });
  if (existing?.status === "ENABLED") {
    return res.status(409).json({ error: "Service already enabled for this point" });
  }

  const link = await prisma.gtcPointService.upsert({
    where: { gtcPointId_serviceId: { gtcPointId: pointId, serviceId: svc.id } },
    update: { status: "PENDING_REQUEST" },
    create: { gtcPointId: pointId, serviceId: svc.id, status: "PENDING_REQUEST" },
  });

  await onServiceRequested(pointId, svc.id);

  res.status(201).json(link);
});

```


# apps/api/src/services/conventions.ts
```
import { prisma } from "../lib/prisma";
import { notifyUser, notifyUsers } from "./notifications";

export async function getAdmins() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" as any }, select: { id: true, email: true } });
  return admins.map((a) => a.id);
}

export async function getPointUsers(gtcPointId: string) {
  const users = await prisma.user.findMany({ where: { gtcPointId }, select: { id: true } });
  return users.map((u) => u.id);
}

export async function onConventionUploaded(conventionId: string) {
  const c = await prisma.convention.findUnique({
    where: { id: conventionId },
    include: { gtcPoint: true, sector: true },
  });
  if (!c) return;

  const subject = `Convention uploaded: ${c.gtcPoint.name} (${c.sector.name})`;
  const html = `<p>A new signed convention was uploaded.</p>
<p><b>Point:</b> ${c.gtcPoint.name}<br/>
<b>Sector:</b> ${c.sector.name}<br/>
<b>Convention ID:</b> ${c.id}</p>`;

  const adminIds = await getAdmins();
  await notifyUsers(adminIds, {
    type: "CONVENTION_UPLOADED",
    subject,
    contentHtml: html,
  });
}

export async function onConventionDecision(conventionId: string, approved: boolean, internalSalesRep?: string) {
  const c = await prisma.convention.findUnique({
    where: { id: conventionId },
    include: { gtcPoint: true, sector: true },
  });
  if (!c) return;

  const subject = `Convention ${approved ? "APPROVED" : "DECLINED"}: ${c.gtcPoint.name}`;
  const html = `<p>Your convention has been <b>${approved ? "APPROVED" : "DECLINED"}</b>.</p>
<p><b>Convention ID:</b> ${c.id}${internalSalesRep ? `<br/><b>Internal Sales Rep:</b> ${internalSalesRep}` : ""}</p>`;

  const pointUsers = await getPointUsers(c.gtcPointId);
  await notifyUsers(pointUsers, {
    type: "CONVENTION_STATUS",
    subject,
    contentHtml: html,
  });
}

```

# apps/api/src/services/notifications.ts
```
import { prisma, } from "../lib/prisma";
import { emitToUser } from "../sockets/io";
import { enqueueEmail } from "../queues/email";

type NotifyInput = {
  userId: string;
  type?: "LEAD_NEW" | "CONVENTION_UPLOADED" | "CONVENTION_STATUS" | "SERVICE_REQUEST" | "SERVICE_STATUS" | "GENERIC";
  subject: string;
  contentHtml?: string;
  email?: { to?: string; subject?: string; html?: string; text?: string } | false; // false disables email
};

/**
 * Creates a Notification row, emits socket events, and optionally enqueues an email.
 * Returns the created Notification.
 */
export async function notifyUser(input: NotifyInput) {
  const notif = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: (input.type ?? "GENERIC") as any,
      subject: input.subject,
      contentHtml: input.contentHtml,
    },
  });

  // realtime: push to user room + badge update
  emitToUser(input.userId, "notify:new", notif);
  const unread = await prisma.notification.count({
    where: { userId: input.userId, read: false },
  });
  emitToUser(input.userId, "badge:update", { unread });

  // optional email
  if (input.email !== false) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true },
    });
    if (user?.email) {
      await enqueueEmail({
        to: input.email?.to ?? user.email,
        subject: input.email?.subject ?? input.subject,
        html: input.email?.html ?? input.contentHtml,
        text: input.email?.text,
      });
    }
  }

  return notif;
}

export async function notifyUsers(
  userIds: string[],
  data: Omit<NotifyInput, "userId">
) {
  return Promise.all(userIds.map((userId) => notifyUser({ ...data, userId })));
}

```

# apps/api/src/services/services.ts
```
import { prisma } from "../lib/prisma";
import { notifyUsers } from "./notifications";
import { getAdmins, getPointUsers } from "./conventions";

/** Point → request a service (notifies Admins) */
export async function onServiceRequested(gtcPointId: string, serviceId: string) {
  const [point, service] = await Promise.all([
    prisma.gtcPoint.findUnique({ where: { id: gtcPointId }, include: { sector: true } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);
  if (!point || !service) return;

  const subject = `Service request: ${service.name} from ${point.name}`;
  const html = `<p><b>Point:</b> ${point.name} / ${point.sector?.name ?? ""}<br/><b>Service:</b> ${service.name} (${service.code})</p>`;

  const admins = await getAdmins();
  await notifyUsers(admins, {
    type: "SERVICE_REQUEST",
    subject,
    contentHtml: html,
  });
}

/** Admin → enable/disable (notifies Point users) */
export async function onServiceStatusChanged(
  gtcPointId: string,
  serviceId: string,
  status: "ENABLED" | "DISABLED"
) {
  const [point, service] = await Promise.all([
    prisma.gtcPoint.findUnique({ where: { id: gtcPointId }, include: { sector: true } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);
  if (!point || !service) return;

  const subject = `Service ${status === "ENABLED" ? "enabled" : "disabled"}: ${service.name}`;
  const html = `<p>Your service <b>${service.name}</b> has been <b>${status}</b>.</p>`;

  const users = await getPointUsers(gtcPointId);
  await notifyUsers(users, {
    type: "SERVICE_STATUS",
    subject,
    contentHtml: html,
  });
}

```


# apps/api/src/socket/index.ts
```
import type { Server } from "socket.io";
import { verifyAccessToken } from "../lib/jwt";

export function initSockets(io: Server) {
  // JWT auth via handshake
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth as any)?.token ||
      (socket.handshake.query?.token as string | undefined);
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      (socket.data as any).userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as any).userId as string;
    socket.join(`user:${userId}`);
    socket.emit("hello", { message: "connected" });
  });
}

```

# apps/api/src/socket/io.ts
```
import type { Server } from "socket.io";
let ioRef: Server | null = null;

export function setIO(io: Server) {
  ioRef = io;
}
export function getIO(): Server {
  if (!ioRef) throw new Error("Socket.io not initialized");
  return ioRef;
}

export function emitToUser(userId: string, event: string, payload: any) {
  getIO().to(`user:${userId}`).emit(event, payload);
}

```
# apps/api/src/storage/provider.ts
```
import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import sanitize from "sanitize-filename";

const ROOT = process.env.FILE_STORAGE_ROOT || "./uploads";

export type StoredFile = {
  fileName: string;  // the final stored file name (uuid-original)
  path: string;      // relative path under uploads, e.g. /2025/09/uuid-name.pdf
  mime: string;
  size: number;
  checksum: string;  // sha256
};

export interface IStorage {
  put(opts: { buffer: Buffer; mime: string; originalName: string }): Promise<StoredFile>;
  remove(relPath: string): Promise<void>;
}

export class LocalStorage implements IStorage {
  async put({ buffer, mime, originalName }: { buffer: Buffer; mime: string; originalName: string }): Promise<StoredFile> {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const safeName = sanitize(originalName) || "file";
    const fileName = `${randomUUID()}-${safeName}`;
    const relDir = path.posix.join("/", year, month);
    const relPath = path.posix.join(relDir, fileName);

    const absDir = path.resolve(ROOT, "." + relDir);
    const absPath = path.resolve(ROOT, "." + relPath);

    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(absPath, buffer);

    const checksum = createHash("sha256").update(buffer).digest("hex");

    return { fileName, path: relPath, mime, size: buffer.length, checksum };
  }

  async remove(relPath: string) {
    const abs = path.resolve(ROOT, "." + relPath);
    await fs.rm(abs, { force: true });
  }
}

export const storage: IStorage = new LocalStorage();

```

# apps/api/src/types/express.d.ts
```
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
//
# apps/api/src/utils/pdf.ts
```
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildPrefillPdf(fields: {
  title?: string;           // e.g. "GTC Convention"
  applicantName?: string;   // optional
  pointName?: string;       // optional
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const title = fields.title ?? "GTC Convention";
  page.drawText(title, { x: 50, y: 780, size: 22, font, color: rgb(0, 0, 0) });

  let y = 740;
  const drawLine = (label: string, value?: string) => {
    page.drawText(label, { x: 50, y, size: 12, font });
    page.drawText(value ?? "", { x: 200, y, size: 12, font });
    y -= 24;
  };

  drawLine("Applicant Name:", fields.applicantName ?? "");
  drawLine("GTC Point:", fields.pointName ?? "");
  drawLine("Date:", new Date().toISOString().split("T")[0]);

  // signature box
  page.drawRectangle({ x: 50, y: 620, width: 220, height: 50, borderColor: rgb(0,0,0), borderWidth: 1 });
  page.drawText("Signature (after print & sign):", { x: 55, y: 675, size: 10, font });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}


```
# apps/api/src/index.ts
```
// apps/api/src/index.ts
import { createServer } from "http";
import { Server } from "socket.io";
import { initSockets } from "./sockets";
import { app } from "./server";
import { setIO } from "./sockets/io";


const server = createServer(app);
const io = new Server(server, { cors: { origin: ["http://localhost:3000"] } });
setIO(io);
initSockets(io);


// dev-only route
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API listening on :${PORT}`));


```

# apps/api/src/server.ts
```
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
import { adminServices } from "./routes/admin.services";import { meNotifications } from "./routes/notifications.me";
import { devNotify } from "./routes/dev";
import { conventionsRouter } from "./routes/conventions";     
import { adminConventions } from "./routes/admin.conventions"; 
import { pointServices } from "./routes/point.services";

export const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/admin/sectors", adminSectors);
app.use("/api/admin/points", adminPoints);
app.use("/api/admin/services", adminServices);
app.use("/api/me/notifications", meNotifications);
app.use("/api/dev", devNotify);
app.use("/api/conventions", conventionsRouter);
app.use("/api/admin/conventions", adminConventions);
app.use("/api/point/services", pointServices);

app.use(errorHandler);
```

# apps/web/.dockerignore
```
# apps/web/.dockerignore
node_modules
.next
npm-debug.log

```

# apps/web/.env.local
```
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

```
# apps/web/.gitignore
```
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

# apps/web/components.json
```
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

# apps/web/Dockerfile
```
# apps/web/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

```

# apps/web/eslint.config.mjs
```
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

# apps/web/next-env.d.ts
```
/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference path="./.next/types/routes.d.ts" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
ac
```

# apps/web/next.config.mjs
```
// apps/web/next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;

```

# apps/web/package.json
```
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
    "next-themes": "^0.4.6",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "socket.io-client": "^4.8.1",
    "sonner": "^2.0.7",
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

# apps/web/postcss.config.mjs
```
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

# apps/web/tsconfig.json
```
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
# apps/web/src/app/(auth)/login/page.tsx
```
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
  const [errors, setErrors] = useState<{ email?: string; password?: string; root?: string }>({});

  const loginResponseSchema = z.object({
    accessToken: z.string(),
    user: z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.string() }),
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
          const response = maybe.response as Record<string, unknown> | undefined;
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
          <p className="text-sm text-gray-500">Use your admin or point credentials.</p>
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
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            autoComplete="current-password"
          />
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
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

# apps/web/src/app/(protected)/admin/conventions/page.tsx
```
"use client";
import AdminConventionsPage from "../../../../components/conventions/AdminConventions";
export default function Page() { return <AdminConventionsPage />; }
```

# apps/web/src/app/(protected)/admin/points/page.tsx
```
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPoint, listPoints, listSectors, type Point } from "@/lib/admin-api";
import { useMemo, useState } from "react";
import { z } from "zod";
import Link from "next/link";

const schema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  sectorId: z.string().min(1),
});

export default function PointsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", sectorId: "" });
  const [err, setErr] = useState<string | null>(null);

  const sectorsQ = useQuery({ queryKey: ["admin", "sectors"], queryFn: () => listSectors(1, 100) });
  const pointsQ = useQuery({ queryKey: ["admin", "points"], queryFn: () => listPoints(1, 100) });

  const sectorOptions = useMemo(() => sectorsQ.data?.items ?? [], [sectorsQ.data]);

  const createMut = useMutation({
    mutationFn: (payload: { name: string; email: string; sectorId: string }) => createPoint(payload),
    onSuccess: () => {
      setForm({ name: "", email: "", sectorId: "" });
      qc.invalidateQueries({ queryKey: ["admin", "points"] });
    },
    onError: () => setErr("Failed to create point (check sector)"),
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create GTC Point</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            const parsed = schema.safeParse(form);
            if (!parsed.success) {
              return setErr(parsed.error.issues[0]?.message ?? "Validation error");
            }
            createMut.mutate(parsed.data);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-1">
            <label className="block text-sm mb-1">Name</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Sector</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={form.sectorId}
              onChange={(e) => setForm((s) => ({ ...s, sectorId: e.target.value }))}
              disabled={sectorsQ.isLoading}
            >
              <option value="">Select a sector…</option>
              {sectorOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">A valid sector is required (avoids foreign key errors).</p>
          </div>

          <div className="sm:col-span-2">
            <button className="rounded-md bg-black text-white px-3 py-2" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating..." : "Create"}
            </button>
            {err && <span className="ml-3 text-sm text-red-600">{err}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">GTC Points</h2>
        {pointsQ.isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="divide-y">
            {pointsQ.data?.items.map((p: Point) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-600">{p.email}</div>
                  <div className="text-xs text-gray-500 mt-1">Sector: {p.sector?.name ?? p.sectorId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/points/${p.id}/services`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                    title="Manage services for this point"
                  >
                    Services
                  </Link>
                  {/* (optional) overview/edit buttons can go here too */}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

```

# apps/web/src/app/(protected)/admin/points/[id]/services/page.tsx
```
"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys/services";
import { getAdminPointServices, ServiceLink, toggleAdminPointService } from "@/lib/clients/servicesClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ServiceStatusBadge from "@/components/services/ServiceStatusBadge";
import { toast } from "sonner";
import { AxiosError } from "axios";
import Link from "next/link";

type ToggleVars = { serviceId: string; action: "ENABLE" | "DISABLE" };
type ApiError = AxiosError<{ error?: string }>;
type MutCtx = { prev?: ServiceLink[] };

export default function AdminPointServicesPage() {
  const params = useParams<{ id: string }>();
  const pointId = params.id!;

  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<ServiceLink[]>({
    queryKey: qk.adminPointServices(pointId),
    queryFn: () => getAdminPointServices(pointId),
  });

  const toggle = useMutation<ServiceLink, ApiError, ToggleVars,  MutCtx>({
    mutationFn: ({ serviceId, action }: { serviceId: string; action: "ENABLE" | "DISABLE" }) =>
      toggleAdminPointService(pointId, serviceId, action),
    onMutate: async ({ serviceId, action }) => {
      await qc.cancelQueries({ queryKey: qk.adminPointServices(pointId) });
      const prev = qc.getQueryData<ServiceLink[]>(
        qk.adminPointServices(pointId)
      );

      if (prev) {
        const next: ServiceLink[] = prev.map((x) => (x.serviceId === serviceId ? { ...x, status: action === "ENABLE" ? "ENABLED" : "DISABLED" } : x));
        qc.setQueryData(qk.adminPointServices(pointId), next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData<ServiceLink[]>(qk.adminPointServices(pointId), ctx.prev);
      toast.error("Update failed");
    },
    onSuccess: (link) => {
      toast.success(`Service ${link.status.toLowerCase()} for point`);
      qc.invalidateQueries({ queryKey: qk.adminPointServices(pointId) });
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Point Services</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading…</p>}
          {isError && <p className="text-destructive">Failed to load.</p>}
          {!isLoading && data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44%]">Service</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.service.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.service.code}</TableCell>
                    <TableCell><ServiceStatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggle.isPending || row.status === "ENABLED"}
                        onClick={() => toggle.mutate({ serviceId: row.serviceId, action: "ENABLE" })}
                      >
                        Enable
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={toggle.isPending || row.status === "DISABLED"}
                        onClick={() => toggle.mutate({ serviceId: row.serviceId, action: "DISABLE" })}
                      >
                        Disable
                      </Button>
                
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Changes notify the point in real-time (in-app + email).
      </p>
    </div>
  );
}

```


# apps/web/src/app/(protected)/admin/sectors/page.tsx
```
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSector, deleteSector, listSectors, updateSector, type Sector } from "@/lib/admin-api";
import { useState } from "react";
import { z } from "zod";

const sectorSchema = z.object({ name: z.string().min(2).max(100) });

export default function SectorsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<null | Sector>(null);
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["admin", "sectors"], queryFn: () => listSectors(1, 100) });

  const createMut = useMutation({
    mutationFn: (payload: { name: string }) => createSector(payload),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["admin", "sectors"] });
    },
    onError: () => setErr("Failed to create sector"),
  });

  const updateMut = useMutation({
    mutationFn: (p: { id: string; name: string }) => updateSector(p.id, { name: p.name }),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "sectors"] });
    },
    onError: () => setErr("Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSector(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sectors"] }),
    onError: () => setErr("Delete failed (maybe sector has points)"),
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create sector</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            const parsed = sectorSchema.safeParse({ name });
            if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? "Validation error");
            createMut.mutate(parsed.data);
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="e.g., Training"
          />
          <button className="rounded-md bg-black text-white px-3 py-2" disabled={createMut.isPending}>
            {createMut.isPending ? "Creating..." : "Create"}
          </button>
        </form>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Sectors</h2>
        {q.isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="divide-y">
            {q.data?.items.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                {editing?.id === s.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const parsed = sectorSchema.safeParse({ name: editing.name });
                      if (!parsed.success) return;
                      updateMut.mutate({ id: s.id, name: parsed.data.name });
                    }}
                    className="flex-1 flex gap-2"
                  >
                    <input
                      className="rounded-md border px-3 py-2 flex-1"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                    <button className="rounded-md border px-3 py-2" type="button" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button className="rounded-md bg-black text-white px-3 py-2">
                      {updateMut.isPending ? "Saving..." : "Save"}
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-md border px-3 py-1.5" onClick={() => setEditing(s)}>
                        Edit
                      </button>
                      <button
                        className="rounded-md border px-3 py-1.5"
                        onClick={() => deleteMut.mutate(s.id)}
                        disabled={deleteMut.isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

```

# apps/web/src/app/(protected)/admin/services/page.tsx
```
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createService, deleteService, listServices, updateService, type Service } from "@/lib/admin-api";
import { useState } from "react";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(200),
});

export default function ServicesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "services"], queryFn: () => listServices() });

  const [form, setForm] = useState({ code: "", name: "" });
  const [err, setErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: { code: string; name: string }) => createService(payload),
    onSuccess: () => {
      setForm({ code: "", name: "" });
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
    },
    onError: () => setErr("Failed to create service"),
  });

  const toggleMut = useMutation({
    mutationFn: (svc: Service) => updateService(svc.id, { active: !svc.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
    onError: () => setErr("Delete failed (service linked to points)"),
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create service</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            const parsed = schema.safeParse(form);
            if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? "Validation error");
            createMut.mutate(parsed.data);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm mb-1">Code (UPPER_SNAKE)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
              placeholder="DOC_SIGN"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Document Signing"
            />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-md bg-black text-white px-3 py-2" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating..." : "Create"}
            </button>
            {err && <span className="ml-3 text-sm text-red-600">{err}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Services</h2>
        {q.isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="divide-y">
            {q.data?.map((svc) => (
              <div key={svc.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{svc.name}</div>
                  <div className="text-xs text-gray-600">{svc.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border px-3 py-1.5"
                    onClick={() => toggleMut.mutate(svc)}
                    disabled={toggleMut.isPending}
                  >
                    {svc.active ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="rounded-md border px-3 py-1.5"
                    onClick={() => delMut.mutate(svc.id)}
                    disabled={delMut.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

```

# apps/web/src/app/(protected)/dashboard/page.tsx
```
"use client";

import Protected from "@/components/protected";
import { useAuth } from "@/providers/auth-provider";
import NotificationBell from "@/components/notification-bell";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Protected>
      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <NotificationBell />
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

# apps/web/src/app/(protected)/notifications/page.tsx
```
"use client";

import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead } from "@/lib/notifications-api";

type NotificationsPage = Awaited<ReturnType<typeof listNotifications>>;

export default function NotificationsPage() {
  const qc = useQueryClient();

  const feed = useInfiniteQuery({
    queryKey: ["me", "notifications"],
    queryFn: ({ pageParam }) => listNotifications(20, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const markMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (updated) => {
      // Update the cached items to mark this as read
      qc.setQueryData<InfiniteData<NotificationsPage>>(["me", "notifications"], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            items: p.items.map((n) => (n.id === updated.id ? { ...n, read: true } : n)),
          })),
        };
      });
      // Decrement unread badge
      qc.setQueryData<number>(["me", "unread"], (prev) =>
        typeof prev === "number" ? Math.max(0, prev - 1) : prev
      );
    },
  });

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      <div className="rounded-xl border divide-y">
        {feed.isLoading ? (
          <div className="p-6">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-500">No notifications yet.</div>
        ) : (
          <>
            {items.map((n) => (
              <div
                key={n.id}
                className="p-4 flex items-start justify-between gap-4"
                style={{ background: n.read ? undefined : "rgba(59,130,246,0.05)" }} // subtle highlight for unread
              >
                <div>
                  <div className="font-medium">{n.subject}</div>
                  {n.contentHtml ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: n.contentHtml }}
                    />
                  ) : null}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!n.read && (
                    <button
                      onClick={() => markMut.mutate(n.id)}
                      className="rounded-md border px-3 py-1.5 text-sm"
                      disabled={markMut.isPending}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}

            {feed.hasNextPage && (
              <div className="p-4">
                <button
                  className="rounded-md border px-3 py-2"
                  onClick={() => feed.fetchNextPage()}
                  disabled={feed.isFetchingNextPage}
                >
                  {feed.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

```

# apps/web/src/app/(protected)/point/conventions/page.tsx
```
"use client";
import PointConventionsPage from "../../../../components/conventions/PointConventions";

export default function Page() { return <PointConventionsPage />; }
```

# apps/web/src/app/(Protected)/point/services/page.tsx
```
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys/services";
import { getPointServices, requestServiceById, ServiceLink } from "@/lib/clients/servicesClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ServiceStatusBadge from "@/components/services/ServiceStatusBadge";
import { toast } from "sonner";
import { AxiosError } from "axios";

export default function PointServicesPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<ServiceLink[]>({ queryKey: qk.pointServices, queryFn: getPointServices });

  const requestMut = useMutation<
    ServiceLink,                            // return type
    AxiosError<{ error?: string }>,         // error type
    string                                  // variables type (serviceId)
  >({
    mutationFn: (serviceId: string) => requestServiceById(serviceId),
    onSuccess: () => {
      toast.success("Request sent to Admins");
      qc.invalidateQueries({ queryKey: qk.pointServices });
    },
     onError: (err) => toast.error(err.response?.data?.error ?? "Failed to request service"),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Services</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading…</p>}
          {isError && <p className="text-destructive">Failed to load.</p>}
          {!isLoading && data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44%]">Service</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const canRequest = row.status === "DISABLED";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.service.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.service.code}</TableCell>
                      <TableCell><ServiceStatusBadge status={row.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={!canRequest || requestMut.isPending}
                          onClick={() => requestMut.mutate(row.serviceId)}
                        >
                          {canRequest ? "Request" : row.status === "PENDING_REQUEST" ? "Pending…" : "—"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Tip: “Request” is only available for services that are currently <b>Disabled</b>.
      </p>
    </div>
  );
}
```

# apps/web/src/app/(protected)/layout.tsx
```
"use client"
import AdminNav from "@/components/admin-nav";
import Protected from "@/components/protected";
import NotificationBell from "@/components/notification-bell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <div className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <AdminNav />
          </div>
        </header>
        {children}
      </div>
    </Protected>
  );
}

```

# apps/web/src/app/(protected)/page.tsx
```
export default function AdminHome() {
  return (
    <main className="rounded-xl border p-6">
      <p className="text-gray-700">
        Choose a section: Sectors, GTC Points, or Services.
      </p>
    </main>
  );
}

```

# apps/web/src/app/globals.css
```
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

# apps/web/src/app/page.tsx
```
// apps/web/src/app/page.tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">GTC Web</h1>
    </main>
  );
}


```

# apps/web/src/app/layout.tsx
```
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { SocketProvider } from "@/providers/socket-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "GTC", description: "Network GTC" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <SocketProvider>{children}</SocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

```

# apps/web/src/components/conventions/AdminConventions.tsx
```
"use client";
import { useState } from "react";
import { downloadArchive, useAdminConventions, useAdminDecision } from "../../hooks/useConventions";
import type { ConventionStatus } from "../../lib/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { downloadBlob } from "@/lib/axios";


const statusTabs: (ConventionStatus | "ALL")[] = ["ALL", "NEW", "UPLOADED", "APPROVED", "DECLINED"];


export default function AdminConventionsPage() {
const [status, setStatus] = useState<ConventionStatus | undefined>("UPLOADED");
const items = useAdminConventions(status);



return (
<div className="p-6 space-y-6">
<div className="flex items-center justify-between">
<h1 className="text-2xl font-semibold">Admin · Conventions</h1>
</div>


<div className="flex gap-2">
{statusTabs.map((s) => (
<Button
key={s}
variant={s === (status ?? "ALL") ? "default" : "outline"}
onClick={() => setStatus(s === "ALL" ? undefined : (s as ConventionStatus))}
>
{s}
</Button>
))}
</div>


<section className="rounded-2xl border">
{items.isLoading && <div className="p-4">Loading…</div>}
{!items.isLoading && (
<table className="w-full text-sm">
<thead>
<tr className="bg-muted/30 text-left">
<th className="p-3">Convention</th>
<th className="p-3">Point / Sector</th>
<th className="p-3">Status</th>
<th className="p-3">Actions</th>
</tr>
</thead>
<tbody>
{items.data?.map((c) => (
<AdminRow key={c.id} id={c.id} point={c.gtcPoint?.name ?? "—"} sector={c.sector?.name ?? "—"} status={c.status} />
))}
</tbody>
</table>
)}
</section>
</div>
);
}


function AdminRow({ id, point, sector, status }: { id: string; point: string; sector: string; status: ConventionStatus }) {
const [rep, setRep] = useState("");
const decision = useAdminDecision(id);


const canDecide = status === "NEW" || status === "UPLOADED";


return (
<tr className="border-t">
<td className="p-3 align-top font-mono text-xs">{id}</td>
<td className="p-3 align-top">{point} <span className="text-muted-foreground">/ {sector}</span></td>
<td className="p-3 align-top font-medium">{status}</td>
<td className="p-3 align-top">
{canDecide ? (
<div className="flex items-center gap-2">
<Input placeholder="Internal Sales Rep (optional)" value={rep} onChange={(e) => setRep(e.target.value)} />
<Button size="sm" onClick={() => decision.mutate({ action: "APPROVE", internalSalesRep: rep || undefined })}>Approve</Button>
<Button size="sm" variant="destructive" onClick={() => decision.mutate({ action: "DECLINE" })}>Decline</Button>
<Button
    size="sm"
    variant="outline"
    onClick={async () => {
      const { blob, filename } = await downloadArchive(id);
      downloadBlob(blob, filename);
    }}
    title="Download all documents as ZIP"
  >
    ZIP
  </Button>
</div>
) : (
<span className="text-muted-foreground">—</span>
)}
</td>
</tr>
);
}
```

# apps/web/src/components/conventions/PointConventions.tsx
```
"use client";
import { useState } from "react";
import { useCreateConvention,  useMyConventions, downloadDocument } from "../../hooks/useConventions";
import PrefillForm from "./PrefillForm";
import UploadSigned from "./UploadSigned";
import { Button } from "../../components/ui/button";


export default function PointConventionsPage() {
const [page, setPage] = useState(1);
const { data, isLoading } = useMyConventions(page, 20);
const createConvention = useCreateConvention();


async function handleDownload(conventionId: string, docId: string, name: string) {
const blob = await downloadDocument(conventionId, docId);
const filename = name || `convention-${conventionId}.pdf`;
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

return (
<div className="p-6 space-y-6">
<div className="flex items-center justify-between">
<h1 className="text-2xl font-semibold">My Conventions</h1>
<Button onClick={() => createConvention.mutate()}>Create convention</Button>
</div>


<section className="rounded-2xl border p-4 space-y-4">
<h2 className="font-medium">Step 1: Prefill & download</h2>
<PrefillForm />
</section>


<section className="rounded-2xl border">
{isLoading && <div className="p-4">Loading…</div>}
{!isLoading && (
<table className="w-full text-sm">
<thead>
<tr className="bg-muted/30 text-left">
<th className="p-3">#</th>
<th className="p-3">Status</th>
<th className="p-3">Point</th>
<th className="p-3">Sector</th>
<th className="p-3">Documents</th>
<th className="p-3">Actions</th>
</tr>
</thead>
<tbody>
{data?.items?.map((c, idx) => (
<tr key={c.id} className="border-t">
<td className="p-3 align-top">{(data.page - 1) * data.pageSize + idx + 1}</td>
<td className="p-3 align-top">
<span className="inline-flex items-center gap-2">
<span className="font-medium">{c.status}</span>
{c.internalSalesRep && (
<span className="text-xs text-muted-foreground">/ {c.internalSalesRep}</span>
)}
</span>
</td>
<td className="p-3 align-top">{c.gtcPoint?.name ?? "—"}</td>
<td className="p-3 align-top">{c.sector?.name ?? "—"}</td>
<td className="p-3 align-top">
{c.documents?.length ? (
<ul className="space-y-1">
{c.documents.map((d) => (
<li key={d.id} className="flex items-center gap-2">
<Button variant="outline" size="sm" onClick={() => handleDownload(c.id, d.id, d.fileName)}>
Download
</Button>
<span className="text-xs text-muted-foreground">{d.fileName}</span>
 <span className="text-muted-foreground">
          {" "}
          · {d.mime || "file"} · {(d.size / 1024).toFixed(0)} KB
        </span>
</li>
))}
</ul>
) : (
<span className="text-muted-foreground">No documents</span>
)}
</td>
<td className="p-3 align-top">
{(c.status === "NEW" || c.status === "UPLOADED") && (
<UploadSigned conventionId={c.id} />
)}
</td>
</tr>
))}
</tbody>
</table>
)}
</section>
</div>
);
}
```

# apps/web/src/components/files.UploadWidget.tsx
```
"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "../../components/ui/button";

type Props = {
  accept?: string | string[];       // e.g. "application/pdf" or [".pdf","image/*"]
  maxSizeMB?: number;                // e.g. 10
  value?: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
};

function toArray(a?: string | string[]) {
  if (!a) return [] as string[];
  return Array.isArray(a) ? a : a.split(",").map((s) => s.trim());
}
function matchesAccept(file: File, accept?: string | string[]) {
  const list = toArray(accept).map((s) => s.toLowerCase());
  if (!list.length) return true;
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return list.some((a) => {
    if (a.startsWith(".")) return name.endsWith(a);
    if (a.endsWith("/*")) return mime.startsWith(a.slice(0, -1));
    return mime === a;
  });
}

export default function UploadWidget({
  accept = "application/pdf",
  maxSizeMB = 10,
  value = null,
  onSelect,
  disabled,
  hint,
  className = "",
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validateAndSet = useCallback(
    (file: File) => {
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        setError(`File is too large (max ${maxSizeMB}MB).`);
        onSelect(null);
        return;
      }
      if (!matchesAccept(file, accept)) {
        setError("File type not allowed.");
        onSelect(null);
        return;
      }
      setError(null);
      onSelect(file);
    },
    [accept, maxSizeMB, onSelect]
  );

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) validateAndSet(f);
  };

  return (
    <div className={className}>
      <div
        className={[
          "rounded-lg border border-dashed p-4 text-sm",
          "flex items-center justify-between gap-3",
          dragOver ? "bg-muted/40" : "bg-muted/20",
          disabled ? "opacity-60 pointer-events-none" : "",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer?.files ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-disabled={disabled}
      >
        <div className="flex-1">
          {value ? (
            <div className="flex flex-col">
              <span className="font-medium">{value.name}</span>
              <span className="text-xs text-muted-foreground">
                {(value.size / 1024).toFixed(0)} KB
              </span>
            </div>
          ) : (
            <div className="text-muted-foreground">
              Drop a file here or <span className="underline">browse</span>
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm">
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={toArray(accept).join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {hint ?? `Accepted: ${toArray(accept).join(", ") || "any"} · Max ${maxSizeMB}MB`}
        </span>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}

```

# apps/web/src/components/services/ServiceStatusBadge.tsx
```
"use client";
import { Badge } from "@/components/ui/badge";

export default function ServiceStatusBadge({ status }: { status: "ENABLED" | "DISABLED" | "PENDING_REQUEST" }) {
  const map: Record<string, { variant?: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    ENABLED: { variant: "default", label: "Enabled" },
    DISABLED: { variant: "secondary", label: "Disabled" },
    PENDING_REQUEST: { variant: "outline", label: "Pending" },
  };
  const v = map[status] ?? { variant: "outline", label: status };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

```

# apps/web/src/components/PrefillFrom.tsx
```
"use client";
import { useState } from "react";
import { prefillPdf } from "../../hooks/useConventions";
import { downloadBlob } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";


export default function PrefillForm() {
const [applicantName, setApplicantName] = useState("");
const [loading, setLoading] = useState(false);


async function handlePrefill() {
try {
setLoading(true);
const blob = await prefillPdf({ applicantName });
downloadBlob(blob, "convention-prefill.pdf");
} finally {
setLoading(false);
}
}


return (
<div className="flex items-end gap-3">
<div className="flex-1">
<label className="text-sm mb-1 block">Applicant name</label>
<Input placeholder="Jane Doe" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
</div>
<Button onClick={handlePrefill} disabled={loading}>
{loading ? "Building…" : "Download prefill PDF"}
</Button>
</div>
);
}
```

# apps/web/src/components/conventions/UploadSigned.tsx
```
"use client";
import { useState } from "react";
import { useUploadSigned } from "../../hooks/useConventions";
import { Button } from "../../components/ui/button";
import UploadWidget from "../files/UploadWidget";
import { AxiosProgressEvent } from "axios";


export default function UploadSigned({ conventionId }: { conventionId: string }) {
const [file, setFile] = useState<File | null>(null);
const [progress, setProgress] = useState<number | null>(null);
const mutation = useUploadSigned(conventionId);


  async function onUpload() {
    if (!file) return;
    setProgress(0);
    await mutation.mutateAsync({
      file,
      onUploadProgress: (p: AxiosProgressEvent) => {
        if (!p.total) return;
        const pct = Math.round((p.loaded / p.total) * 100);
        setProgress(pct);
      },
    });
    setProgress(null);
    setFile(null);
  }


return (
<div className="flex items-center gap-3">
<UploadWidget
        accept="application/pdf"
        maxSizeMB={10}
        value={file}
        onSelect={setFile}
        disabled={mutation.isPending}
        hint="Signed PDF only · Max 10MB"
        className="min-w-[360px]"
      />
<Button disabled={!file || mutation.isPending} onClick={onUpload}>
{mutation.isPending ? "Uploading…" : "Upload signed PDF"}
</Button>
{progress !== null && <span className="text-sm text-muted-foreground">{progress}%</span>}
</div>
);
}
```

# apps/web/src/components/admin-nav.tsx
```
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

// base admin items
const baseItems = [
  { href: "/admin/sectors", label: "Sectors" },
  { href: "/admin/points", label: "GTC Points" },
  { href: "/admin/services", label: "Services" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  // build items based on role
  const items = [...baseItems];
  if (user?.role === "ADMIN") {
    // admin sees admin conventions
    items.unshift({ href: "/admin/conventions", label: "Conventions" });
  }
  if (user?.role === "GTC_POINT") {
    // point users see point conventions
    items.unshift({ href: "/point/conventions", label: "My Conventions" });
  }
  return (
    <nav className="flex gap-2">
      {items.map((it) => {
        const active = pathname?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50",
              active && "bg-black text-white hover:bg-black"
            )}
          >
            {it.label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Logout
      </button>
    </nav>
  );
}

```

# apps/web/src/components/notification-bell.tsx
```
"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUnread } from "@/lib/notifications-api";

export default function NotificationBell() {
  const { data: unread } = useQuery({
    queryKey: ["me", "unread"],
    queryFn: getUnread,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const count = unread ?? 0;

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center rounded-md border px-3 py-1.5 hover:bg-gray-50"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-600 text-white text-xs px-1 flex items-center justify-center"
          aria-label={`${count} unread notifications`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

```

# apps/web/src/components/protected.tsx
```
"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth();
  const router = useRouter();
  // wait for auth initialization to complete in the provider
  const { initialized } = useAuth();

  useEffect(() => {
    if (initialized && !isAuthed) router.replace("/login");
  }, [isAuthed, router, initialized]);

  if (!initialized) return null;
  if (!isAuthed) return null;
  return <>{children}</>;
}

```

# apps/web/src/hooks/useConventions.ts
```
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { Convention, ConventionDocument, ConventionStatus } from "../lib/types";
import type { AxiosProgressEvent, AxiosResponseHeaders } from "axios";

export function useMyConventions(page = 1, pageSize = 20) {
return useQuery({
queryKey: ["conventions", { page, pageSize }],
queryFn: async () => {
const { data } = await api.get<{ items: Convention[]; total: number; page: number; pageSize: number }>(
`/api/conventions`,
{ params: { page, pageSize } }
);
return data;
},
});
}


export function useAdminConventions(status?: ConventionStatus) {
return useQuery({
queryKey: ["admin-conventions", { status }],
queryFn: async () => {
const { data } = await api.get<{ items: Convention[] }>(`/api/admin/conventions`, {
params: status ? { status } : undefined,
});
return data.items;
},
});
}


export function useCreateConvention() {
const qc = useQueryClient();
return useMutation({
mutationFn: async () => {
const { data } = await api.post<Convention>(`/api/conventions`, {});
return data;
},
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["conventions"] });
},
});
}

type UploadSignedVars = {
  file: File;
  onUploadProgress?: (e: AxiosProgressEvent) => void;
};

export function useUploadSigned(conventionId: string) {
const qc = useQueryClient();
return useMutation<
    { ok: boolean; document: ConventionDocument; downloadUrl: string },
    Error,
    UploadSignedVars
  >({
mutationFn: async ({ file, onUploadProgress }) => {
const fd = new FormData();
fd.append("file", file);
const r = await api.post(`/api/conventions/${conventionId}/upload`, fd,  { onUploadProgress });
 return r.data;
},
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["conventions"] });
qc.invalidateQueries({ queryKey: ["admin-conventions"] });
},
});
}


export async function prefillPdf(params: { applicantName?: string; pointName?: string; title?: string }) {
const { data } = await api.post(`/api/conventions/prefill`, params, { responseType: "blob" });
return data as Blob;
}


export function useListDocuments(conventionId: string) {
return useQuery({
queryKey: ["convention-docs", conventionId],
queryFn: async () => {
const { data } = await api.get<{ items: ConventionDocument[] }>(`/api/conventions/${conventionId}/documents`);
return data.items;
},
enabled: !!conventionId,
});
}


export async function downloadDocument(conventionId: string, docId: string) {
const { data } = await api.get(`/api/conventions/${conventionId}/documents/${docId}/download`, {
responseType: "blob",
});
return data as Blob;
}


export function useAdminDecision(conventionId: string) {
const qc = useQueryClient();
return useMutation({
mutationFn: async (payload: { action: "APPROVE" | "DECLINE"; internalSalesRep?: string }) => {
const { data } = await api.patch(`/api/admin/conventions/${conventionId}`, payload);
return data as Convention;
},
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["admin-conventions"] });
qc.invalidateQueries({ queryKey: ["conventions"] });
},
});
}

function parseContentDispositionFilename(h?: string): string | null {
  if (!h) return null;
  // handles: filename="x.zip" OR filename*=UTF-8''x.zip
  const mUtf = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(h);
  if (mUtf?.[1]) return decodeURIComponent(mUtf[1].replace(/^["']|["']$/g, ""));
  const m = /filename=([^;]+)/i.exec(h);
  if (m?.[1]) return m[1].trim().replace(/^["']|["']$/g, "");
  return null;
}

export async function downloadArchive(conventionId: string): Promise<{ blob: Blob; filename: string }> {
  const r = await api.get(`/api/admin/conventions/${conventionId}/archive`, { responseType: "blob" });
  const headers = (r.headers ?? {}) as AxiosResponseHeaders;
  const filename = parseContentDispositionFilename(headers["content-disposition"]) || `convention-${conventionId}.zip`;
  return { blob: r.data as Blob, filename };
}
```

# apps/web/src/lib/clients/servicesClient.ts
```
import { api } from "../axios";

export type ServiceLite = { id: string; code: string; name: string; active: boolean };
export type ServiceLink = {
  id: string;
  gtcPointId: string;
  serviceId: string;
  status: "ENABLED" | "DISABLED" | "PENDING_REQUEST";
  createdAt: string;
  updatedAt: string;
  service: ServiceLite;
};

export async function getPointServices() {
  const { data } = await api.get<{ items: ServiceLink[] }>("/api/point/services");
  return data.items;
}

export async function requestServiceByCode(serviceCode: string) {
  const { data } = await api.post<ServiceLink>("/api/point/services/requests", { serviceCode });
  return data;
}
export async function requestServiceById(serviceId: string) {
  const { data } = await api.post<ServiceLink>("/api/point/services/requests", { serviceId });
  return data;
}

export async function getAdminPointServices(pointId: string) {
  const { data } = await api.get<{ items: ServiceLink[] }>(`/api/admin/points/${pointId}/services`);
  return data.items;
}

export async function toggleAdminPointService(
  pointId: string,
  serviceId: string,
  action: "ENABLE" | "DISABLE"
) {
  const { data } = await api.patch<ServiceLink>(
    `/api/admin/points/${pointId}/services/${serviceId}`,
    { action }
  );
  return data;
}

/** Some installs return array for /api/admin/services; normalize to array */
export async function getAdminServicesAll() {
  const { data } = await api.get(`/api/admin/services`);
  return Array.isArray(data) ? (data as ServiceLite[]) : ((data?.items ?? []) as ServiceLite[]);
}

```

# apps/web/src/lib/queryKeys/services.ts
```
export const qk = {
  pointServices: ["point", "services"] as const,
  adminPointServices: (pointId: string) => ["admin", "points", pointId, "services"] as const,
  adminServices: ["admin", "services"] as const,
};
```

# apps/web/src/lib/admin-api.ts
```
import { api } from "./axios";

export type Sector = { id: string; name: string; createdAt: string; updatedAt: string };
export type Point = { id: string; name: string; email: string; sectorId: string; createdAt: string; updatedAt: string; sector?: Sector };
export type Service = { id: string; code: string; name: string; active: boolean; createdAt: string; updatedAt: string };

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export async function listSectors(page = 1, pageSize = 50) {
  const { data } = await api.get<Paged<Sector>>(`/api/admin/sectors`, { params: { page, pageSize } });
  return data;
}
export async function createSector(payload: { name: string }) {
  const { data } = await api.post<Sector>(`/api/admin/sectors`, payload);
  return data;
}
export async function updateSector(id: string, payload: { name: string }) {
  const { data } = await api.patch<Sector>(`/api/admin/sectors/${id}`, payload);
  return data;
}
export async function deleteSector(id: string) {
  const { data } = await api.delete(`/api/admin/sectors/${id}`);
  return data;
}

export async function listPoints(page = 1, pageSize = 50) {
  const { data } = await api.get<Paged<Point>>(`/api/admin/points`, { params: { page, pageSize } });
  return data;
}
export async function createPoint(payload: { name: string; email: string; sectorId: string }) {
  const { data } = await api.post<Point>(`/api/admin/points`, payload);
  return data;
}
export async function updatePoint(id: string, payload: Partial<{ name: string; email: string; sectorId: string }>) {
  const { data } = await api.patch<Point>(`/api/admin/points/${id}`, payload);
  return data;
}
export async function deletePoint(id: string) {
  const { data } = await api.delete(`/api/admin/points/${id}`);
  return data;
}

export async function listServices() {
  const { data } = await api.get<Service[]>(`/api/admin/services`);
  return data;
}
export async function createService(payload: { code: string; name: string; active?: boolean }) {
  const { data } = await api.post<Service>(`/api/admin/services`, payload);
  return data;
}
export async function updateService(id: string, payload: Partial<{ code: string; name: string; active: boolean }>) {
  const { data } = await api.patch<Service>(`/api/admin/services/${id}`, payload);
  return data;
}
export async function deleteService(id: string) {
  const { data } = await api.delete(`/api/admin/services/${id}`);
  return data;
}

```

# apps/web/src/lib/axios.ts
```
// apps/web/src/lib/axios.ts
import axios, {
  type AxiosError,
  type AxiosHeaders,
  type AxiosRequestHeaders,
  type InternalAxiosRequestConfig,
  type AxiosRequestConfig,
} from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // for refresh cookie
});

const AUTH_KEY = "gtc_auth";
type AuthLS = { token?: string; user?: unknown } | null;

function readAuth(): AuthLS {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw) as AuthLS;
    const legacy = localStorage.getItem("accessToken");
    return legacy ? ({ token: legacy } as AuthLS) : null;
  } catch {
    return null;
  }
}

function writeAuthToken(token?: string): void {
  if (typeof window === "undefined") return;
  // keep legacy in sync (optional)
  if (token) localStorage.setItem("accessToken", token);
  else localStorage.removeItem("accessToken");

  try {
    const current = readAuth() ?? {};
    const next = token ? { ...current, token } : null;
    if (next) localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    /* no-op */
  }
}

function getAccessToken(): string | undefined {
  return readAuth()?.token ?? undefined;
}

// ---------- headers helpers (type-safe) ----------
function isAxiosHeaders(h: unknown): h is AxiosHeaders {
  return !!h && typeof (h as AxiosHeaders).set === "function";
}

function attachAuthHeader(cfg: InternalAxiosRequestConfig, token: string): void {
  const h = cfg.headers;
  if (isAxiosHeaders(h)) {
    h.set("Authorization", `Bearer ${token}`);
  } else {
    const base: AxiosRequestHeaders = (h ?? {}) as AxiosRequestHeaders;
    base.Authorization = `Bearer ${token}`;
    cfg.headers = base;
  }
}

// ---------- onUnauthorized hook ----------
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

// ---------- request interceptor ----------
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) attachAuthHeader(config as InternalAxiosRequestConfig, token);
  return config;
});

// ---------- refresh logic (one-shot gate) ----------
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const r = await axios.post(`${API_BASE}/api/auth/refresh`, {}, { withCredentials: true });
    const newToken = (r.data as { accessToken?: string }).accessToken ?? null;
    if (newToken) writeAuthToken(newToken);
    return newToken;
  } catch {
    return null;
  }
}

// ---------- response interceptor ----------
api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const status = err.response?.status;
    const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (status === 401 && original && !original._retry) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
        });
      }

      const newToken = await (refreshPromise as Promise<string | null>);
      if (newToken) {
        attachAuthHeader(original, newToken);
        return api.request(original as AxiosRequestConfig);
      } else {
        writeAuthToken(undefined);
        onUnauthorized?.();
      }
    }

    return Promise.reject(err);
  }
);

// ---------- util ----------
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

```

# apps/web/src/lib/notification-api.ts
```
import { api } from "./axios";

export type Notification = {
  id: string;
  userId: string;
  type: string;
  subject: string;
  contentHtml?: string | null;
  read: boolean;
  createdAt: string;
};

export async function getUnread(): Promise<number> {
  const { data } = await api.get<{ unread: number }>("/api/me/notifications/unread-count");
  return data.unread;
}

export async function listNotifications(take = 20, cursor?: string) {
  const { data } = await api.get<{ items: Notification[]; nextCursor: string | null }>(
    "/api/me/notifications",
    { params: { take, cursor } }
  );
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.post<Notification>(`/api/me/notifications/${id}/read`);
  return data;
}

```

# apps/web/src/lib/queryClient.ts
```
// apps/web/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient();

```

# apps/web/src/lib/types.ts
```
export type ConventionStatus = "NEW" | "UPLOADED" | "APPROVED" | "DECLINED";


export type GtcPoint = { id: string; name: string; email: string; sectorId: string };
export type Sector = { id: string; name: string };


export type ConventionDocument = {
id: string;
conventionId: string;
kind: "PREFILL" | "SIGNED" | "OTHER";
fileName: string;
path: string;
mime: string;
size: number;
checksum: string;
uploadedById: string | null;
createdAt: string;
};


export type Convention = {
id: string;
gtcPointId: string;
sectorId: string;
status: ConventionStatus;
internalSalesRep?: string | null;
createdAt: string;
updatedAt: string;
gtcPoint?: GtcPoint;
sector?: Sector;
documents?: ConventionDocument[];
};
```

# apps/web/src/lib/utils.ts
```
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


```

# apps/web/src/providers/auth-provider.tsx
```
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
  initialized: boolean;
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
  const [initialized, setInitialized] = useState(false);

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
    // mark init done regardless of success so consumers can act
    setInitialized(true);
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
    () => ({
      user,
      token,
      isAuthed: Boolean(user && token),
      initialized,
      login,
      logout,
    }),
    [user, token, initialized]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

```

# apps/web/src/providers/query-provider.tsx
```
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

# apps/web/src/providers/socket-provider.tsx
```
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";

type Notification = {
  id: string;
  userId: string;
  type: string;
  subject: string;
  contentHtml?: string | null;
  read: boolean;
  createdAt: string;
};

const SocketCtx = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthed } = useAuth();
  const qc = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuthed || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token },
      transports: ["websocket"],
    });

    setSocket(s);

    // New notification came in
    s.on("notify:new", (_n: Notification) => {
      // Keep it simple: refresh unread, let the feed refetch on open or via manual refresh
      qc.invalidateQueries({ queryKey: ["me", "unread"] });
      // If the feed is open, we can also invalidate it:
      // qc.invalidateQueries({ queryKey: ["me", "notifications"] });
    });

    // Server-pushed unread badge count
    s.on("badge:update", (p: { unread: number }) => {
      qc.setQueryData<number>(["me", "unread"], p.unread);
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, token]);

  const value = useMemo(() => socket, [socket]);
  return <SocketCtx.Provider value={value}>{children}</SocketCtx.Provider>;
}

export function useSocket() {
  return useContext(SocketCtx);
}

```































