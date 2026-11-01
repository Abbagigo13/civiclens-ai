import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export type ReportStatus = "Submitted" | "Under Review" | "Resolved";

export type ReportPriority = "Low" | "Medium" | "High" | "Critical";

const reportStatuses: readonly ReportStatus[] = [
  "Submitted",
  "Under Review",
  "Resolved",
];

const reportPriorities: readonly ReportPriority[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

export type ValidatedReportInput = {
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
};

export type StoredReport = ValidatedReportInput & {
  id: string;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoredPhoto = {
  data: Buffer;
  mime: string;
};

export type CreateStoreOptions = {
  photoDir?: string;
};

export type StatusChange = {
  id: number;
  reportId: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  changedAt: string;
};

export type ActivityType = "created" | "updated" | "resolved";

export type ActivityEvent = {
  id: number;
  type: ActivityType;
  reportId: string;
  title: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  at: string;
};

export type ReportsStore = {
  createReport: (input: unknown) => StoredReport;
  listReports: () => StoredReport[];
  getReport: (id: string) => StoredReport | null;
  getHistory: (reportId: string) => StatusChange[];
  listActivity: (limit?: number) => ActivityEvent[];
  updateStatus: (id: string, status: unknown) => StoredReport | null;
  updatePriority: (id: string, priority: unknown) => StoredReport | null;
  setPhoto: (id: string, data: Uint8Array, mime: string) => StoredReport | null;
  getPhoto: (id: string) => StoredPhoto | null;
  deleteReport: (id: string) => boolean;
  close: () => void;
};

type ClientError = Error & { statusCode: number };

function clientError(message: string): ClientError {
  const error = new Error(message) as ClientError;
  error.statusCode = 400;
  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw clientError(`${field} is required.`);
  }

  if (value.trim().length > maxLength) {
    throw clientError(
      `${field} must be ${maxLength} characters or fewer.`,
    );
  }

  return value.trim();
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (value === undefined || value === null) return "";

  if (typeof value !== "string") {
    throw clientError(`${field} must be a string.`);
  }

  if (value.trim().length > maxLength) {
    throw clientError(
      `${field} must be ${maxLength} characters or fewer.`,
    );
  }

  return value.trim();
}

function optionalCoordinate(
  value: unknown,
  field: "latitude" | "longitude",
): number | null {
  if (value === undefined || value === null) return null;

  const limit = field === "latitude" ? 90 : 180;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > limit
  ) {
    throw clientError(`${field} is out of range.`);
  }

  return value;
}

function parseStatus(value: unknown, field: string): ReportStatus {
  if (
    typeof value !== "string" ||
    !(reportStatuses as readonly string[]).includes(value)
  ) {
    throw clientError(
      `${field} must be one of: ${reportStatuses.join(", ")}.`,
    );
  }

  return value as ReportStatus;
}

function parsePriority(value: unknown, field: string): ReportPriority {
  if (
    typeof value !== "string" ||
    !(reportPriorities as readonly string[]).includes(value)
  ) {
    throw clientError(
      `${field} must be one of: ${reportPriorities.join(", ")}.`,
    );
  }

  return value as ReportPriority;
}

function optionalPriority(value: unknown, field: string): ReportPriority | null {
  if (value === undefined || value === null) return null;
  return parsePriority(value, field);
}

function optionalConfidence(value: unknown): number | null {
  if (value === undefined || value === null) return null;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw clientError("confidence must be between 0 and 1.");
  }

  return value;
}

function optionalBoolean(value: unknown, field: string): boolean | null {
  if (value === undefined || value === null) return null;

  if (typeof value !== "boolean") {
    throw clientError(`${field} must be true or false.`);
  }

  return value;
}

function optionalStringList(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw clientError(`${field} must be a list of strings.`);
  }

  if (value.length > 20) {
    throw clientError(`${field} must have at most 20 entries.`);
  }

  return value.map((entry) => {
    if (typeof entry !== "string") {
      throw clientError(`${field} must be a list of strings.`);
    }

    if (entry.length > 500) {
      throw clientError(
        `Each ${field} entry must be 500 characters or fewer.`,
      );
    }

    return entry;
  });
}

export function parseReportInput(input: unknown): ValidatedReportInput {
  if (!isRecord(input)) {
    throw clientError("Report details must be provided as an object.");
  }

  return {
    title: requiredText(input.title, "title", 200),
    category: requiredText(input.category, "category", 100),
    location: requiredText(input.location, "location", 300),
    latitude: optionalCoordinate(input.latitude, "latitude"),
    longitude: optionalCoordinate(input.longitude, "longitude"),
    description: optionalText(input.description, "description", 2000),
    status:
      input.status === undefined || input.status === null
        ? "Submitted"
        : parseStatus(input.status, "status"),
    priority: optionalPriority(input.priority, "priority"),
    issueDetected: optionalBoolean(input.issueDetected, "issueDetected"),
    confidence: optionalConfidence(input.confidence),
    visibleEvidence: optionalStringList(
      input.visibleEvidence,
      "visibleEvidence",
    ),
    limitations: optionalStringList(input.limitations, "limitations"),
  };
}

