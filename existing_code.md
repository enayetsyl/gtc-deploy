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

# c:/EForgeIT/gtc/apps/api/src/lib/mailer.ts

```
import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "127.0.0.1",
  port: Number(process.env.MAIL_PORT || 1025),
  secure: false,
});

```

# c:/EForgeIT/gtc/apps/api/src/queues/email.ts

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

# c:/EForgeIT/gtc/apps/api/src/queues/worker.ts

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

# c:/EForgeIT/gtc/apps/api/src/routes/health.ts

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

# c:/EForgeIT/gtc/apps/api/src/routes/notifications.me.ts

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

# c:/EForgeIT/gtc/apps/api/src/services/notification.ts

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

# c:/EForgeIT/gtc/apps/api/src/sockets/index.ts

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

# c:/EForgeIT/gtc/apps/api/src/sockets/io.ts

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

# c:/EForgeIT/gtc/apps/api/src/routes/admin.conventions.ts

```typescript
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { onConventionDecision } from "../services/conventions";

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
    include: {
      gtcPoint: true,
      sector: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
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
  if (!body.success)
    return res
      .status(400)
      .json({ error: "ValidationError", issues: body.error.issues });

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
```

# c:/EForgeIT/gtc/apps/api/src/routes/conventions.ts

```typescript
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
  sectorId: z.string().uuid().optional(), // admin may specify
});
conventionsRouter.post(
  "/",
  requireRole("GTC_POINT", "ADMIN"),
  async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "ValidationError", issues: parsed.error.issues });

    let { gtcPointId, sectorId } = parsed.data;

    // If GTC_POINT user, derive from their mapping
    if (req.user!.role === "GTC_POINT") {
      const me = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { gtcPoint: { include: { sector: true } } },
      });
      if (!me?.gtcPoint)
        return res
          .status(409)
          .json({ error: "User is not attached to a GTC Point" });
      gtcPointId = me.gtcPoint.id;
      sectorId = me.gtcPoint.sectorId;
    } else {
      // admin path: both ids required
      if (!gtcPointId || !sectorId)
        return res
          .status(400)
          .json({ error: "gtcPointId and sectorId are required for admin" });
    }

    const conv = await prisma.convention.create({
      data: {
        gtcPointId: gtcPointId!,
        sectorId: sectorId!,
        status: "NEW" as any,
      },
    });
    res.status(201).json(conv);
  }
);

// 4.2 Prefill PDF (no DB write) – return a flattened simple PDF
const prefillSchema = z.object({
  applicantName: z.string().min(1).optional(),
  pointName: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
});
conventionsRouter.post(
  "/prefill",
  requireRole("GTC_POINT", "ADMIN"),
  async (req, res) => {
    const parsed = prefillSchema.safeParse(req.body || {});
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "ValidationError", issues: parsed.error.issues });

    let pointName = parsed.data.pointName;
    if (!pointName && req.user!.role === "GTC_POINT") {
      const me = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { gtcPoint: true },
      });
      pointName = me?.gtcPoint?.name || undefined;
    }

    const pdf = await buildPrefillPdf({
      title: parsed.data.title,
      applicantName: parsed.data.applicantName,
      pointName,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="convention-prefill.pdf"`
    );
    res.send(pdf);
  }
);

// 4.3 Upload signed convention file → stores file + creates ConventionDocument + update status + notify admins
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
}); // 15MB

conventionsRouter.post(
  "/:id/upload",
  requireRole("GTC_POINT", "ADMIN"),
  upload.single("file"),
  async (req, res) => {
    const id = req.params.id;
    const conv = await prisma.convention.findUnique({
      where: { id },
      include: { gtcPoint: true, sector: true },
    });
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
    if (!file)
      return res
        .status(400)
        .json({ error: "file is required (multipart/form-data)" });

    if (conv.status === "APPROVED" || conv.status === "DECLINED") {
      return res
        .status(409)
        .json({ error: "Convention is finalized; uploads are locked" });
    }

    const was = conv.status;

    // PDF magic bytes: %PDF
    const b = file.buffer;
    const isPdfMagic =
      b.length >= 4 &&
      b[0] === 0x25 &&
      b[1] === 0x50 &&
      b[2] === 0x44 &&
      b[3] === 0x46;
    if (!isPdfMagic)
      return res
        .status(400)
        .json({ error: "File does not look like a valid PDF" });

    const mime =
      file.mimetype ||
      mimeLookup(file.originalname) ||
      "application/octet-stream";
    if (!String(mime).startsWith("application/pdf")) {
      return res.status(400).json({ error: "Only PDF uploads are allowed" });
    }

    const stored = await storage.put({
      buffer: file.buffer,
      mime: String(mime),
      originalName: file.originalname,
    });

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
        await tx.convention.update({
          where: { id: conv.id },
          data: { status: "UPLOADED" },
        });
        changed = true;
      }
      return { doc: created, statusChanged: changed };
    });

    if (statusChanged) {
      await onConventionUploaded(conv.id);
    }

    res
      .status(201)
      .json({ ok: true, document: doc, downloadUrl: `/uploads${stored.path}` });
  }
);

