import OpenAI from "openai";

// The Meta client is created lazily so the server boots without a
// model key: filing, browsing and resolving reports stay free and
// open, and only AI photo analysis reports that it is unavailable.
let metaClient: OpenAI | null = null;

const DEFAULT_META_MODEL = "muse-spark-1.3";

// Env values pasted into hosts (Railway etc.) often arrive wrapped in
// quotes or padded with spaces, which Meta then rejects as a different
// key/model. Strip that wrapping so the value sent is the value meant.
export function cleanEnvValue(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export function getMetaModel(raw?: string): string {
  const cleaned = cleanEnvValue(raw ?? process.env.META_MODEL);
  return cleaned || DEFAULT_META_MODEL;
}

export function getModelApiKey(raw?: string): string {
  return cleanEnvValue(raw ?? process.env.MODEL_API_KEY);
}

export function isAnalysisConfigured(): boolean {
  return getModelApiKey().length > 0;
}

function getMetaClient(): OpenAI {
  const apiKey = getModelApiKey();

  if (!apiKey) {
    throw new Error(
      "AI analysis is not configured on this server. " +
        "You can still file your report manually.",
    );
  }

  metaClient ??= new OpenAI({
    apiKey,
    baseURL: "https://api.meta.ai/v1",
    timeout: 60_000,
    maxRetries: 1,
  });

  return metaClient;
}

export type InfrastructureAnalysis = {
  issueDetected: boolean;
  category: string;
  title: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical" | "Uncertain";
  confidence: number | null;
  visibleEvidence: string[];
  limitations: string[];
};

const allowedCategories = [
  "Road Damage",
  "Flooding",
  "Blocked Drainage",
  "Waste Management",
  "Street Lighting",
  "Public Utilities",
  "Building Damage",
  "Other",
  "Uncertain",
];

const allowedSeverities = [
  "Low",
  "Medium",
  "High",
  "Critical",
  "Uncertain",
];

export function parseAnalysis(
  content: string,
): InfrastructureAnalysis {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end <= start) {
    throw new Error("The AI returned an invalid analysis response.");
  }

  const parsed: unknown = JSON.parse(
    cleaned.slice(start, end + 1),
  );

  if (
    typeof parsed !== "object" ||
    parsed === null
  ) {
    throw new Error("The AI response has an invalid structure.");
  }

  const value = parsed as Record<string, unknown>;

  const category =
    typeof value.category === "string" &&
    allowedCategories.includes(value.category)
      ? value.category
      : "Uncertain";

  const severity =
    typeof value.severity === "string" &&
    allowedSeverities.includes(value.severity)
      ? (value.severity as InfrastructureAnalysis["severity"])
      : "Uncertain";

  const confidence =
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1
      ? value.confidence
      : null;

  const toStringArray = (item: unknown): string[] => {
    if (!Array.isArray(item)) {
      return [];
    }

    return item
      .filter((entry): entry is string =>
        typeof entry === "string",
      )
      .slice(0, 8);
  };

  if (
    typeof value.issueDetected !== "boolean" ||
    typeof value.title !== "string" ||
    typeof value.description !== "string"
  ) {
    throw new Error("The AI response is missing required fields.");
  }

  return {
    issueDetected: value.issueDetected,
    category,
    title: value.title.slice(0, 160),
    description: value.description.slice(0, 1500),
    severity,
    confidence,
    visibleEvidence: toStringArray(value.visibleEvidence),
    limitations: toStringArray(value.limitations),
  };
}

const SYSTEM_PROMPT = `
You are the visual inspection assistant for CivicLens AI,
a civic infrastructure reporting platform.

Analyze the supplied photograph for visible infrastructure
problems such as road damage, flooding, blocked drainage,
improper waste disposal, broken street lighting, damaged
public utilities, and building damage.

Rules:
- Describe only what is visible in the photograph.
- Never invent a location, address, date, owner, or authority.
- Do not claim that a problem has been officially verified.
- Severity is a preliminary visual assessment, not an
  engineering inspection.
- If the image is unclear or unrelated to infrastructure,
  use category "Uncertain" where appropriate.
- Use confidence between 0 and 1 only when meaningful.
- Return a single valid JSON object without Markdown.

Required JSON shape:
{
  "issueDetected": true,
  "category": "Road Damage",
  "title": "Short descriptive title",
  "description": "A factual description of the visible issue.",
  "severity": "Medium",
  "confidence": 0.8,
  "visibleEvidence": ["Evidence visible in the photograph"],
  "limitations": ["Any uncertainty or missing context"]
}

Allowed categories:
Road Damage, Flooding, Blocked Drainage, Waste Management,
Street Lighting, Public Utilities, Building Damage, Other,
Uncertain.

Allowed severities:
Low, Medium, High, Critical, Uncertain.
`.trim();