type ReportRow = {
  id: string;
  title: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  status: string;
  priority: string | null;
  photo_mime: string | null;
  issue_detected: number | null;
  confidence: number | null;
  visible_evidence: string;
  limitations: string;
  created_at: string;
  updated_at: string;
};

type HistoryRow = {
  id: number;
  report_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
};

function parseJsonList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function mapReport(row: ReportRow): StoredReport {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.description,
    status: row.status as ReportStatus,
    priority: (row.priority as ReportPriority | null) ?? null,
    hasPhoto: row.photo_mime !== null,
    issueDetected:
      row.issue_detected === null ? null : row.issue_detected === 1,
    confidence: row.confidence,
    visibleEvidence: parseJsonList(row.visible_evidence),
    limitations: parseJsonList(row.limitations),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHistory(row: HistoryRow): StatusChange {
  return {
    id: row.id,
    reportId: row.report_id,
    fromStatus: (row.from_status as ReportStatus | null) ?? null,
    toStatus: row.to_status as ReportStatus,
    changedAt: row.changed_at,
  };
}

function generateId(): string {
  return `CL-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function defaultDbPath(): string {
  return process.env.REPORTS_DB_PATH || "data/civiclens.db";
}

const photoMimeTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function createStore(
  dbPath: string = defaultDbPath(),
  options: CreateStoreOptions = {},
): ReportsStore {
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const photoDir =
    options.photoDir ??
    process.env.REPORTS_PHOTO_DIR ??
    (dbPath === ":memory:"
      ? join(tmpdir(), `civiclens-photos-${process.pid}`)
      : join(dirname(dbPath), "photos"));
  mkdirSync(photoDir, { recursive: true });

  // A process-private temp dir is owned by this store and removed on close.
  const ownsPhotoDir =
    dbPath === ":memory:" &&
    options.photoDir === undefined &&
    process.env.REPORTS_PHOTO_DIR === undefined;

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      priority TEXT,
      issue_detected INTEGER,
      confidence REAL,
      visible_evidence TEXT NOT NULL DEFAULT '[]',
      limitations TEXT NOT NULL DEFAULT '[]',
      photo_mime TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_status_history_report
      ON status_history(report_id);
  `);

  // One-way migration from the old status model, where priority
  // levels doubled as statuses. Idempotent: reruns change nothing.
  db.exec(`
    UPDATE reports SET status = 'Under Review'
      WHERE status IN ('In Progress', 'High Priority', 'Critical');
    UPDATE reports SET priority = 'High'
      WHERE priority = 'High Priority';
    UPDATE reports SET priority = NULL
      WHERE priority IN ('In Progress', 'Resolved');
    UPDATE status_history SET from_status = 'Under Review'
      WHERE from_status IN ('In Progress', 'High Priority', 'Critical');
    UPDATE status_history SET to_status = 'Under Review'
      WHERE to_status IN ('In Progress', 'High Priority', 'Critical');
  `);

  // Photo column for databases created before photo sync existed.
  const columns = db
    .prepare("PRAGMA table_info(reports)")
    .all() as { name: string }[];

  if (!columns.some((column) => column.name === "photo_mime")) {
    db.exec("ALTER TABLE reports ADD COLUMN photo_mime TEXT");
  }

  const insertReport = db.prepare(`
    INSERT INTO reports (
      id, title, category, location, latitude, longitude,
      description, status, priority, issue_detected, confidence,
      visible_evidence, limitations, created_at, updated_at
    ) VALUES (
      :id, :title, :category, :location, :latitude, :longitude,
      :description, :status, :priority, :issueDetected, :confidence,
      :visibleEvidence, :limitations, :createdAt, :updatedAt
    )
  `);

  const insertHistory = db.prepare(`
    INSERT INTO status_history (report_id, from_status, to_status, changed_at)
    VALUES (:reportId, :fromStatus, :toStatus, :changedAt)
  `);

  const selectOne = db.prepare("SELECT * FROM reports WHERE id = :id");
  const selectAll = db.prepare(
    "SELECT * FROM reports ORDER BY created_at DESC, rowid DESC",
  );
  const selectHistory = db.prepare(
    "SELECT * FROM status_history WHERE report_id = :reportId ORDER BY id ASC",
  );
  const selectActivity = db.prepare(`
    SELECT h.id, h.report_id, h.from_status, h.to_status, h.changed_at, r.title
    FROM status_history AS h
    JOIN reports AS r ON r.id = h.report_id
    ORDER BY h.changed_at DESC, h.id DESC
    LIMIT :limit
  `);
  const updateStatusStmt = db.prepare(`
    UPDATE reports SET status = :status, updated_at = :updatedAt WHERE id = :id
  `);
  const updatePriorityStmt = db.prepare(`
    UPDATE reports SET priority = :priority, updated_at = :updatedAt WHERE id = :id
  `);
  const updatePhotoStmt = db.prepare(`
    UPDATE reports SET photo_mime = :mime, updated_at = :updatedAt WHERE id = :id
  `);
  const deleteHistoryStmt = db.prepare(
    "DELETE FROM status_history WHERE report_id = :reportId",
  );
  const deleteReportStmt = db.prepare(
    "DELETE FROM reports WHERE id = :id",
  );

  function getReport(id: string): StoredReport | null {
    const row = selectOne.get({ id }) as ReportRow | undefined;
    return row ? mapReport(row) : null;
  }

  function removePhotoFiles(id: string): void {
    for (const ext of Object.values(photoMimeTypes)) {
      rmSync(join(photoDir, `${id}.${ext}`), { force: true });
    }
  }

  return {
    createReport(input: unknown): StoredReport {
      const report = parseReportInput(input);
      const now = new Date().toISOString();

      let id = generateId();
      for (let attempt = 0; getReport(id) && attempt < 10; attempt += 1) {
        id = generateId();
      }

      insertReport.run({
        id,
        title: report.title,
        category: report.category,
        location: report.location,
        latitude: report.latitude,
        longitude: report.longitude,
        description: report.description,
        status: report.status,
        priority: report.priority,
        issueDetected:
          report.issueDetected === null
            ? null
            : report.issueDetected
              ? 1
              : 0,
        confidence: report.confidence,
        visibleEvidence: JSON.stringify(report.visibleEvidence),
        limitations: JSON.stringify(report.limitations),
        createdAt: now,
        updatedAt: now,
      });

      insertHistory.run({
        reportId: id,
        fromStatus: null,
        toStatus: report.status,
        changedAt: now,
      });

      return getReport(id) as StoredReport;
    },

    listReports(): StoredReport[] {
      return (selectAll.all() as ReportRow[]).map(mapReport);
    },

    getReport,

    getHistory(reportId: string): StatusChange[] {
      return (selectHistory.all({ reportId }) as HistoryRow[]).map(
        mapHistory,
      );
    },

    listActivity(limit: number = 20): ActivityEvent[] {
      const count =
        Number.isFinite(limit) && limit > 0
          ? Math.min(Math.floor(limit), 100)
          : 20;

      return (
        selectActivity.all({ limit: count }) as (HistoryRow & {
          title: string;
        })[]
      ).map((row) => ({
        id: row.id,
        type:
          row.from_status === null
            ? "created"
            : row.to_status === "Resolved"
              ? "resolved"
              : "updated",
        reportId: row.report_id,
        title: row.title,
        fromStatus: (row.from_status as ReportStatus | null) ?? null,
        toStatus: row.to_status as ReportStatus,
        at: row.changed_at,
      }));
    },

    updateStatus(id: string, status: unknown): StoredReport | null {
      const next = parseStatus(status, "status");
      const current = getReport(id);

      if (!current) return null;
      if (current.status === next) return current;

      const now = new Date().toISOString();
      updateStatusStmt.run({ id, status: next, updatedAt: now });
      insertHistory.run({
        reportId: id,
        fromStatus: current.status,
        toStatus: next,
        changedAt: now,
      });

      return getReport(id);
    },

    updatePriority(id: string, priority: unknown): StoredReport | null {
      const next = parsePriority(priority, "priority");
      const current = getReport(id);

      if (!current) return null;
      if (current.priority === next) return current;

      updatePriorityStmt.run({
        id,
        priority: next,
        updatedAt: new Date().toISOString(),
      });

      return getReport(id);
    },

    setPhoto(id: string, data: Uint8Array, mime: string): StoredReport | null {
      const ext = photoMimeTypes[mime];

      if (!ext) {
        throw clientError("Only JPG, PNG, and WebP photos are supported.");
      }

      if (!getReport(id)) return null;

      removePhotoFiles(id);
      writeFileSync(join(photoDir, `${id}.${ext}`), data);
      updatePhotoStmt.run({
        id,
        mime,
        updatedAt: new Date().toISOString(),
      });

      return getReport(id);
    },

    getPhoto(id: string): StoredPhoto | null {
      const mime = (
        selectOne.get({ id }) as ReportRow | undefined
      )?.photo_mime;

      if (!mime) return null;

      const ext = photoMimeTypes[mime];
      if (!ext) return null;

      try {
        return {
          data: readFileSync(join(photoDir, `${id}.${ext}`)),
          mime,
        };
      } catch {
        return null;
      }
    },

    deleteReport(id: string): boolean {
      deleteHistoryStmt.run({ reportId: id });
      const result = deleteReportStmt.run({ id });

      if (result.changes > 0) {
        removePhotoFiles(id);
        return true;
      }

      return false;
    },

    close(): void {
      db.close();

      if (ownsPhotoDir) {
        rmSync(photoDir, { recursive: true, force: true });
      }
    },
  };
}

let sharedStore: ReportsStore | null = null;

export function getStore(): ReportsStore {
  sharedStore ??= createStore();
  return sharedStore;
}
