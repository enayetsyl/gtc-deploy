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
