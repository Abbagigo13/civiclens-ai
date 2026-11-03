import "dotenv/config";

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import analysisRouter from "./routes/analysis.js";
import reportsRouter from "./routes/reports.js";

const app = express();

// Behind the host proxy (Render) the real client IP is in
// X-Forwarded-For; trusting one proxy hop lets the rate limiter
// identify users correctly.
app.set("trust proxy", 1);

const port = Number(process.env.PORT || 3001);

const clientOrigins = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");

// Security headers. Helmet's default CSP only allows same-origin
// images/connections, which blocks Leaflet tile images and the
// Nominatim location search in production, so allow those hosts.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.basemaps.cartocdn.com",
          "https://*.tile.openstreetmap.fr",
          "https://tile.openstreetmap.org",
        ],
        connectSrc: ["'self'", "https://nominatim.openstreetmap.org"],
      },
    },
  }),
);

app.use(
  cors({
    origin: clientOrigins,
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "CivicLens AI API",
    access: "open",
    timestamp: new Date().toISOString(),
  });
});

// Reports carry metadata only (photos stay in the browser),
// so a small JSON body limit is enough.
app.use(express.json({ limit: "256kb" }));

app.use("/api", analysisRouter);
app.use("/api", reportsRouter);

// In production the built frontend sits in dist/. When present, serve
// it and fall back to index.html for client-side routes. API routes
// are registered first, so they always win over static files.
const distDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
);

if (existsSync(join(distDir, "index.html"))) {
  app.use(express.static(distDir));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(join(distDir, "index.html"));
  });
}

// Only errors explicitly marked with statusCode 400 carry a message
// that is safe to show. Everything else becomes a generic 500 so
// internal details never leak to clients.
function isTrustedClientError(error: Error): boolean {
  return (
    (error as { statusCode?: unknown }).statusCode === 400
  );
}

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    void _next;

    if (
      error instanceof Error &&
      error.name === "MulterError"
    ) {
      res.status(400).json({
        error:
          error.message === "File too large"
            ? "Image must be 8 MB or smaller."
            : "The uploaded file could not be accepted.",
      });

      return;
    }

    if (
      error instanceof SyntaxError &&
      (error as { status?: unknown }).status === 400
    ) {
      res.status(400).json({
        error: "Request body must be valid JSON.",
      });

      return;
    }

    if (
      error instanceof Error &&
      (error as { type?: unknown }).type === "entity.too.large"
    ) {
      res.status(400).json({
        error: "Request body is too large.",
      });

      return;
    }

    if (error instanceof Error && isTrustedClientError(error)) {
      res.status(400).json({
        error: error.message,
      });

      return;
    }

    console.error(
      "Unhandled server error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    res.status(500).json({
      error: "An unexpected server error occurred.",
    });
  },
);

app.listen(port, () => {
  console.log(`CivicLens API running at http://localhost:${port}`);
  console.log(`Frontend origins: ${clientOrigins.join(", ")}`);
  const dbPath = process.env.REPORTS_DB_PATH || "data/civiclens.db";
  console.log(`Reports database: ${dbPath}`);
  if (process.env.NODE_ENV === "production" && !dbPath.startsWith("/data")) {
    console.warn(
      "Warning: reports database is not under /data; without a " +
        "persistent disk this data is lost on redeploy/restart.",
    );
  }

  console.log(
    "Access: open — anyone can file, browse and update reports. " +
      "Rate limits still apply.",
  );
});
