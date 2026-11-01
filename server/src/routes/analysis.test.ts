import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";

// The route pulls in the Meta client, which requires a key at import
// time. The handler itself is injected with a fake, so a dummy key is
// enough and these tests never touch the network.
process.env.MODEL_API_KEY ??= "unit-test-dummy-key";

const { createAnalyzeHandler, imageFileFilter } = await import(
  "./analysis.js"
);

function mockResponse() {
  const calls = { status: 200, body: undefined as unknown };

  const res = {} as {
    status: (code: number) => Response;
    json: (payload: unknown) => Response;
  };

  res.status = (code: number) => {
    calls.status = code;
    return res as unknown as Response;
  };

  res.json = (payload: unknown) => {
    calls.body = payload;
    return res as unknown as Response;
  };

  return { res: res as unknown as Response, calls };
}

function filterDecision(mimetype: string): {
  error: Error | null;
  accepted: boolean;
} {
  let error: Error | null = null;
  let accepted = false;

  imageFileFilter(
    {} as Request,
    { mimetype } as Express.Multer.File,
    (result: Error | null, accept?: boolean) => {
      error = result;
      accepted = accept === true;
    },
  );

  return { error, accepted };
}

const fakeAnalysis = {
  issueDetected: true,
  category: "Road Damage",
  title: "Pothole on residential street",
  description: "A large pothole is visible in the road surface.",
  severity: "High" as const,
  confidence: 0.8,
  visibleEvidence: ["Broken asphalt"],
  limitations: ["Extent beyond the frame is unknown"],
};

describe("analyze route", () => {
  it("accepts JPG, PNG, and WebP uploads", () => {
    for (const mimetype of [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]) {
      const { error, accepted } = filterDecision(mimetype);
      assert.equal(error, null);
      assert.equal(accepted, true);
    }
  });

  it("rejects other file types with a 400 error", () => {
    const { error, accepted } = filterDecision("image/gif");

    assert.equal(accepted, false);
    assert.equal(
      (error as unknown as { statusCode?: unknown }).statusCode,
      400,
    );
  });

  it("returns 400 without an uploaded file", async () => {
    const handler = createAnalyzeHandler(async () => {
      throw new Error("analyzer must not be called without a file");
    });
    const { res, calls } = mockResponse();

    await handler({} as Request, res);

    assert.equal(calls.status, 400);
    assert.deepEqual(calls.body, {
      error: "Upload an image to analyze.",
    });
  });

  it("returns the analysis on success", async () => {
    let receivedDataUrl = "";
    const handler = createAnalyzeHandler(async (imageDataUrl: string) => {
      receivedDataUrl = imageDataUrl;
      return fakeAnalysis;
    });
    const { res, calls } = mockResponse();

    await handler(
      {
        file: {
          mimetype: "image/png",
          buffer: Buffer.from([1, 2, 3]),
        },
      } as unknown as Request,
      res,
    );

    assert.equal(calls.status, 200);
    assert.deepEqual(calls.body, {
      success: true,
      model: process.env.META_MODEL || "muse-spark-1.3",
      analysis: fakeAnalysis,
    });
    assert.match(receivedDataUrl, /^data:image\/png;base64,/);
  });

  it("maps analyzer failures to a sanitized 502", async () => {
    const handler = createAnalyzeHandler(async () => {
      throw new Error("model exploded with internal details");
    });
    const { res, calls } = mockResponse();

    await handler(
      {
        file: {
          mimetype: "image/jpeg",
          buffer: Buffer.from([1]),
        },
      } as unknown as Request,
      res,
    );

    assert.equal(calls.status, 502);
    assert.deepEqual(calls.body, {
      error: "Image analysis failed. Please try again shortly.",
    });
  });
});
