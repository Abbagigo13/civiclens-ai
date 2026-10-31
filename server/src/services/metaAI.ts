import OpenAI from "openai";

const apiKey = process.env.MODEL_API_KEY;

if (!apiKey) {
  throw new Error(
    "MODEL_API_KEY is missing. Add your Meta API key to the project .env file.",
  );
}

const metaClient = new OpenAI({
  apiKey,
  baseURL: "https://api.meta.ai/v1",
  timeout: 60_000,
  maxRetries: 1,
});

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

export async function analyzeInfrastructureImage(
  imageDataUrl: string,
): Promise<InfrastructureAnalysis> {
  const response = await metaClient.chat.completions.create({
    model: process.env.META_MODEL || "muse-spark-1.3",

    messages: [
      {
        role: "system",
        content: `
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
        `.trim(),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Analyze this image for visible civic infrastructure " +
              "issues and return the requested JSON object.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
              detail: "high",
            },
          },
        ],
      },
    ],

    max_tokens: 2500,
reasoning_effort: "low",
temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;

if (typeof content !== "string" || !content.trim()) {
  throw new Error("Meta returned an empty analysis response.");
}

return parseAnalysis(content);
}
