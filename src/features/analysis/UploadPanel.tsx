import { useRef, useState } from "react";
import {
ArrowRight,
CheckCircle2,
FileImage,
ImagePlus,
LoaderCircle,
Sparkles,
Upload,
X,
} from "lucide-react";
import { motion } from "framer-motion";

export type AIAnalysis = {
issueDetected: boolean;
category: string;
title: string;
description: string;
severity: "Low" | "Medium" | "High" | "Critical" | "Uncertain";
confidence: number | null;
visibleEvidence: string[];
limitations: string[];
};

type Props = {
onAnalyzed: (file: File, preview: string, analysis: AIAnalysis) => void;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function UploadPanel({ onAnalyzed }: Props) {
const inputRef = useRef<HTMLInputElement>(null);
const [file, setFile] = useState<File | null>(null);
const [preview, setPreview] = useState("");
const [busy, setBusy] = useState(false);
const [error, setError] = useState("");

function selectFile(nextFile?: File) {
if (!nextFile) return;
if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
  setError("Choose a JPG, PNG, or WebP image.");
  return;
}

if (nextFile.size > 8 * 1024 * 1024) {
  setError("This image is larger than 8 MB. Choose a smaller file.");
  return;
}

if (preview) URL.revokeObjectURL(preview);

setError("");
setFile(nextFile);
setPreview(URL.createObjectURL(nextFile));

}

async function analyze() {
if (!file || !preview || busy) return;
setBusy(true);
setError("");

try {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  const payload: {
    success?: boolean;
    analysis?: AIAnalysis;
    error?: string;
  } = await response.json();

  if (!response.ok || !payload.success || !payload.analysis) {
    throw new Error(
      payload.error || "AI analysis failed. Please try again.",
    );
  }

  onAnalyzed(file, preview, payload.analysis);
} catch (err) {
  console.error("CivicLens AI analysis error:", err);

  setError(
    err instanceof Error
      ? err.message
      : "Could not analyze the image. Check your connection and try again.",
  );
} finally {
  setBusy(false);
}

}

function reset() {
if (preview) URL.revokeObjectURL(preview);
setFile(null);
setPreview("");
setError("");

if (inputRef.current) inputRef.current.value = "";

}

return ( <section className="upload-card" id="upload"> <div className="upload-card-heading"> <div> <span className="eyebrow">AI-POWERED IMAGE ANALYSIS</span> <h2>Every image tells a story.</h2> <p>Turn visible infrastructure problems into reviewable reports.</p> </div>
    <div className="upload-sparkle">
      <Sparkles size={21} />
    </div>
  </div>

  <input
    ref={inputRef}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    hidden
    onChange={(event) => selectFile(event.target.files?.[0])}
  />

  {preview ? (
    <motion.div
      className="selected-image-panel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <img src={preview} alt="Selected infrastructure" />

      <div className="selected-image-details">
        <span className="file-ready">
          <CheckCircle2 size={15} /> IMAGE READY
        </span>

        <strong>{file?.name}</strong>

        <span>
          {((file?.size || 0) / 1024 / 1024).toFixed(2)} MB · Ready for analysis
        </span>

        <div className="selected-actions">
          <button
            className="button-secondary"
            onClick={reset}
            disabled={busy}
          >
            <X size={15} /> Remove
          </button>

          <button
            className="button-primary"
            onClick={analyze}
            disabled={busy}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={16} />
                Analyzing with Meta AI…
              </>
            ) : (
              <>
                Analyze image <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  ) : (
    <button
      type="button"
      className="dropzone"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        selectFile(event.dataTransfer.files?.[0]);
      }}
    >
      <span className="upload-icon">
        <ImagePlus size={29} />
        <span className="upload-plus">+</span>
      </span>

      <strong>Drop your image here, or browse</strong>

      <span className="dropzone-subtitle">
        Photos of roads, drainage, waste and public infrastructure
      </span>

      <span className="upload-formats">
        <FileImage size={14} /> JPG, PNG, WEBP <i /> MAX 8 MB
      </span>

      <span className="browse-button">
        <Upload size={15} /> Choose an image
      </span>
    </button>
  )}

  {error && (
    <p className="form-error" role="alert">
      {error}
    </p>
  )}

  <div className="upload-footnote">
    <span className="privacy-mark">
      <CheckCircle2 size={13} />
    </span>

    <span>
      Your image is sent to Meta AI through the CivicLens backend for
      analysis. Review the result before saving your report.
    </span>
  </div>
</section>

);
}
