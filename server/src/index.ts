import "dotenv/config";

import express from "express";
import cors from "cors";

import analysisRouter from "./routes/analysis.js";

const app = express();

const port = Number(process.env.PORT || 3001);

const clientOrigin =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.disable("x-powered-by");

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

    if (error instanceof Error) {
      res.status(400).json({
        error: error.message,
      });

      return;
    }

    res.status(500).json({
      error: "An unexpected server error occurred.",
    });
  },
);

app.listen(port, () => {
  console.log(`CivicLens API running at http://localhost:${port}`);
  console.log(`Frontend origin: ${clientOrigin}`);
});