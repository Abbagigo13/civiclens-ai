import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";

import analysisRouter from "./routes/analysis.js";

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
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", analysisRouter);

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
});
