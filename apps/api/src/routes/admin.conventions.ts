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
