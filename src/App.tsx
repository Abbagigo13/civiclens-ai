import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  CircleCheck,
  Clock3,
  FileText,
  Flag,
  Link2,
  MapPin,
  RefreshCw,
  Share2,
  ShieldCheck,
  ThumbsUp,
  ScanSearch,
  Target,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import UploadPanel, {
  type AIAnalysis,
} from "./features/analysis/UploadPanel";
import ReportsPanel from "./features/reports/ReportsPanel";
import CommunityPage from "./features/community/CommunityPage";
import InsightsPage from "./features/insights/InsightsPage";
import ModerationPage from "./features/moderation/ModerationPage";
import SettingsPage from "./features/settings/SettingsPage";
const CivicMap = lazy(() => import("./components/CivicMap"));
const LocationPicker = lazy(() => import("./components/LocationPicker"));
import { reports } from "./data/mockData";
import { migrateCachedReport } from "./data/mockData";
import type {
  CivicReport,
  ReportPriority,
  ReportStatus,
} from "./data/mockData";
import {
  preparePhoto,
  saveReportImage,
  getReportImage,
  deleteReportImage,
} from "./utils/imageStorage";
import {
  fetchReports,
  fetchActivity,
  createServerReport,
  updateServerReportStatus,
  updateServerReportPriority,
  uploadServerPhoto,
  resolveReportImage,
  deleteServerReport,
  fetchReportHistory,
  supportServerReport,
  resolveAfterImage,
  uploadServerAfterPhoto,
  moderateServerReport,
} from "./api/reports";
import type { ActivityItem, ReportHistoryItem } from "./api/reports";
import { parseTileProvider } from "./utils/mapTiles";
import type { TileProviderId } from "./utils/mapTiles";
import "./index.css";

type AnalysisResult = {
  file: File;
  preview: string;
  title: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  observation: string;
  priority: ReportPriority;
  issueDetected: boolean;
  confidence: number | null;
  visibleEvidence: string[];
  limitations: string[];
};

