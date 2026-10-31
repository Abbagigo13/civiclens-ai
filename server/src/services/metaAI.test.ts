import { describe, it } from "node:test";
import assert from "node:assert/strict";

// The module requires a key at import time. Parsing never touches
// the network, so a dummy key is enough for these unit tests.
process.env.MODEL_API_KEY ??= "unit-test-dummy-key";

const { parseAnalysis } = await import("./metaAI.js");

function validPayload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    issueDetected: true,
    category: "Road Damage",
    title: "Pothole on residential street",
    description: "A large pothole is visible in the road surface.",
    severity: "High",
    confidence: 0.8,
    visibleEvidence: ["Broken asphalt", "Standing water"],
    limitations: ["Extent beyond the frame is unknown"],
    ...overrides,
  });
}

describe("parseAnalysis", () => {
  it("keeps a valid analysis unchanged", () => {
    const result = parseAnalysis(validPayload());

    assert.equal(result.issueDetected, true);
    assert.equal(result.category, "Road Damage");
    assert.equal(result.severity, "High");
    assert.equal(result.confidence, 0.8);
    assert.deepEqual(result.visibleEvidence, [
      "Broken asphalt",
      "Standing water",
    ]);
  });

  it("strips markdown fences around the JSON", () => {
    const result = parseAnalysis(
      "```json\n" + validPayload() + "\n```",
    );

    assert.equal(result.category, "Road Damage");
    assert.equal(result.title, "Pothole on residential street");
  });

  it("falls back to Uncertain for unknown category and severity", () => {
    const result = parseAnalysis(
      validPayload({ category: "Aliens", severity: "Extreme" }),
    );

    assert.equal(result.category, "Uncertain");
    assert.equal(result.severity, "Uncertain");
  });

  it("rejects confidence outside 0 to 1", () => {
    assert.equal(
      parseAnalysis(validPayload({ confidence: 5 })).confidence,
      null,
    );
    assert.equal(
      parseAnalysis(validPayload({ confidence: "high" })).confidence,
      null,
    );
  });

  it("truncates long titles and descriptions", () => {
    const result = parseAnalysis(
      validPayload({
        title: "t".repeat(500),
        description: "d".repeat(5000),
      }),
    );

    assert.equal(result.title.length, 160);
    assert.equal(result.description.length, 1500);
  });

  it("caps evidence lists and drops non-string entries", () => {
    const result = parseAnalysis(
      validPayload({
        visibleEvidence: [
          "a", "b", 42, "c", "d", "e", "f", "g", "h", "i", "j", null,
        ],
      }),
    );

    assert.deepEqual(result.visibleEvidence, [
      "a", "b", "c", "d", "e", "f", "g", "h",
    ]);
  });

  it("throws when required fields are missing", () => {
    assert.throws(
      () => parseAnalysis(JSON.stringify({ category: "Flooding" })),
      /missing required fields/,
    );
  });

  it("throws when there is no JSON object", () => {
    assert.throws(
      () => parseAnalysis("no infrastructure issues here"),
      /invalid analysis response/,
    );
  });
});