const USER_TEXT =
  "Analyze this image for visible civic infrastructure " +
  "issues and return the requested JSON object.";

export function buildResponsesRequest(model: string, imageDataUrl: string) {
  return {
    model,
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: "user" as const,
        content: [
          { type: "input_text" as const, text: USER_TEXT },
          {
            type: "input_image" as const,
            image_url: imageDataUrl,
            detail: "high" as const,
          },
        ],
      },
    ],
    max_output_tokens: 2500,
    reasoning: { effort: "low" as const },
    temperature: 0.2,
  };
}

export function buildMessagesRequest(model: string, imageDataUrl: string) {
  const dataMatch = /^data:([^;,]+);base64,(.*)$/s.exec(imageDataUrl);
  const imageSource = dataMatch
    ? {
        type: "base64" as const,
        media_type: dataMatch[1],
        data: dataMatch[2],
      }
    : { type: "url" as const, url: imageDataUrl };

  return {
    model,
    max_tokens: 2500,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: USER_TEXT },
          { type: "image" as const, source: imageSource },
        ],
      },
    ],
  };
}

type ResponsesShape = {
  output_text?: unknown;
  output?: { content?: { type?: string; text?: unknown }[] }[];
};

export function extractResponsesText(response: ResponsesShape): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  const parts: string[] = [];
  for (const item of response.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && typeof part.text === "string") {
        parts.push(part.text);
      }
    }
  }
  return parts.join("");
}

type MessagesShape = {
  content?: { type?: string; text?: unknown }[];
};

export function extractMessagesText(response: MessagesShape): string {
  const parts: string[] = [];
  for (const part of response.content ?? []) {
    if (part.type === "text" && typeof part.text === "string") {
      parts.push(part.text);
    }
  }
  return parts.join("");
}

export type ProtocolCall = (
  model: string,
  imageDataUrl: string,
) => Promise<string>;

async function parseProtocolText(text: string): Promise<InfrastructureAnalysis> {
  if (!text.trim()) {
    throw new Error("Meta returned an empty analysis response.");
  }
  return parseAnalysis(text);
}

// Muse Spark on Meta serves the same model over two protocols.
// Chat Completions returned "404 model not found" live, so try the
// Responses API first and fall back to the Messages API. The higher
// reasoning budget on the paid path may return tool/non-text content
// first, so empty or non-JSON text also triggers the fallback.
export async function analyzeWithProtocols(
  imageDataUrl: string,
  calls: { responses: ProtocolCall; messages: ProtocolCall },
  model: string = getMetaModel(),
): Promise<InfrastructureAnalysis> {
  let firstError: unknown;
  try {
    return await parseProtocolText(
      await calls.responses(model, imageDataUrl),
    );
  } catch (error) {
    firstError = error;
  }

  try {
    return await parseProtocolText(
      await calls.messages(model, imageDataUrl),
    );
  } catch (secondError) {
    const first =
      firstError instanceof Error ? firstError.message : "unknown";
    const second =
      secondError instanceof Error ? secondError.message : "unknown";
    throw new Error(`${first}; messages: ${second}`, {
      cause: secondError,
    });
  }
}

async function createMessagesText(
  model: string,
  imageDataUrl: string,
): Promise<string> {
  const apiKey = getModelApiKey();
  if (!apiKey) {
    throw new Error(
      "AI analysis is not configured on this server. " +
        "You can still file your report manually.",
    );
  }

  const response = await fetch("https://api.meta.ai/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(buildMessagesRequest(model, imageDataUrl)),
    signal: AbortSignal.timeout(60_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    let detail = raw.slice(0, 300);
    try {
      const parsed = JSON.parse(raw) as {
        error?: { message?: string };
      };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // keep raw slice
    }
    throw new Error(
      `Meta Messages request failed (${response.status}): ${detail}`,
    );
  }

  return extractMessagesText(JSON.parse(raw) as MessagesShape);
}

export async function analyzeInfrastructureImage(
  imageDataUrl: string,
): Promise<InfrastructureAnalysis> {
  const client = getMetaClient();

  return analyzeWithProtocols(imageDataUrl, {
    responses: async (model, image) =>
      extractResponsesText(
        (await client.responses.create(
          buildResponsesRequest(model, image) as never,
        )) as ResponsesShape,
      ),
    messages: createMessagesText,
  });
}
