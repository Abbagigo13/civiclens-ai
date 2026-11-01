import "dotenv/config";

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import analysisRouter from "./routes/analysis.js";
import reportsRouter from "./routes/reports.js";
import { isAuthEnabled } from "./middleware/auth.js";

const app = express();

const port = Number(process.env.PORT || 3001);

const clientOrigin =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.disable("x-powered-by");

// Security headers. The frontend calls this API cross-origin,
// so resource policy must allow cross-origin responses.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: clientOrigin,
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "CivicLens AI API",
    auth: isAuthEnabled() ? "enabled" : "disabled",
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
  console.log(`Frontend origin: ${clientOrigin}`);

  if (isAuthEnabled()) {
    console.log("API key auth: enabled (writes require a key).");
  } else {
    console.warn(
      "API_KEY is not set — write endpoints are open. " +
        "Set API_KEY to require authentication.",
    );
  }
});