function offlineReportId(): string {
  return `CL-${Date.now().toString().slice(-6)}`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function AnalysisModal({
  result,
  onClose,
  onSave,
  tiles,
}: {
  result: AnalysisResult;
  onClose: () => void;
  onSave: (result: AnalysisResult) => void;
  tiles: TileProviderId;
}) {
  const [title, setTitle] = useState(result.title);
const [location, setLocation] = useState(result.location);
const [category, setCategory] = useState(result.category);
const [description, setDescription] = useState(result.description);
const [latitude, setLatitude] = useState<number | null>(result.latitude);
const [longitude, setLongitude] = useState<number | null>(result.longitude);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.section
        className="analysis-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-title"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
                        <h2 id="analysis-title">Review your report</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <div className="modal-notice">
  <ScanSearch size={17} />
  <span>
    Meta AI has analyzed your image. These findings are preliminary
    visual observations, not an official inspection. Review and edit
    the details before saving.
  </span>
</div>

        <img className="modal-photo" src={result.preview} alt="Uploaded issue" />

        <label className="field-label">
          Report title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="field-label">
          Category
          <select
  value={category}
  onChange={(event) => setCategory(event.target.value)}
>
  <option>Road Damage</option>
  <option>Flooding</option>
  <option>Blocked Drainage</option>
  <option>Waste Management</option>
  <option>Street Lighting</option>
  <option>Public Utilities</option>
  <option>Building Damage</option>
  <option>Other</option>
  <option>Uncertain</option>
</select>
        </label>

        <label className="field-label">
          Location (editable)
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter a street, landmark or community"
          />
        </label>

        <div className="field-label">
  Select the issue location on the map
  <Suspense fallback={<p className="activity-empty">Loading map…</p>}>
    <LocationPicker
      latitude={latitude}
      longitude={longitude}
      tiles={tiles}
      onSelect={(lat, lng) => {
        setLatitude(lat);
        setLongitude(lng);
      }}
    />
  </Suspense>
</div>

        <label className="field-label">
  Description
  <textarea
    value={description}
    onChange={(event) => setDescription(event.target.value)}
    placeholder="Describe the problem, its impact, and any useful details."
    rows={4}
    maxLength={1000}
  />
</label>

        <div className="observation-box">
  <div className="observation-title">
    <Target size={16} />
    AI visual assessment
  </div>

  <p>{result.observation}</p>

  <div className="analysis-metadata">
    <strong>
      Confidence:{" "}
      {result.confidence === null
        ? "Not provided"
        : `${Math.round(result.confidence * 100)}%`}
    </strong>

    <span>
      Suggested priority: {result.priority}
    </span>
  </div>

  {result.visibleEvidence.length > 0 && (
    <>
      <strong>Visible evidence</strong>
      <ul>
        {result.visibleEvidence.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </>
  )}

  {result.limitations.length > 0 && (
    <>
      <strong>Limitations</strong>
      <ul>
        {result.limitations.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </>
  )}

  <span>
    AI-generated findings can be incorrect. Verify the details
    before submitting this report.
  </span>
</div>

        <div className="modal-actions">
          <button className="button-secondary" onClick={onClose}>Cancel</button>
          <button
            className="button-primary"
            onClick={() =>
  onSave({
  ...result,
  title: title.trim(),
  category,
  location: location.trim(),
  latitude,
  longitude,
  description: description.trim(),
})
}
            disabled={!title.trim() || !location.trim()}
          >
            <Check size={16} /> Confirm & save
          </button>
        </div>
      </motion.section>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("Home");
  const [lightMode, setLightMode] = useState(false);
  const [tileProvider, setTileProvider] = useState<TileProviderId>(() => {
    try {
      return parseTileProvider(localStorage.getItem("civiclens-tiles"));
    } catch {
      return "carto";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("civiclens-tiles", tileProvider);
    } catch (error) {
      console.error("Could not save tile preference:", error);
    }
  }, [tileProvider]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [addedReports, setAddedReports] = useState<CivicReport[]>(() => {
  try {
    const saved = localStorage.getItem("civiclens-reports");
    return saved
      ? (JSON.parse(saved) as CivicReport[]).map(migrateCachedReport)
      : [];
  } catch {
    return [];
  }
});

useEffect(() => {
  try {
    localStorage.setItem("civiclens-reports", JSON.stringify(addedReports));
  } catch (error) {
    console.error("Could not save reports in this browser:", error);
  }
}, [addedReports]);

const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

// The server is the source of truth when reachable. Reports saved
// while offline keep their local ids and are preserved alongside.
useEffect(() => {
  let cancelled = false;

  async function syncFromServer() {
    try {
      const serverReports = await fetchReports();
      if (cancelled) return;

      setAddedReports((current) => {
        const serverIds = new Set(serverReports.map((item) => item.id));
        const localOnly = current.filter((item) => !serverIds.has(item.id));
        return [...serverReports, ...localOnly];
      });

      try {
        const feed = await fetchActivity();
        if (!cancelled) setActivityFeed(feed);
      } catch (error) {
        console.error("Could not load activity from the server:", error);
      }
    } catch (error) {
      console.error("Could not load reports from the server:", error);
    }
  }

  void syncFromServer();

  return () => {
    cancelled = true;
  };
}, []);
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);
  const [historyState, setHistoryState] = useState<{
    reportId: string;
    items: ReportHistoryItem[];
  } | null>(null);
  const [afterImageUrls, setAfterImageUrls] = useState<Record<string, string>>({});
  const [supportedIds, setSupportedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("civiclens-supported");
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [lastSeenAt, setLastSeenAt] = useState<string>(() => {
    try {
      return localStorage.getItem("civiclens-notif-seen") ?? "";
    } catch {
      return "";
    }
  });
  const [toast, setToast] = useState("");

const [reportImageUrls, setReportImageUrls] = useState<Record<string, string>>({});

useEffect(() => {
  let cancelled = false;
  const createdUrls: string[] = [];

  async function loadImages() {
    for (const report of addedReports) {
      if (!report.image.startsWith("indexeddb:")) continue;

      const id = report.image.slice("indexeddb:".length);

      try {
        const blob = await getReportImage(id);
        if (!blob || cancelled) continue;

        const url = URL.createObjectURL(blob);
        createdUrls.push(url);

        if (!cancelled) {
          setReportImageUrls((current) => ({
            ...current,
            [report.id]: url,
          }));
        }
      } catch (error) {
        console.error(`Could not load image for ${report.id}:`, error);
      }
    }
  }

  void loadImages();

  return () => {
    cancelled = true;
    createdUrls.forEach((url) => URL.revokeObjectURL(url));
  };
}, [addedReports]);

// Deep link: /dashboard?report=CL-XXXXXX opens that report once loaded.
useEffect(() => {
  const target = new URLSearchParams(window.location.search).get("report");
  if (!target || selectedReport) return;

  const found =
    addedReports.find((report) => report.id === target) ??
    reports.find((report) => report.id === target);

  if (!found) return;

  const timer = window.setTimeout(() => setSelectedReport(found), 0);
  return () => window.clearTimeout(timer);
  // Only auto-open on first load / when reports first arrive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [addedReports]);

useEffect(() => {
  try {
    localStorage.setItem("civiclens-supported", JSON.stringify(supportedIds));
  } catch {
    // Storage unavailable: support still works for this session.
  }
}, [supportedIds]);

const reportHistory =
  selectedReport && historyState?.reportId === selectedReport.id
    ? historyState.items
    : [];

// Status timeline for the open report (server history when available).
useEffect(() => {
  if (!selectedReport) return;

  let cancelled = false;
  const reportId = selectedReport.id;

  fetchReportHistory(reportId)
    .then((history) => {
      if (!cancelled) setHistoryState({ reportId, items: history });
    })
    .catch(() => {
      if (!cancelled) setHistoryState({ reportId, items: [] });
    });

  // Load a locally stored after-photo, if any.
  getReportImage(`${selectedReport.id}-after`)
    .then((blob) => {
      if (!blob || cancelled) return;
      const url = URL.createObjectURL(blob);
      setAfterImageUrls((current) => ({ ...current, [selectedReport.id]: url }));
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
  };
  // Refetch only when a different report is opened, not on status edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedReport?.id]);

function showToast(message: string) {
  setToast(message);
  window.setTimeout(() => setToast(""), 3000);
}

function patchReport(reportId: string, patch: Partial<CivicReport>) {
  setAddedReports((current) =>
    current.map((report) =>
      report.id === reportId ? { ...report, ...patch } : report,
    ),
  );
  setSelectedReport((current) =>
    current && current.id === reportId ? { ...current, ...patch } : current,
  );
}

async function supportReport(report: CivicReport) {
  if (supportedIds.includes(report.id)) return;

  setSupportedIds((current) => [...current, report.id]);
  patchReport(report.id, {
    supportCount: (report.supportCount ?? 0) + 1,
  });

  try {
    const saved = await supportServerReport(report.id);
    if (saved) {
      patchReport(report.id, { supportCount: saved.supportCount });
    }
  } catch (error) {
    console.error("Could not sync support:", error);
  }

  showToast("Thanks — you've confirmed this issue too.");
}

function reportShareUrl(report: CivicReport): string {
  return `${window.location.origin}/dashboard?report=${encodeURIComponent(report.id)}`;
}

async function copyReportLink(report: CivicReport) {
  try {
    await navigator.clipboard.writeText(reportShareUrl(report));
    showToast("Report link copied.");
  } catch {
    showToast(reportShareUrl(report));
  }
}

async function handleAfterPhoto(report: CivicReport, file: File) {
  const localUrl = URL.createObjectURL(file);
  setAfterImageUrls((current) => ({ ...current, [report.id]: localUrl }));
  patchReport(report.id, { hasAfterPhoto: true });

  try {
    await saveReportImage(`${report.id}-after`, file);
  } catch (error) {
    console.error("Could not store after-photo locally:", error);
  }

  try {
    const prepared = await preparePhoto(file);
    await uploadServerAfterPhoto(report.id, prepared);
  } catch (error) {
    console.error("Could not sync after-photo:", error);
  }

  showToast("After photo saved.");
}


const visibleReports = addedReports.filter((report) => !report.hidden);
const pendingReports = addedReports.filter(
  (report) => report.syncState === "pending",
);

async function moderateReport(
  report: CivicReport,
  patch: { flagged?: boolean; hidden?: boolean },
) {
  patchReport(report.id, patch);

  try {
    const saved = await moderateServerReport(report.id, patch);
    if (saved) patchReport(report.id, {
      flagged: saved.flagged,
      hidden: saved.hidden,
    });
  } catch (error) {
    console.error("Could not sync moderation:", error);
    if ((error as { statusCode?: number }).statusCode === 401) {
      // Revert the optimistic change: the server refused it.
      patchReport(report.id, {
        flagged: report.flagged,
        hidden: report.hidden,
      });
      showToast("Moderator key required — add it in Settings.");
    }
  }
}

const syncingRef = useRef(false);

async function syncPendingReports() {
  if (syncingRef.current) return;
  const pending = addedReports.filter(
    (report) => report.syncState === "pending",
  );
  if (pending.length === 0) return;

  syncingRef.current = true;
  let synced = 0;

  try {
    for (const local of pending) {
      try {
        const saved = await createServerReport({
          title: local.title,
          category: local.category,
          location: local.location,
          latitude: local.latitude ?? null,
          longitude: local.longitude ?? null,
          description: local.description ?? "",
          status: local.status,
          priority: local.priority ?? "Medium",
          issueDetected: local.issueDetected ?? true,
          confidence: local.confidence ?? null,
          visibleEvidence: local.visibleEvidence ?? [],
          limitations: local.limitations ?? [],
        });

        // Carry the locally stored photo across to the server id.
        try {
          const blob = await getReportImage(local.id);
          if (blob) {
            await saveReportImage(
              saved.id,
              new File([blob], "photo.jpg", {
                type: blob.type || "image/jpeg",
              }),
            );
            const prepared = await preparePhoto(
              new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }),
            );
            saved.hasPhoto = await uploadServerPhoto(saved.id, prepared);
            await deleteReportImage(local.id);
          }
        } catch (error) {
          console.error("Could not migrate offline photo:", error);
        }

        if (local.status !== saved.status) {
          await updateServerReportStatus(saved.id, local.status).catch(
            () => null,
          );
          saved.status = local.status;
        }
        if ((local.supportCount ?? 0) > 0) saved.supportCount = local.supportCount;

        setAddedReports((current) =>
          current.map((report) => (report.id === local.id ? saved : report)),
        );
        setSelectedReport((current) =>
          current && current.id === local.id ? saved : current,
        );
        synced += 1;
      } catch (error) {
        console.error(`Could not sync ${local.id}:`, error);
      }
    }
  } finally {
    syncingRef.current = false;
  }

  if (synced > 0) {
    void refreshActivity();
    showToast(
      synced === pending.length
        ? "Offline reports synced to the server."
        : `Synced ${synced} of ${pending.length} offline reports.`,
    );
  }
}

// Retry the offline queue when connectivity returns.
const syncPendingRef = useRef(syncPendingReports);

useEffect(() => {
  syncPendingRef.current = syncPendingReports;
});

useEffect(() => {
  const onOnline = () => void syncPendingRef.current();
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}, []);

const myReportIds = new Set(addedReports.map((report) => report.id));
const notifications = activityFeed.filter(
  (item) =>
    myReportIds.has(item.reportId) && item.type !== "created",
);
const unseenNotifications = notifications.filter(
  (item) => !lastSeenAt || item.at > lastSeenAt,
).length;

function markNotificationsSeen() {
  const now = new Date().toISOString();
  setLastSeenAt(now);
  try {
    localStorage.setItem("civiclens-notif-seen", now);
  } catch {
    // Session-only seen state still works.
  }
}

const latestSavedReport = visibleReports[0] ?? null;

const featuredAnalysis =
  analysis ??
  (latestSavedReport
    ? {
        title: latestSavedReport.title,
        category: latestSavedReport.category,
        location: latestSavedReport.location,
        preview: resolveReportImage(
          latestSavedReport,
          reportImageUrls,
        ),
        observation:
          latestSavedReport.description ??
          "No description available.",
        priority: latestSavedReport.priority ?? "Medium",
        issueDetected: latestSavedReport.issueDetected ?? true,
        confidence: latestSavedReport.confidence ?? null,
        visibleEvidence: latestSavedReport.visibleEvidence ?? [],
        limitations: latestSavedReport.limitations ?? [],
      }
    : null);


  
function handleManual(file: File, preview: string) {
  setAnalysis({
    file,
    preview,
    title: "",
    category: "Other",
    location: "",
    latitude: null,
    longitude: null,
    description: "",
    observation:
      "Filed manually without AI analysis. Describe the problem in your own words — a reviewer will verify it.",
    priority: "Medium",
    issueDetected: true,
    confidence: null,
    visibleEvidence: [],
    limitations: ["Filed manually without AI analysis — awaiting human review."],
  });
}

function handleAnalyzed(
  file: File,
  preview: string,
  ai: AIAnalysis,
) {
  const priority: ReportPriority =
    ai.severity === "Uncertain" ? "Medium" : ai.severity;

  const observation = ai.issueDetected
    ? ai.description
    : "The model did not identify a clear infrastructure issue. Please review the image carefully.";

  setAnalysis({
    file,
    preview,
    title: ai.title,
    category: ai.category,
    location: "",
    latitude: null,
    longitude: null,
    description: ai.description,
    observation,
    priority,
    issueDetected: ai.issueDetected,
    confidence: ai.confidence,
    visibleEvidence: ai.visibleEvidence,
    limitations: ai.limitations,
  });
}
  
function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

// An open report is a likely duplicate when it is within 500m, or
// shares the same location text and category.
function findDuplicate(result: AnalysisResult): CivicReport | null {
  const locationKey = result.location.trim().toLowerCase();
  const categoryKey = result.category.trim().toLowerCase();

  return (
    addedReports.find((report) => {
      if (report.hidden || report.status === "Resolved") return false;

      if (
        result.latitude !== null &&
        result.longitude !== null &&
        report.latitude !== undefined &&
        report.longitude !== undefined
      ) {
        return (
          distanceMeters(
            result.latitude,
            result.longitude,
            report.latitude,
            report.longitude,
          ) < 500
        );
      }

      return (
        locationKey !== "" &&
        report.location.trim().toLowerCase() === locationKey &&
        report.category.trim().toLowerCase() === categoryKey
      );
    }) ?? null
  );
}

async function saveReport(result: AnalysisResult) {
  const duplicate = findDuplicate(result);

  if (duplicate) {
    const confirmInstead = window.confirm(
      `A similar open report already exists: "${duplicate.title}" (${duplicate.id}) at ${duplicate.location}.\n\nConfirm that report instead of filing a duplicate?`,
    );

    if (confirmInstead) {
      await supportReport(duplicate);
      setAnalysis(null);
      setSelectedReport(
        addedReports.find((report) => report.id === duplicate.id) ??
          duplicate,
      );
      return;
    }
  }

  let report: CivicReport;
  let offline = false;

  try {
    report = await createServerReport({
      title: result.title,
      category: result.category,
      location: result.location,
      latitude: result.latitude,
      longitude: result.longitude,
      description: result.description,
      status: "Submitted",
      priority: result.priority,
      issueDetected: result.issueDetected,
      confidence: result.confidence,
      visibleEvidence: result.visibleEvidence,
      limitations: result.limitations,
    });
  } catch (error) {
    console.error("Could not save report to the server:", error);
    offline = true;

    const id = offlineReportId();

    report = {
      id,
      title: result.title,
      category: result.category,
      location: result.location,
      latitude: result.latitude ?? undefined,
      longitude: result.longitude ?? undefined,
      time: "Just now",
      status: "Submitted",
      image: `indexeddb:${id}`,
      description: result.description,
      supportCount: 0,
      syncState: "pending" as const,
      createdAt: new Date().toISOString(),

      // Preserve the original AI assessment
      priority: result.priority,
      issueDetected: result.issueDetected,
      confidence: result.confidence,
      visibleEvidence: result.visibleEvidence,
      limitations: result.limitations,
    };
  }

  try {
    await saveReportImage(report.id, result.file);
  } catch (error) {
    console.error("Could not save report image:", error);
    setToast("Report saved, but the photo could not be stored.");
    window.setTimeout(() => setToast(""), 3000);
  }

  // Sync a downscaled copy to the server so the photo survives
  // beyond this browser. Best effort: the local original remains.
  if (!offline) {
    try {
      const prepared = await preparePhoto(result.file);
      report.hasPhoto = await uploadServerPhoto(report.id, prepared);
    } catch (error) {
      console.error("Could not sync photo to the server:", error);
    }
  }

  setAddedReports((current) => [report, ...current]);
  void refreshActivity();
  setAnalysis(null);
  setActive("My Reports");
  setToast(
    offline
      ? "Backend unreachable — saved in this browser only."
      : "Report saved. Thank you — it is now visible to the response team.",
  );

  window.setTimeout(() => setToast(""), 3000);
}


async function refreshActivity() {
  try {
    setActivityFeed(await fetchActivity());
  } catch (error) {
    console.error("Could not refresh activity:", error);
  }
}

function updateReportStatus(reportId: string, status: ReportStatus) {
  setAddedReports((current) =>
    current.map((report) =>
      report.id === reportId ? { ...report, status } : report,
    ),
  );

  setSelectedReport((current) =>
    current && current.id === reportId
      ? { ...current, status }
      : current,
  );

  // Best-effort sync: local-only reports resolve to null,
  // real failures are logged and keep the local change.
  void updateServerReportStatus(reportId, status)
    .then(() => refreshActivity())
    .catch((error) => {
      console.error(`Could not sync status for ${reportId}:`, error);

    });

  setToast("Report status updated.");
  window.setTimeout(() => setToast(""), 2500);
}

function updateReportPriority(reportId: string, priority: ReportPriority) {
  setAddedReports((current) =>
    current.map((report) =>
      report.id === reportId ? { ...report, priority } : report,
    ),
  );

  setSelectedReport((current) =>
    current && current.id === reportId
      ? { ...current, priority }
      : current,
  );

  void updateServerReportPriority(reportId, priority).catch((error) => {
    console.error(`Could not sync priority for ${reportId}:`, error);

  });

  setToast("Report priority updated.");
  window.setTimeout(() => setToast(""), 2500);
}

async function deleteReport(report: CivicReport) {
  const confirmed = window.confirm(
    `Delete "${report.title}"? This will permanently remove the report and its saved photo.`,
  );

  if (!confirmed) return;

  try {
    await deleteServerReport(report.id);
  } catch (error) {
    console.error(`Could not delete ${report.id} from the server:`, error);

    if ((error as { statusCode?: number }).statusCode === 401) {
      showToast("Moderator key required to delete — add it in Settings.");
      return;
    }
  }

  try {
    // Delete the stored photo for locally submitted reports.
    if (report.description !== undefined) {
      await deleteReportImage(report.id);
    }

    // Remove the report from local application state.
    setAddedReports((current) =>
      current.filter((item) => item.id !== report.id),
    );
    void refreshActivity();

    // Release the image URL from browser memory.
    const imageUrl = reportImageUrls[report.id];

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);

      setReportImageUrls((current) => {
        const updated = { ...current };
        delete updated[report.id];
        return updated;
      });
    }

    setSelectedReport(null);
    setToast("Report deleted successfully.");
  } catch (error) {
    console.error("Could not delete report:", error);
    setToast("Could not delete the report. Please try again.");
  }

  window.setTimeout(() => setToast(""), 3000);
}

  function exportReports() {
    const blob = new Blob([JSON.stringify(addedReports, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "civiclens-reports.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setToast("Reports exported as JSON.");
    window.setTimeout(() => setToast(""), 2500);
  }

  async function clearAllData() {
    if (addedReports.length === 0) {
      setToast("Nothing to clear.");
      window.setTimeout(() => setToast(""), 2500);
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete all ${addedReports.length} report(s) and their photos from this browser and the server?`,
    );

    if (!confirmed) return;

    for (const report of addedReports) {
      try {
        await deleteServerReport(report.id);
      } catch (error) {
        console.error(`Could not delete ${report.id} from server:`, error);
      }

      try {
        await deleteReportImage(report.id);
      } catch (error) {
        console.error(`Could not delete photo for ${report.id}:`, error);
      }

      const imageUrl = reportImageUrls[report.id];
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    }

    setReportImageUrls({});
    setAddedReports([]);
    setSelectedReport(null);
    void refreshActivity();
    setToast("All reports and photos deleted.");
    window.setTimeout(() => setToast(""), 3000);
  }

  function navigate(page: string) {
    setActive(page);
    setSidebarOpen(false);

    if (page === "Upload & Analyze") {
      document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
    } else if (page === "My Reports") {
      document.getElementById("reports")?.scrollIntoView({ behavior: "smooth" });
    } else if (page === "Map View") {
      document.getElementById("map-view")?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }


// Real reports submitted by users in this browser.
const allDashboardReports = [...visibleReports];

// Dashboard statistics use real user-submitted reports only.
const totalReports = allDashboardReports.length;

const resolvedReports = allDashboardReports.filter(
  (report) => report.status === "Resolved",
).length;

const underReviewReports = allDashboardReports.filter(
  (report) => report.status === "Under Review",
).length;

const attentionReports = allDashboardReports.filter(
  (report) =>
    (report.priority === "High" || report.priority === "Critical") &&
    report.status !== "Resolved",
).length;

const resolutionRate =
  totalReports > 0
    ? Math.round((resolvedReports / totalReports) * 100)
    : 0;

const submittedReports = allDashboardReports.filter(
  (report) => report.status === "Submitted",
).length;


  return (
    <div className={`app-shell ${lightMode ? "light-mode" : ""}`}>
      <div className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)} />

      <div className={sidebarOpen ? "sidebar-wrap sidebar-open" : "sidebar-wrap"}>
        <Sidebar active={active} onNavigate={navigate} reportCount={visibleReports.length} />
      </div>

      <div className="main-column">
        <Topbar
          onMenuClick={() => setSidebarOpen((value) => !value)}
          lightMode={lightMode}
          onToggleTheme={() => setLightMode((value) => !value)}
          notifications={notifications}
          unseenCount={unseenNotifications}
          onMarkSeen={markNotificationsSeen}
        />

        {active === "Community" ? (
          <main className="dashboard">
            <CommunityPage
              reports={visibleReports}
              imageUrls={reportImageUrls}
              onOpen={setSelectedReport}
              onUpload={() => navigate("Upload & Analyze")}
            />
          </main>
        ) : active === "Moderation" ? (
          <main className="dashboard">
            <ModerationPage
              reports={addedReports}
              onOpen={setSelectedReport}
              onModerate={(report, patch) => void moderateReport(report, patch)}
              onDelete={(report) => void deleteReport(report)}
            />
          </main>
        ) : active === "Insights" ? (
          <main className="dashboard">
            <InsightsPage
              reports={visibleReports}
              onOpen={setSelectedReport}
            />
          </main>
        ) : active === "Settings" ? (
          <main className="dashboard">
            <SettingsPage
              lightMode={lightMode}
              onToggleTheme={() => setLightMode((value) => !value)}
              tiles={tileProvider}
              onTileProvider={setTileProvider}
              reportCount={visibleReports.length}
              photoCount={Object.keys(reportImageUrls).length}
              onExport={exportReports}
              onClearData={() => void clearAllData()}
            />
          </main>
        ) : (
        <main className="dashboard">
          <motion.section
            className="hero-banner"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.45 }}
          >
            <div className="hero-content">
              <span className="hero-kicker">
                <span className="hero-kicker-dot" />
                Kaduna pilot · Open to everyone · No account needed
              </span>
              <h1>
                Turn everyday photos into
                <br />
                real <span>community impact.</span>
              </h1>
              <p>
                Spot infrastructure problems. Make the invisible visible.
                Turn local observations into actionable reports.
              </p>
              <div className="hero-actions">
                <button
                  className="button-primary"
                  onClick={() => navigate("Upload & Analyze")}
                >
                  <Camera size={17} /> Analyze a photo <ArrowRight size={16} />
                </button>
                <button
                  className="button-ghost"
                  onClick={() => navigate("My Reports")}
                >
                  Explore reports <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="hero-trust">
                <ShieldCheck size={15} />
                <span>Human-reviewed. Evidence-aware. Community-led.</span>
              </div>
            </div>

            <div className="hero-latest">
              <span className="hero-latest-label">Latest report</span>
              {latestSavedReport ? (
                <>
                  <strong>{latestSavedReport.title}</strong>
                  <span className="hero-latest-place">
                    <MapPin size={14} /> {latestSavedReport.location} ·{" "}
                    {latestSavedReport.time}
                  </span>
                  <span
                    className={`hero-latest-status hero-status-${latestSavedReport.status.replace(" ", "-").toLowerCase()}`}
                  >
                    {latestSavedReport.status}
                    {latestSavedReport.priority
                      ? ` · ${latestSavedReport.priority} priority`
                      : ""}
                  </span>
                  <button
                    className="button-ghost"
                    onClick={() => navigate("My Reports")}
                  >
                    Open the queue <ArrowUpRight size={15} />
                  </button>
                </>
              ) : (
                <>
                  <strong>No reports filed yet</strong>
                  <span className="hero-latest-place">
                    Be the first to document a problem in your area.
                  </span>
                  <button
                    className="button-ghost"
                    onClick={() => navigate("Upload & Analyze")}
                  >
                    File a report <ArrowRight size={15} />
                  </button>
                </>
              )}
            </div>
          </motion.section>

          <div className="demo-disclaimer">
            <span className="disclaimer-icon"><Activity size={15} /></span>
            <span>
              <strong>Open prototype</strong> · Dashboard statistics count
              real filed reports. Sample reports are labelled “Sample”
              in the list and never mixed into these numbers.
            </span>
            <span className="disclaimer-status">OPEN ACCESS</span>
          </div>

          {pendingReports.length > 0 && (
            <div className="first-run-banner">
              <div>
                <strong>
                  {pendingReports.length} report
                  {pendingReports.length === 1 ? "" : "s"} waiting to sync.
                </strong>
                <span>
                  Saved on this device while the server was unreachable.
                  They sync automatically when you are back online.
                </span>
              </div>
              <button
                className="button-primary"
                onClick={() => void syncPendingReports()}
              >
                <RefreshCw size={16} /> Sync now
              </button>
            </div>
          )}

          {totalReports === 0 && (
            <div className="first-run-banner">
              <div>
                <strong>Nothing filed yet in this workspace.</strong>
                <span>
                  Photograph a problem near you and file the first
                  report — it takes under a minute, no account needed.
                </span>
              </div>
              <button
                className="button-primary"
                onClick={() => navigate("Upload & Analyze")}
              >
                <Camera size={16} /> File the first report
              </button>
            </div>
          )}

          <section className="queue-summary" aria-label="Report queue summary">
            <div className="queue-summary-item">
              <strong>{submittedReports}</strong>
              <span>Submitted, awaiting review</span>
            </div>
            <div className="queue-summary-item">
              <strong>{underReviewReports}</strong>
              <span>Under review</span>
            </div>
            <div className="queue-summary-item queue-summary-attention">
              <strong>{attentionReports}</strong>
              <span>High or critical, unresolved</span>
            </div>
            <div className="queue-summary-item">
              <strong>{resolvedReports}</strong>
              <span>Resolved</span>
            </div>
            <div className="queue-summary-progress">
              <span>Resolution rate</span>
              <div
                className="queue-progress-track"
                role="img"
                aria-label={`Resolution rate ${resolutionRate} percent`}
              >
                <div
                  className="queue-progress-fill"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <strong>{resolutionRate}%</strong>
            </div>
          </section>

          <div className="main-grid">
            <div className="primary-column">
              <UploadPanel onAnalyzed={handleAnalyzed} onManual={handleManual} />

              <section className="panel featured-panel">
                <div className="panel-heading">
                  <div>
                                        <h2>Featured analysis <span className="ai-tag"><ScanSearch size={12} /> AI-assisted</span></h2>
                    <p>A preview of the evidence review experience.</p>
                  </div>
                  <button className="text-action" onClick={() => navigate("My Reports")}>
                    All reports <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="featured-content">
{featuredAnalysis ? (
  <>
    <div className="featured-image-wrap">
      {featuredAnalysis.preview ? (
        <img
          src={featuredAnalysis.preview}
          alt={`Uploaded image for ${featuredAnalysis.title}`}
        />
      ) : null}

      <div className="image-overlay-label">
        <span className="status-dot" />
        AI ANALYSIS
      </div>

      <div className="image-scan-line" />
      <div className="scan-corner corner-tl" />
      <div className="scan-corner corner-tr" />
      <div className="scan-corner corner-bl" />
      <div className="scan-corner corner-br" />
    </div>

    <div className="featured-details">
      <span className="success-pill">
        <CircleCheck size={13} />
        Preliminary AI assessment
      </span>

      <h3>{featuredAnalysis.title}</h3>

      <div className="location-line">
        <MapPin size={13} />
        {featuredAnalysis.location.trim() || "Location not specified"}
      </div>

      <div className="badge-row">
        <span className="priority-pill">
          {featuredAnalysis.priority}
        </span>

        <span className="category-pill">
          {featuredAnalysis.category}
        </span>
      </div>

      <p className="featured-description">
        {featuredAnalysis.observation}
      </p>

      {featuredAnalysis.confidence !== null && (
        <p className="featured-description">
          Model confidence:{" "}
          {Math.round(featuredAnalysis.confidence * 100)}%
        </p>
      )}

      {featuredAnalysis.visibleEvidence.length > 0 && (
        <div className="featured-description">
          <strong>Visible evidence</strong>
          <ul>
            {featuredAnalysis.visibleEvidence.slice(0, 3).map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {featuredAnalysis.limitations.length > 0 && (
        <p className="featured-description">
          <strong>Limitations:</strong>{" "}
          {featuredAnalysis.limitations.slice(0, 2).join(" ")}
        </p>
      )}

      <div className="feature-actions">
        <button
          className="button-primary"
          onClick={() => navigate("Upload & Analyze")}
        >
          Analyze another image <ArrowRight size={15} />
        </button>
      </div>
    </div>
  </>
) : (
  <>
    <div className="featured-image-wrap featured-empty">
      <div className="image-overlay-label">
        CIVICLENS AI
      </div>

      <div className="scan-corner corner-tl" />
      <div className="scan-corner corner-tr" />
      <div className="scan-corner corner-bl" />
      <div className="scan-corner corner-br" />

      <div className="featured-empty-message">
        <Search size={32} />
        <strong>No reports yet — file the first one</strong>
        <span>
          Upload a photo above. Analyze it with AI, or file it
          manually in your own words.
        </span>
      </div>
    </div>

    <div className="featured-details">
      <span className="success-pill">
        <Activity size={13} />
        Ready for analysis
      </span>

      <h3>Your latest AI assessment</h3>

      <p className="featured-description">
        Take a photo of a pothole, blocked drain, flooding or
        another infrastructure issue. File it manually, or let AI
        draft the assessment first — a human reviews every report
        either way.
      </p>

      <div className="feature-actions">
        <button
          className="button-primary"
          onClick={() => navigate("Upload & Analyze")}
        >
          Try image analysis <ArrowRight size={15} />
        </button>
      </div>
    </div>
  </>
)}


              <div className="detection-list">
                    <span className="detection-heading">ANALYSIS OUTPUT</span>
                    {[
                      ["01", "Visible observations", "What can be seen"],
                      ["02", "Possible concerns", "Clearly marked inference"],
                      ["03", "Uncertainty", "What needs verification"],
                    ].map(([number, title, description]) => (
                      <div className="detection-item" key={number}>
                        <span className="detection-number">{number}</span>
                        <div>
                          <strong>{title}</strong>
                          <span>{description}</span>
                        </div>
                      </div>
                    ))}
                    <div className="model-note">
                      <ShieldCheck size={14} />
                      Human confirmation required
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel map-panel" id="map-view">
  <div className="panel-heading">
    <div>
            <h2>Community issue map</h2>
      <p>Explore the map and review reports with geographic coordinates.</p>
    </div>
    <span className="map-demo-badge">
      <span className="online-dot" /> INTERACTIVE MAP
    </span>
  </div>

  <Suspense
    fallback={<p className="activity-empty">Loading map…</p>}
  >
    <CivicMap
      reports={[...visibleReports, ...reports]}
      onOpenReport={setSelectedReport}
      tiles={tileProvider}
    />
  </Suspense>
</section>

            </div>

            <aside className="right-column">
              <section className="panel queue-health">
                <div className="panel-heading compact-heading">
                  <div>
                                        <h2>What needs attention</h2>
                  </div>
                  <Activity size={18} className="muted" />
                </div>
                <div className="queue-health-rows">
                  <div className="queue-health-row">
                    <span>Open cases</span>
                    <strong>{totalReports - resolvedReports}</strong>
                  </div>
                  <div className="queue-health-row">
                    <span>High or critical, unresolved</span>
                    <strong>{attentionReports}</strong>
                  </div>
                  <div className="queue-health-row">
                    <span>Resolution rate</span>
                    <strong>{resolutionRate}%</strong>
                  </div>
                  <div className="queue-health-row">
                    <span>Most reported area</span>
                    <strong>
                      {allDashboardReports.length
                        ? Object.entries(
                            allDashboardReports.reduce<Record<string, number>>(
                              (acc, report) => {
                                acc[report.location] =
                                  (acc[report.location] ?? 0) + 1;
                                return acc;
                              },
                              {},
                            ),
                          ).sort((a, b) => b[1] - a[1])[0][0]
                        : "—"}
                    </strong>
                  </div>
                </div>
                <p className="queue-health-note">
                  Counts real filed reports only. Sample reports are
                  labelled and excluded.
                </p>
                <button
                  className="text-action"
                  onClick={() => navigate("My Reports")}
                >
                  Work the queue <ArrowUpRight size={15} />
                </button>
              </section>

              <section className="panel impact-panel">
                <div className="panel-heading compact-heading">
                  <div>
                                        <h2>Community impact</h2>
                  </div>
                  <Activity size={18} className="muted" />
                </div>
                <div className="impact-grid">
                  <div className="impact-cell">
                    <span className="impact-icon blue"><FileText size={17} /></span>
                    <div><strong>{totalReports}</strong><span>Total reports</span></div>
                  </div>
                  <div className="impact-cell">
                    <span className="impact-icon green"><CircleCheck size={17} /></span>
                    <div><strong>{resolvedReports}</strong><span>Resolved</span></div>
                  </div>
                  <div className="impact-cell">
                  <span className="impact-icon purple"><Clock3 size={17} /></span>
                  <div><strong>{underReviewReports}</strong><span>Under review</span></div>
                  </div>

                  <div className="impact-cell">
                    <span className="impact-icon orange"><TriangleAlert size={17} /></span>
                    <div><strong>{attentionReports}</strong><span>Needs attention</span></div>
                  </div>
                </div>
                <div className="impact-note">
                  <ArrowDownRight size={15} />
                  Statistics update from the current report dataset.
                </div>
              </section>

              <section className="panel activity-panel">
                <div className="panel-heading compact-heading">
                  <div>
                                        <h2>Recent activity</h2>
                  </div>
                  <span className="activity-live-dot" />
                </div>

                <div className="activity-list">
                  {activityFeed.length === 0 ? (
                    <p className="activity-empty">
                      No activity yet — submit your first report.
                    </p>
                  ) : (
                    activityFeed.map((item, index) => (
                      <div className="activity-item" key={item.id}>
                        <span className={`activity-icon activity-${index % 4}`}>
                          {item.type === "resolved" ? <CircleCheck size={15} /> :
                            item.type === "updated" ? <Activity size={15} /> :
                              <FileText size={15} />}
                        </span>
                        <div className="activity-copy">
                          <strong>{item.heading}</strong>
                          <span>{item.detail}</span>
                        </div>
                        <time>{item.time}</time>
                      </div>
                    ))
                  )}
                </div>
                <div className="activity-disclaimer">
                  <ShieldCheck size={13} /> Live submissions from this workspace
                </div>
              </section>

              <section className="next-step-card">
                <span className="next-step-icon"><Zap size={19} /></span>
                                <h3>Make the first observation count.</h3>
                <p>Try your own image and explore how the report workflow feels.</p>
                <button className="button-primary full-button" onClick={() => navigate("Upload & Analyze")}>
                  Start with a photo <ArrowRight size={15} />
                </button>
              </section>
            </aside>
          </div>

          <ReportsPanel
  onOpen={setSelectedReport}
  addedReports={visibleReports}
  imageUrls={reportImageUrls}
/>

          <footer className="app-footer">
            <div className="footer-brand"><span className="footer-eye">â—‰</span> CivicLens <b>AI</b></div>
            <span>Civic infrastructure reports for Kaduna</span>
            <span>Hackathon prototype Â· Not an official reporting service</span>
          </footer>
        </main>
        )}
      </div>

      <AnimatePresence>
        {analysis && (
          <AnalysisModal
            result={analysis}
            onClose={() => setAnalysis(null)}
            onSave={saveReport}
            tiles={tileProvider}
          />
        )}
        {selectedReport && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReport(null)}
          >
            <motion.section
              className="analysis-modal report-detail-modal"
              role="dialog"
              aria-modal="true"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <span className="report-source">
  {selectedReport.id} ·{" "}
  {selectedReport.description !== undefined
    ? "USER SUBMISSION"
    : "SAMPLE REPORT"}
</span>
                  <h2>{selectedReport.title}</h2>
                </div>
                <button className="icon-button" onClick={() => setSelectedReport(null)} aria-label="Close report">
                  <X size={19} />
                </button>
              </div>
              {resolveReportImage(selectedReport, reportImageUrls) ? (
                <img
                  className="modal-photo"
                  src={resolveReportImage(selectedReport, reportImageUrls)}
                  alt={`Evidence for ${selectedReport.title}`}
                />
              ) : null}
              
<div className="detail-info">
  <span><MapPin size={15} /> {selectedReport.location || "Location not provided"}</span>
  <span><Clock3 size={15} /> {selectedReport.time}</span>
  <span className={`status-badge ${selectedReport.status.toLowerCase().replaceAll(" ", "-")}`}>
    {selectedReport.status}
  </span>
</div>

{selectedReport.description !== undefined && (
  <>
    <label className="field-label">
      Update report status
      <select
        value={selectedReport.status}
        onChange={(event) =>
          updateReportStatus(
            selectedReport.id,
            event.target.value as ReportStatus,
          )
        }
      >
        <option value="Submitted">Submitted</option>
        <option value="Under Review">Under Review</option>
        <option value="Resolved">Resolved</option>
      </select>
    </label>
    <label className="field-label">
      Update priority
      <select
        value={selectedReport.priority ?? "Medium"}
        onChange={(event) =>
          updateReportPriority(
            selectedReport.id,
            event.target.value as ReportPriority,
          )
        }
      >
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
        <option value="Critical">Critical</option>
      </select>
    </label>
  </>
)}
              
<p className="detail-copy">
  {selectedReport.description
    ? selectedReport.description
    : "This is a sample report for demonstration purposes."}
</p>

{(selectedReport.confidence != null ||
  selectedReport.issueDetected !== undefined ||
  (selectedReport.visibleEvidence?.length ?? 0) > 0 ||
  (selectedReport.limitations?.length ?? 0) > 0) && (
  <div className="observation-box">
    <div className="observation-title">
      <Target size={16} />
      AI visual assessment
    </div>

    <div className="analysis-metadata">
      <strong>
        Confidence:{" "}
        {selectedReport.confidence == null
          ? "Not provided"
          : `${Math.round(selectedReport.confidence * 100)}%`}
      </strong>
      {selectedReport.issueDetected !== undefined && (
        <span>
          Issue detected: {selectedReport.issueDetected ? "Yes" : "No"}
        </span>
      )}
      {selectedReport.priority && (
        <span>Priority: {selectedReport.priority}</span>
      )}
    </div>

    {(selectedReport.visibleEvidence?.length ?? 0) > 0 && (
      <>
        <strong>Visible evidence</strong>
        <ul>
          {selectedReport.visibleEvidence!.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      </>
    )}

    {(selectedReport.limitations?.length ?? 0) > 0 && (
      <>
        <strong>Limitations</strong>
        <ul>
          {selectedReport.limitations!.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      </>
    )}

    <span>
      AI-generated findings can be incorrect. Verify the details
      before acting on this report.
    </span>
  </div>
)}

              {(afterImageUrls[selectedReport.id] ??
                resolveAfterImage(selectedReport)) ? (
                <div className="before-after">
                  <figure>
                    {resolveReportImage(selectedReport, reportImageUrls) ? (
                      <img
                        src={resolveReportImage(selectedReport, reportImageUrls)}
                        alt={`Before: ${selectedReport.title}`}
                      />
                    ) : null}
                    <figcaption>Before</figcaption>
                  </figure>
                  <figure>
                    <img
                      src={
                        afterImageUrls[selectedReport.id] ??
                        resolveAfterImage(selectedReport)
                      }
                      alt={`After: ${selectedReport.title}`}
                    />
                    <figcaption>After</figcaption>
                  </figure>
                </div>
              ) : null}

              {selectedReport.status === "Resolved" &&
                selectedReport.description !== undefined && (
                  <label className="button-secondary after-upload">
                    <Camera size={15} />
                    {resolveAfterImage(selectedReport) ||
                    afterImageUrls[selectedReport.id]
                      ? "Replace after photo"
                      : "Add after photo"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleAfterPhoto(selectedReport, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                )}

              {reportHistory.length > 0 && (
                <div className="timeline">
                  <strong>Status timeline</strong>
                  {reportHistory.map((entry) => (
                    <div className="timeline-item" key={entry.id}>
                      <span className="timeline-dot" />
                      <span>
                        {entry.fromStatus
                          ? `${entry.fromStatus} → ${entry.toStatus}`
                          : `Filed as ${entry.toStatus}`}
                      </span>
                      <time>
                        {new Date(entry.changedAt).toLocaleString()}
                      </time>
                    </div>
                  ))}
                </div>
              )}

              <div className="share-actions">
                <button
                  className="button-secondary"
                  onClick={() => void supportReport(selectedReport)}
                  disabled={supportedIds.includes(selectedReport.id)}
                >
                  <ThumbsUp size={15} />
                  {supportedIds.includes(selectedReport.id)
                    ? "Confirmed by you"
                    : "I see this too"}
                  {` (${selectedReport.supportCount ?? 0})`}
                </button>
                <button
                  className="button-secondary"
                  onClick={() =>
                    void moderateReport(selectedReport, {
                      flagged: !selectedReport.flagged,
                    })
                  }
                >
                  <Flag size={15} />
                  {selectedReport.flagged ? "Flagged" : "Flag for review"}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => void copyReportLink(selectedReport)}
                >
                  <Link2 size={15} /> Copy link
                </button>
                <a
                  className="button-secondary"
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `${selectedReport.title} — ${selectedReport.location}\n${reportShareUrl(selectedReport)}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Share2 size={15} /> WhatsApp
                </a>
              </div>

              <div className="report-actions">
  {selectedReport.description !== undefined && (
    <button
      className="button-secondary"
      onClick={() => deleteReport(selectedReport)}
    >
      Delete report
    </button>
  )}

  <button
    className="button-primary full-button"
    onClick={() => setSelectedReport(null)}
  >
    Close report <Check size={15} />
  </button>
</div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast-message"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            role="status"
          >
            <CircleCheck size={17} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

