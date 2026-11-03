import type {
  CivicReport,
  ReportPriority,
  ReportStatus,
} from "../data/mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function httpError(message: string, status: number): Error {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = status;
  return error;
}

export type ServerReport = {
  id: string;
  title: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  status: ReportStatus;
  priority: ReportPriority | null;
  issueDetected: boolean | null;
  confidence: number | null;
  visibleEvidence: string[];
  limitations: string[];
  hasPhoto: boolean;
  hasAfterPhoto: boolean;
  supportCount: number;
  flagged: boolean;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewReportInput = {
  title: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  issueDetected: boolean;
  confidence: number | null;
  visibleEvidence: string[];
  limitations: string[];
};

export function formatRelativeTime(isoDate: string): string {
  const timestamp = Date.parse(isoDate);

  if (Number.isNaN(timestamp)) return isoDate;

  const minutes = Math.floor((Date.now() - timestamp) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Photos stay in browser IndexedDB keyed by report id,
// so server reports reuse the existing indexeddb: image scheme.
export function toCivicReport(report: ServerReport): CivicReport {
  return {
    id: report.id,
    title: report.title,
    category: report.category,
    location: report.location,
    latitude: report.latitude ?? undefined,
    longitude: report.longitude ?? undefined,
    time: formatRelativeTime(report.createdAt),
    status: report.status,
    image: `indexeddb:${report.id}`,
    description: report.description,
    hasPhoto: report.hasPhoto,
    hasAfterPhoto: report.hasAfterPhoto,
    supportCount: report.supportCount,
    flagged: report.flagged,
    hidden: report.hidden,
    syncState: "synced" as const,
    createdAt: report.createdAt,
    priority: report.priority ?? undefined,
    issueDetected: report.issueDetected ?? undefined,
    confidence: report.confidence,
    visibleEvidence: report.visibleEvidence,
    limitations: report.limitations,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  // A proxy or gateway failure (e.g. backend not running) has no
  // JSON body, so read defensively instead of crashing on .json().
  const rawBody = await response.text();
  let payload = {} as T & { error?: string };

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as T & { error?: string };
    } catch {
      payload = {} as T & { error?: string };
    }
  }

  if (!response.ok) {
    throw httpError(
      payload.error ||
        (!rawBody
          ? "Could not reach the CivicLens server. Start the backend with npm run server:dev and try again."
          : `Request failed (${response.status}).`),
      response.status,
    );
  }

  return payload;
}

export type ServerHealth = {
  online: boolean;
};

export async function checkServerHealth(): Promise<ServerHealth> {
  const offline = { online: false };

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return offline;

    const payload = (await response.json()) as { status?: string };

    return { online: payload.status === "ok" };
  } catch {
    return offline;
  }
}

export async function fetchReports(): Promise<CivicReport[]> {
  const payload = await request<{ reports: ServerReport[] }>("/api/reports");
  return payload.reports.map(toCivicReport);
}

export async function createServerReport(
  input: NewReportInput,
): Promise<CivicReport> {
  const payload = await request<{ report: ServerReport }>(
    "/api/reports",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return toCivicReport(payload.report);
}

// Local-only reports (saved while offline) are not on the server,
// so a 404 here resolves to null instead of throwing.
export async function updateServerReportStatus(
  id: string,
  status: ReportStatus,
): Promise<CivicReport | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );

  if (response.status === 404) return null;

  const payload = (await response.json()) as {
    report?: ServerReport;
    error?: string;
  };

  if (!response.ok || !payload.report) {
    throw httpError(
      payload.error || `Status update failed (${response.status}).`,
      response.status,
    );
  }

  return toCivicReport(payload.report);
}

