import { describe, it } from "node:test";
import assert from "node:assert/strict";

// The module requires a key at import time. Parsing never touches
// the network, so a dummy key is enough for these unit tests.
process.env.MODEL_API_KEY ??= "unit-test-dummy-key";

const {
  parseAnalysis,
  getMetaModel,
  getModelApiKey,
  analyzeWithProtocols,
  buildMessagesRequest,
  buildResponsesRequest,
  extractMessagesText,
  extractResponsesText,
} = await import("./metaAI.js");

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

describe("Meta env sanitization", () => {
  it("strips wrapping quotes and spaces from the model name", () => {
    assert.equal(getMetaModel(' "muse-spark-1.3" '), "muse-spark-1.3");
    assert.equal(getMetaModel("muse-spark-1.3"), "muse-spark-1.3");
  });

  it("falls back to the default model when unset or blank", () => {
    assert.equal(getMetaModel(""), "muse-spark-1.3");
    assert.equal(getMetaModel(undefined), "muse-spark-1.3");
  });

  it("strips wrapping quotes and spaces from the API key", () => {
    assert.equal(getModelApiKey(' "abc123" '), "abc123");
    assert.equal(getModelApiKey(""), "");
  });
});

describe("dual-protocol analysis router", () => {
  const image = "data:image/png;base64,QUJD";

  it("uses Responses output_text and sends image + reasoning effort", async () => {
    const req = buildResponsesRequest("muse-spark-1.3", image) as {
      model: string;
      reasoning?: { effort?: string };
      input: { content: { type: string; image_url?: string }[] }[];
    };
    assert.equal(req.model, "muse-spark-1.3");
    assert.equal(req.reasoning?.effort, "low");
    assert.equal(req.input[0].content[1].type, "input_image");
    assert.equal(req.input[0].content[1].image_url, image);

    let messagesCalls = 0;
    const result = await analyzeWithProtocols(
      image,
      {
        responses: async () => extractResponsesText({ output_text: validPayload() }),
        messages: async () => {
          messagesCalls += 1;
          return "";
        },
      },
      "muse-spark-1.3",
    );
    assert.equal(result.category, "Road Damage");
    assert.equal(messagesCalls, 0);
  });

  it("extracts text from structured Responses and Messages content", () => {
    assert.equal(
      extractResponsesText({
        output: [{ content: [{ type: "output_text", text: "hi" }] }],
      }),
      "hi",
    );
    assert.equal(
      extractMessagesText({
        content: [
          { type: "tool_use" },
          { type: "text", text: "hello" },
        ],
      }),
      "hello",
    );
  });

  it("falls back to Messages when Responses throws", async () => {
    const result = await analyzeWithProtocols(
      image,
      {
        responses: async () => {
          throw new Error("404 model not found on responses");
        },
        messages: async () =>
          extractMessagesText({
            content: [{ type: "text", text: validPayload() }],
          }),
      },
      "muse-spark-1.3",
    );
    assert.equal(result.title, "Pothole on residential street");
  });

  it("falls back to Messages on empty or non-JSON Responses content", async () => {
    for (const bad of ["", "   ", "no json here"]) {
      const result = await analyzeWithProtocols(
        image,
        {
          responses: async () => bad,
          messages: async () => validPayload(),
        },
        "muse-spark-1.3",
      );
      assert.equal(result.category, "Road Damage");
    }
  });

  it("builds a Messages request with base64 image and no reasoning_effort", () => {
    const req = buildMessagesRequest("muse-spark-1.3", image) as unknown as {
      model: string;
      messages: { content: Record<string, unknown>[] }[];
    };
    assert.equal(req.model, "muse-spark-1.3");
    assert.equal(JSON.stringify(req).includes("reasoning_effort"), false);
    const img = req.messages[0].content[1] as {
      type: string;
      source: { type: string; media_type: string; data: string };
    };
    assert.equal(img.type, "image");
    assert.deepEqual(img.source, {
      type: "base64",
      media_type: "image/png",
      data: "QUJD",
    });
  });

  it("throws with both protocol errors when both fail", async () => {
    await assert.rejects(
      analyzeWithProtocols(
        image,
        {
          responses: async () => {
            throw new Error("responses boom");
          },
          messages: async () => {
            throw new Error("messages boom");
          },
        },
        "muse-spark-1.3",
      ),
      /responses boom.*messages boom/,
    );
  });
});

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
