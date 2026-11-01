import { useEffect, useState } from "react";
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
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatCard from "./components/StatCard";
import UploadPanel, {
  type AIAnalysis,
} from "./features/analysis/UploadPanel";
import ReportsPanel from "./features/reports/ReportsPanel";
import CommunityPage from "./features/community/CommunityPage";
import SettingsPage from "./features/settings/SettingsPage";
import CivicMap from "./components/CivicMap";
import LocationPicker from "./components/LocationPicker";
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
} from "./api/reports";
import type { ActivityItem } from "./api/reports";
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
            <span className="eyebrow">LOCAL DEMONSTRATION</span>
            <h2 id="analysis-title">Review your report</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <div className="modal-notice">
  <Sparkles size={17} />
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
  <LocationPicker
    latitude={latitude}
    longitude={longitude}
    tiles={tiles}
    onSelect={(lat, lng) => {
      setLatitude(lat);
      setLongitude(lng);
    }}
  />
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
  const [toast, setToast] = useState("");
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  
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

const latestSavedReport = addedReports[0] ?? null;

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
  
async function saveReport(result: AnalysisResult) {
  let report: CivicReport;
  let offline = false;
  let authRejected = false;

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
    authRejected =
      (error as { statusCode?: unknown }).statusCode === 401;

    const id = `CL-${Date.now().toString().slice(-6)}`;

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
    authRejected
      ? "Server rejected the API key — saved in this browser only. Check Settings."
      : offline
        ? "Backend unreachable — saved in this browser only."
        : "Report saved.",
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

      if ((error as { statusCode?: unknown }).statusCode === 401) {
        setToast("Server rejected the API key. Check Settings.");
        window.setTimeout(() => setToast(""), 3000);
      }
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

    if ((error as { statusCode?: unknown }).statusCode === 401) {
      setToast("Server rejected the API key. Check Settings.");
      window.setTimeout(() => setToast(""), 3000);
    }
  });

  setToast("Report priority updated.");
  window.setTimeout(() => setToast(""), 2500);
}