// 4.4 List my conventions (point sees own, admin sees all)
conventionsRouter.get(
  "/",
  requireRole("GTC_POINT", "ADMIN"),
  async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.pageSize ?? 20))
    );

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
        include: {
          gtcPoint: true,
          sector: true,
          documents: { orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.convention.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  }
);

// list documents for a convention
conventionsRouter.get(
  "/:id/documents",
  requireRole("GTC_POINT", "ADMIN"),
  async (req, res) => {
    const id = req.params.id;
    const docConv = await prisma.convention.findUnique({
      where: { id },
      include: {
        gtcPoint: { include: { users: { select: { id: true } } } },
        documents: true,
      },
    });
    if (!docConv)
      return res.status(404).json({ error: "Convention not found" });

    if (req.user!.role !== "ADMIN") {
      const allowed = docConv.gtcPoint.users.some((u) => u.id === req.user!.id);
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ items: docConv.documents });
  }
);

// download a single document (auth-checked)
conventionsRouter.get(
  "/:id/documents/:docId/download",
  requireRole("GTC_POINT", "ADMIN"),
  async (req, res) => {
    const { id, docId } = req.params;
    const doc = await prisma.conventionDocument.findUnique({
      where: { id: docId },
      include: {
        convention: {
          include: {
            gtcPoint: { include: { users: { select: { id: true } } } },
          },
        },
      },
    });
    if (!doc || doc.conventionId !== id)
      return res.status(404).json({ error: "Document not found" });

    if (req.user!.role !== "ADMIN") {
      const allowed = doc.convention.gtcPoint.users.some(
        (u) => u.id === req.user!.id
      );
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    const absPath = path.resolve("uploads", "." + doc.path); // same folder you already use
    try {
      await fs.access(absPath);
    } catch {
      return res.status(410).json({ error: "File missing from storage" });
    }

    res.setHeader("Content-Type", doc.mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${doc.fileName}"`
    );
    res.sendFile(absPath);
  }
);
```

# c:/EForgeIT/gtc/apps/api/src/services/conventions.ts

```typescript
import { prisma } from "../lib/prisma";
import { notifyUser, notifyUsers } from "./notifications";

export async function getAdmins() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" as any },
    select: { id: true, email: true },
  });
  return admins.map((a) => a.id);
}

export async function getPointUsers(gtcPointId: string) {
  const users = await prisma.user.findMany({
    where: { gtcPointId },
    select: { id: true },
  });
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

export async function onConventionDecision(
  conventionId: string,
  approved: boolean,
  internalSalesRep?: string
) {
  const c = await prisma.convention.findUnique({
    where: { id: conventionId },
    include: { gtcPoint: true, sector: true },
  });
  if (!c) return;

  const subject = `Convention ${approved ? "APPROVED" : "DECLINED"}: ${
    c.gtcPoint.name
  }`;
  const html = `<p>Your convention has been <b>${
    approved ? "APPROVED" : "DECLINED"
  }</b>.</p>
<p><b>Convention ID:</b> ${c.id}${
    internalSalesRep
      ? `<br/><b>Internal Sales Rep:</b> ${internalSalesRep}`
      : ""
  }</p>`;

  const pointUsers = await getPointUsers(c.gtcPointId);
  await notifyUsers(pointUsers, {
    type: "CONVENTION_STATUS",
    subject,
    contentHtml: html,
  });
}
```

# c:/EForgeIT/gtc/apps/api/src/storage/provider.ts

```typescript
import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import sanitize from "sanitize-filename";

const ROOT = process.env.FILE_STORAGE_ROOT || "./uploads";

export type StoredFile = {
  fileName: string; // the final stored file name (uuid-original)
  path: string; // relative path under uploads, e.g. /2025/09/uuid-name.pdf
  mime: string;
  size: number;
  checksum: string; // sha256
};

export interface IStorage {
  put(opts: {
    buffer: Buffer;
    mime: string;
    originalName: string;
  }): Promise<StoredFile>;
  remove(relPath: string): Promise<void>;
}

export class LocalStorage implements IStorage {
  async put({
    buffer,
    mime,
    originalName,
  }: {
    buffer: Buffer;
    mime: string;
    originalName: string;
  }): Promise<StoredFile> {
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

# c:/EForgeIT/gtc/apps/api/src/utils/pdf.ts

```typescript
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildPrefillPdf(fields: {
  title?: string; // e.g. "GTC Convention"
  applicantName?: string; // optional
  pointName?: string; // optional
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
  page.drawRectangle({
    x: 50,
    y: 620,
    width: 220,
    height: 50,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText("Signature (after print & sign):", {
    x: 55,
    y: 675,
    size: 10,
    font,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
```
