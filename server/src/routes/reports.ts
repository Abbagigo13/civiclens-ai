import { Router, type Request } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { getStore } from "../services/reportsStore.js";
import { imageFileFilter } from "./analysis.js";
import { requireApiKey } from "../middleware/auth.js";

const router = Router();

// Report ids reach the filesystem for photo storage, so only the
// server-generated shape is accepted there — never raw URL text.
const reportIdPattern = /^CL-[0-9A-Z]{6}$/;

function hasSafeReportId(id: unknown): id is string {
  return typeof id === "string" && reportIdPattern.test(id);
}

// Single-segment route params are always strings in practice; a
// non-string id can never match a report, so treat it as missing.
function requestId(req: Request): string | null {
  const id = req.params.id;
  return typeof id === "string" ? id : null;
}

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
  fileFilter: imageFileFilter,
});

// Reports are cheap to serve but unauthenticated,
// so each IP gets a bounded number of requests per minute.
const reportsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again shortly.",
  },
});

router.use(reportsLimiter);

router.post("/reports", requireApiKey, (req, res) => {
  const report = getStore().createReport(req.body);

  res.status(201).json({ report });
});

router.get("/reports", (_req, res) => {
  res.json({ reports: getStore().listReports() });
});

router.get("/activity", (req, res) => {
  const raw = req.query.limit;
  const limit =
    typeof raw === "string" && raw.trim() !== "" ? Number(raw) : 20;

  res.json({ activity: getStore().listActivity(limit) });
});

router.get("/reports/:id", (req, res) => {
  const id = requestId(req);
  const report = id === null ? null : getStore().getReport(id);

  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  res.json({
    report,
    history: getStore().getHistory(report.id),
  });
});

router.patch("/reports/:id/status", requireApiKey, (req, res) => {
  const body = req.body as { status?: unknown };
  const id = requestId(req);
  const report =
    id === null ? null : getStore().updateStatus(id, body?.status);

  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  res.json({ report });
});

router.patch("/reports/:id/priority", requireApiKey, (req, res) => {
  const body = req.body as { priority?: unknown };
  const id = requestId(req);
  const report =
    id === null ? null : getStore().updatePriority(id, body?.priority);

  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  res.json({ report });
});

router.post(
  "/reports/:id/photo",
  requireApiKey,
  photoUpload.single("photo"),
  (req, res) => {
    const id = req.params.id;

    if (!hasSafeReportId(id)) {
      res.status(400).json({ error: "Invalid report id." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Upload a photo." });
      return;
    }

    const report = getStore().setPhoto(
      id,
      req.file.buffer,
      req.file.mimetype,
    );

    if (!report) {
      res.status(404).json({ error: "Report not found." });
      return;
    }

    res.status(201).json({ report });
  },
);

router.get("/reports/:id/photo", (req, res) => {
  const id = req.params.id;

  if (!hasSafeReportId(id)) {
    res.status(400).json({ error: "Invalid report id." });
    return;
  }

  const photo = getStore().getPhoto(id);

  if (!photo) {
    res.status(404).json({ error: "Photo not found." });
    return;
  }

  res.setHeader("Content-Type", photo.mime);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.send(photo.data);
});

router.delete("/reports/:id", requireApiKey, (req, res) => {
  const id = requestId(req);
  const deleted = id === null ? false : getStore().deleteReport(id);

  if (!deleted) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  res.status(204).end();
});

export default router;