async function deleteReport(report: CivicReport) {
  const confirmed = window.confirm(
    `Delete "${report.title}"? This will permanently remove the report and its saved photo.`,
  );

  if (!confirmed) return;

  await deleteServerReport(report.id).catch((error) => {
    console.error(`Could not delete ${report.id} from the server:`, error);

    if ((error as { statusCode?: unknown }).statusCode === 401) {
      setToast("Server rejected the API key. Check Settings.");
      window.setTimeout(() => setToast(""), 3000);
    }
  });

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
const allDashboardReports = [...addedReports];

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

const stats = [
  {
    label: "Total reports",
    value: totalReports,
    change: "User-submitted reports",
    icon: FileText,
    tone: "blue" as const,
  },
  {
    label: "Resolved",
    value: resolvedReports,
    change: `${resolutionRate}% resolution rate`,
    icon: CircleCheck,
    tone: "green" as const,
  },
  {
    label: "Under review",
    value: underReviewReports,
    change: "Currently being tracked",
    icon: Clock3,
    tone: "purple" as const,
  },
  {
    label: "Needs attention",
    value: attentionReports,
    change: "High or critical priority",
    icon: TriangleAlert,
    tone: "orange" as const,
  },
];


  return (
    <div className={`app-shell ${lightMode ? "light-mode" : ""}`}>
      <div className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)} />

      <div className={sidebarOpen ? "sidebar-wrap sidebar-open" : "sidebar-wrap"}>
        <Sidebar active={active} onNavigate={navigate} />
      </div>

      <div className="main-column">
        <Topbar
          onMenuClick={() => setSidebarOpen((value) => !value)}
          lightMode={lightMode}
          onToggleTheme={() => setLightMode((value) => !value)}
        />

        {active === "Community" ? (
          <main className="dashboard">
            <CommunityPage
              reports={addedReports}
              imageUrls={reportImageUrls}
              onOpen={setSelectedReport}
              onUpload={() => navigate("Upload & Analyze")}
            />
          </main>
        ) : active === "Settings" ? (
          <main className="dashboard">
            <SettingsPage
              lightMode={lightMode}
              onToggleTheme={() => setLightMode((value) => !value)}
              tiles={tileProvider}
              onTileProvider={setTileProvider}
              reportCount={addedReports.length}
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
                SEE YOUR COMMUNITY DIFFERENTLY
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

            <div className="hero-art" aria-hidden="true">
              <div className="hero-orb orb-one" />
              <div className="hero-orb orb-two" />
              <div className="hero-orb orb-three" />
              <div className="hero-grid" />
              <div className="hero-glass-card">
                <span className="glass-icon"><Sparkles size={16} /></span>
                <div>
                  <strong>From observation</strong>
                  <span>to community action</span>
                </div>
                <ArrowUpRight size={17} />
              </div>
              <div className="hero-art-caption">
                <span>01 / OBSERVE</span>
                <span>02 / UNDERSTAND</span>
                <span>03 / ACT</span>
              </div>
            </div>
          </motion.section>

          <div className="demo-disclaimer">
            <span className="disclaimer-icon"><Activity size={15} /></span>
            <span>
              <strong>Interactive prototype</strong> Â· Dashboard statistics
              and sample reports are illustrative, not live civic data.
            </span>
            <span className="disclaimer-status">LOCAL DEMO</span>
          </div>

          <motion.section
            className="stats-grid"
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            initial="hidden"
            animate="visible"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                transition={{ duration: 0.35 }}
              >
                <StatCard {...stat} />
              </motion.div>
            ))}
          </motion.section>

          <div className="main-grid">
            <div className="primary-column">
              <UploadPanel onAnalyzed={handleAnalyzed} />

              <section className="panel featured-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">VISUAL INTELLIGENCE</span>
                    <h2>Featured analysis <span className="ai-tag"><Sparkles size={12} /> AI concept</span></h2>
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
      <img
        src={featuredAnalysis.preview}
        alt={`Uploaded image for ${featuredAnalysis.title}`}
      />

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
        <strong>No analysis yet</strong>
        <span>Upload an infrastructure image to get started.</span>
      </div>
    </div>

    <div className="featured-details">
      <span className="success-pill">
        <Activity size={13} />
        Ready for analysis
      </span>

      <h3>Your latest AI assessment</h3>

      <p className="featured-description">
        Analyze a photo of a pothole, blocked drain, flooding,
        or another infrastructure issue. CivicLens AI will
        return preliminary observations for human review.
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
      <span className="eyebrow">LOCAL AWARENESS</span>
      <h2>Community issue map</h2>
      <p>Explore the map and review reports with geographic coordinates.</p>
    </div>
    <span className="map-demo-badge">
      <span className="online-dot" /> INTERACTIVE MAP
    </span>
  </div>

  <CivicMap
    reports={[...addedReports, ...reports]}
    onOpenReport={setSelectedReport}
    tiles={tileProvider}
  />
</section>

            </div>

            <aside className="right-column">
              <section className="model-card">
                <div className="model-card-header">
                  <span className="model-logo"><Sparkles size={17} /></span>
                  <div>
                    <span className="eyebrow">AI INFRASTRUCTURE</span>
                    <h3>Built for visual intelligence.</h3>
                  </div>
                </div>
                <p className="model-card-copy">
                  Designed to integrate multimodal reasoning and image segmentation.
                </p>
                <div className="model-item">
  <span className="model-icon purple">
    <Sparkles size={17} />
  </span>

  <div>
    <strong>Muse Spark 1.3</strong>
    <span>Live image analysis integration</span>
  </div>

  <span className="model-state">INTEGRATED</span>
</div>
                <div className="model-item">
                  <span className="model-icon purple"><Sparkles size={17} /></span>
                  <div><strong>Muse Spark</strong><span>Planned multimodal reasoning</span></div>
                  <span className="model-state">PLANNED</span>
                </div>
                <div className="model-card-foot">
                  <ShieldCheck size={14} />
                  Provider access must be verified
                </div>
              </section>

              <section className="panel impact-panel">
                <div className="panel-heading compact-heading">
                  <div>
                    <span className="eyebrow">AT A GLANCE</span>
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
                    <span className="eyebrow">THE FEEDBACK LOOP</span>
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
                <span className="eyebrow">YOUR NEXT STEP</span>
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
  addedReports={addedReports}
  imageUrls={reportImageUrls}
/>

          <footer className="app-footer">
            <div className="footer-brand"><span className="footer-eye">â—‰</span> CivicLens <b>AI</b></div>
            <span>See it. Report it. Make it better.</span>
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
                  <span className="eyebrow">
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
              <img
  className="modal-photo"
  src={resolveReportImage(selectedReport, reportImageUrls)}
  alt={`Evidence for ${selectedReport.title}`}
/>
              
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