export async function updateServerReportPriority(
  id: string,
  priority: ReportPriority,
): Promise<CivicReport | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}/priority`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    },
  );

  if (response.status === 404) return null;

  const payload = (await response.json()) as {
    report?: ServerReport;
    error?: string;
  };

  if (!response.ok || !payload.report) {
    throw httpError(
      payload.error || `Priority update failed (${response.status}).`,
      response.status,
    );
  }

  return toCivicReport(payload.report);
}

export type ActivityItem = {
  id: number;
  type: "created" | "updated" | "resolved";
  reportId: string;
  heading: string;
  detail: string;
  time: string;
  at: string;
};

type ServerActivity = {
  id: number;
  type: "created" | "updated" | "resolved";
  reportId: string;
  title: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  at: string;
};

export async function fetchActivity(): Promise<ActivityItem[]> {
  const payload = await request<{ activity: ServerActivity[] }>(
    "/api/activity?limit=8",
  );

  return payload.activity.map((item) => ({
    id: item.id,
    reportId: item.reportId,
    at: item.at,
    type: item.type,
    heading:
      item.type === "created"
        ? "New report submitted"
        : item.type === "resolved"
          ? "Report resolved"
          : "Status updated",
    detail:
      item.type === "updated"
        ? `${item.title} → ${item.toStatus}`
        : item.title,
    time: formatRelativeTime(item.at),
  }));
}

// Local browser photo first, server copy as the cross-device fallback.
export function resolveReportImage(
  report: CivicReport,
  imageUrls: Record<string, string>,
): string {
  if (!report.image.startsWith("indexeddb:")) return report.image;

  return (
    imageUrls[report.id] ??
    (report.hasPhoto
      ? `${API_BASE_URL}/api/reports/${encodeURIComponent(report.id)}/photo`
      : "")
  );
}

export async function uploadServerPhoto(
  id: string,
  photo: Blob,
): Promise<boolean> {
  const body = new FormData();
  body.append("photo", photo, "photo.jpg");

  const response = await fetch(
    `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}/photo`,
    { method: "POST", body },
  );

  return response.ok;
}

export type ReportHistoryItem = {
  id: number;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  changedAt: string;
};

export async function fetchReportHistory(
  id: string,
): Promise<ReportHistoryItem[]> {
  const payload = await request<{
    history: {
      id: number;
      fromStatus: ReportStatus | null;
      toStatus: ReportStatus;
      changedAt: string;
    }[];
  }>(`/api/reports/${encodeURIComponent(id)}`);

  return payload.history ?? [];
}

// 404 resolves to null: local-only reports keep their local count.
export async function supportServerReport(
  id: string,
): Promise<CivicReport | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}/support`,
    { method: "POST" },
  );

  if (response.status === 404) return null;

  const payload = (await response.json()) as {
    report?: ServerReport;
    error?: string;
  };

  if (!response.ok || !payload.report) {
    throw httpError(
      payload.error || `Support failed (${response.status}).`,
      response.status,
    );
  }

  return toCivicReport(payload.report);
}

export function resolveAfterImage(report: CivicReport): string {
  return report.hasAfterPhoto
    ? `${API_BASE_URL}/api/reports/${encodeURIComponent(report.id)}/after-photo`
    : "";
}

export async function uploadServerAfterPhoto(
  id: string,
  photo: Blob,
): Promise<boolean> {
  const body = new FormData();
  body.append("photo", photo, "after.jpg");

  const response = await fetch(
    `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}/after-photo`,
    { method: "POST", body },
  );

  return response.ok;
}

export function moderatorHeaders(): Record<string, string> {
  try {
    const key = localStorage.getItem("civiclens-mod-key");
    return key ? { "x-moderator-key": key } : {};
  } catch {
    return {};
  }
}

export async function moderateServerReport(
  id: string,
  patch: { flagged?: boolean; hidden?: boolean },
): Promise<CivicReport | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}/moderation`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...moderatorHeaders() },
      body: JSON.stringify(patch),
    },
  );

  if (response.status === 404) return null;

  const payload = (await response.json()) as {
    report?: ServerReport;
    error?: string;
  };

  if (!response.ok || !payload.report) {
    throw httpError(
      payload.error || `Moderation failed (${response.status}).`,
      response.status,
    );
  }

  return toCivicReport(payload.report);
}

export async function deleteServerReport(id: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}`,
    { method: "DELETE", headers: moderatorHeaders() },
  );

  if (response.ok || response.status === 404) return;

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  throw httpError(
    payload.error || `Delete failed (${response.status}).`,
    response.status,
  );
}
