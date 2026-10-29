import { Router } from "express";
import multer from "multer";
import {
  analyzeInfrastructureImage,
} from "../services/metaAI.js";

const router = Router();

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new Error("Only JPG, PNG, and WebP images are supported."),
      );
      return;
    }

    callback(null, true);
  },
});

router.post(
  "/analyze",
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({
        error: "Upload an image to analyze.",
      });
      return;
    }

    try {
      const imageDataUrl =
        `data:${req.file.mimetype};base64,` +
        req.file.buffer.toString("base64");

      const analysis =
        await analyzeInfrastructureImage(imageDataUrl);

      res.json({
        success: true,
        model: process.env.META_MODEL || "muse-spark-1.3",
        analysis,
      });
    } catch (error) {
      console.error(
        "Infrastructure analysis failed:",
        error instanceof Error ? error.message : "Unknown error",
      );

      res.status(502).json({
        error:
          "Image analysis failed. Please try again shortly.",
      });
    }
  },
);

export default router;