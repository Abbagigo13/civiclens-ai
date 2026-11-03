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
  createMessagesText,
  extractMessagesText,
  extractResponsesText,
  MetaApiError,
  DualProtocolError,
  toProtocolDiagnostic,
} = await import("./metaAI.js");

const { APIError } = await import("openai");

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

  it("preserves status and code from both protocols when both fail", async () => {
    const responsesError = new MetaApiError("404 model missing", {
      status: 404,
      code: "model_not_found",
      protocol: "responses",
    });
    const messagesError = new MetaApiError("400 bad image param", {
      status: 400,
      code: null,
      param: "messages",
      errorType: "invalid_request_error",
      protocol: "messages",
    });
    await assert.rejects(
      analyzeWithProtocols(
        image,
        {
          responses: async () => {
            throw responsesError;
          },
          messages: async () => {
            throw messagesError;
          },
        },
        "muse-spark-1.3",
      ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        const diagnostics = (
          error as { diagnostics?: unknown }
        ).diagnostics as {
          protocol: string;
          status?: number;
          code?: string | null;
          param?: string | null;
          type?: string | null;
          message: string;
        }[];
        assert.equal(diagnostics.length, 2);
        assert.deepEqual(
          diagnostics.map((d) => [d.protocol, d.status, d.code]),
          [
            ["responses", 404, "model_not_found"],
            ["messages", 400, null],
          ],
        );
        assert.equal(diagnostics[1].param, "messages");
        assert.equal(diagnostics[1].type, "invalid_request_error");
        assert.match(error.message, /404 model missing/);
        assert.match(error.message, /400 bad image param/);
        return true;
      },
    );
  });

  it("keeps both underlying protocol errors accessible", async () => {
    const responsesError = new Error("responses boom");
    const messagesError = new Error("messages boom");
    await assert.rejects(
      analyzeWithProtocols(
        image,
        {
          responses: async () => {
            throw responsesError;
          },
          messages: async () => {
            throw messagesError;
          },
        },
        "muse-spark-1.3",
      ),
      (error: unknown) => {
        assert.ok(error instanceof DualProtocolError);
        const dual = error as InstanceType<typeof DualProtocolError>;
        assert.equal(dual.responsesError, responsesError);
        assert.equal(dual.messagesError, messagesError);
        assert.deepEqual(dual.errors, [responsesError, messagesError]);
        // Backward compatibility: cause stays the Messages error.
        assert.equal(dual.cause, messagesError);
        assert.equal(dual.diagnostics.length, 2);
        return true;
      },
    );
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

describe("Messages API HTTP contract", () => {
  const image = "data:image/png;base64,QUJD";

  function stubFetch(status: number, body: string, capture?: (url: string, init: RequestInit) => void) {
    return (async (url: string, init: RequestInit) => {
      capture?.(url, init);
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => body,
      };
    }) as unknown as typeof fetch;
  }

  it("sends Bearer auth and no Anthropic-only headers", async () => {
    let seenUrl = "";
    let seenInit: RequestInit | undefined;
    const text = await createMessagesText(
      "muse-spark-1.3",
      image,
      stubFetch(
        200,
        JSON.stringify({ content: [{ type: "text", text: validPayload() }] }),
        (url, init) => {
          seenUrl = url;
          seenInit = init;
        },
      ),
    );
    assert.equal(seenUrl, "https://api.meta.ai/v1/messages");
    const headers = (seenInit?.headers ?? {}) as Record<string, string>;
    const headerNames = Object.keys(headers).map((h) => h.toLowerCase());
    assert.equal(headers.Authorization, "Bearer unit-test-dummy-key");
    assert.equal(headerNames.includes("x-api-key"), false);
    assert.equal(headerNames.includes("anthropic-version"), false);
    assert.equal(text, validPayload());
  });

  it("preserves HTTP 404 model_not_found status and code", async () => {
    await assert.rejects(
      createMessagesText(
        "muse-spark-1.3",
        image,
        stubFetch(
          404,
          JSON.stringify({
            error: {
              message: "The model `muse-spark-1.3` does not exist or is not available",
              type: "invalid_request_error",
              param: null,
              code: "model_not_found",
            },
          }),
        ),
      ),
      (error: unknown) => {
        assert.ok(error instanceof MetaApiError);
        assert.equal((error as InstanceType<typeof MetaApiError>).status, 404);
        assert.equal((error as InstanceType<typeof MetaApiError>).code, "model_not_found");
        assert.match((error as Error).message, /404/);
        assert.match((error as Error).message, /does not exist/);
        return true;
      },
    );
  });

  it("preserves HTTP 400 invalid_request_error param", async () => {
    await assert.rejects(
      createMessagesText(
        "muse-spark-1.3",
        image,
        stubFetch(
          400,
          JSON.stringify({
            error: {
              message: "`messages`: image source is invalid",
              type: "invalid_request_error",
              param: "messages",
              code: null,
            },
          }),
        ),
      ),
      (error: unknown) => {
        assert.ok(error instanceof MetaApiError);
        const e = error as InstanceType<typeof MetaApiError>;
        assert.equal(e.status, 400);
        assert.equal(e.code, null);
        assert.equal(e.param, "messages");
        assert.equal(e.errorType, "invalid_request_error");
        return true;
      },
    );
  });
});

describe("toProtocolDiagnostic with OpenAI SDK errors", () => {
  const headers = new Headers({ "x-request-id": "req_test" });

  it("extracts 404 model_not_found from a real SDK NotFoundError", () => {
    const sdkError = APIError.generate(
      404,
      {
        error: {
          message:
            "The model `muse-spark-1.3` does not exist or is not available",
          type: "invalid_request_error",
          param: null,
          code: "model_not_found",
        },
      },
      undefined,
      headers,
    );
    const diagnostic = toProtocolDiagnostic("responses", sdkError);
    assert.equal(diagnostic.protocol, "responses");
    assert.equal(diagnostic.status, 404);
    assert.equal(diagnostic.code, "model_not_found");
    assert.equal(diagnostic.param, null);
    assert.equal(diagnostic.type, "invalid_request_error");
    assert.match(diagnostic.message, /404/);
    assert.match(diagnostic.message, /does not exist/);
  });

  it("extracts 400 invalid_request_error param from a real SDK BadRequestError", () => {
    const sdkError = APIError.generate(
      400,
      {
        error: {
          message: "`messages`: image source is invalid",
          type: "invalid_request_error",
          param: "messages",
          code: null,
        },
      },
      undefined,
      headers,
    );
    const diagnostic = toProtocolDiagnostic("responses", sdkError);
    assert.equal(diagnostic.status, 400);
    assert.equal(diagnostic.code, null);
    assert.equal(diagnostic.param, "messages");
    assert.equal(diagnostic.type, "invalid_request_error");
  });

  it("falls back to nested error fields when top-level fields are absent", () => {
    const nestedOnly = new Error("404 nested failure") as Error & {
      status?: number;
      error?: unknown;
    };
    nestedOnly.status = 404;
    nestedOnly.error = {
      message: "The model does not exist",
      type: "invalid_request_error",
      param: null,
      code: "model_not_found",
    };
    const diagnostic = toProtocolDiagnostic("responses", nestedOnly);
    assert.equal(diagnostic.status, 404);
    assert.equal(diagnostic.code, "model_not_found");
    assert.equal(diagnostic.param, null);
    assert.equal(diagnostic.type, "invalid_request_error");
  });

  it("omits status and code for SDK connection errors", () => {
    const sdkError = APIError.generate(
      undefined,
      undefined,
      "Connection error.",
      undefined,
    );
    const diagnostic = toProtocolDiagnostic("responses", sdkError);
    assert.equal(diagnostic.status, undefined);
    assert.equal(diagnostic.code, undefined);
    assert.equal(diagnostic.type, undefined);
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
