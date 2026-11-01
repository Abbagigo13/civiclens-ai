import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Camera,
  CircleCheck,
  Clock3,
  FileText,
  MapPin,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { CivicReport } from "../../data/mockData";
import { resolveReportImage } from "../../api/reports";
import ReportCard from "../../components/ReportCard";

type Props = {
  reports: CivicReport[];
  imageUrls: Record<string, string>;
  onOpen: (report: CivicReport) => void;
  onUpload: () => void;
};

const filters = [
  "All reports",
  "Submitted",
  "Under Review",
  "Resolved",
  "Needs attention",
];

export default function CommunityPage({
  reports,
  imageUrls,
  onOpen,
  onUpload,
}: Props) {
  const [filter, setFilter] = useState("All reports");
  const [query, setQuery] = useState("");

  const resolved = reports.filter(
    (report) => report.status === "Resolved",
  ).length;
  const underReview = reports.filter(
    (report) => report.status === "Under Review",
  ).length;
  const attention = reports.filter(
    (report) =>
      (report.priority === "High" || report.priority === "Critical") &&
      report.status !== "Resolved",
  ).length;

  const stats = [
    { label: "Reports shared", value: reports.length, icon: FileText },
    { label: "Resolved", value: resolved, icon: CircleCheck },
    { label: "Under review", value: underReview, icon: Clock3 },
    { label: "Needs attention", value: attention, icon: TriangleAlert },
  ];

  const districts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const report of reports) {
      const key = report.location.trim() || "Unspecified location";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [reports]);

  const districtMax = districts[0]?.[1] ?? 1;

  const visibleReports = reports.filter((report) => {
    const needsAttention =
      (report.priority === "High" || report.priority === "Critical") &&
      report.status !== "Resolved";

    const matchesFilter =
      filter === "All reports"
        ? true
        : filter === "Needs attention"
          ? needsAttention
          : report.status === filter;

    const searchText =
      `${report.title} ${report.location} ${report.category}`.toLowerCase();

    return matchesFilter && searchText.includes(query.toLowerCase());
  });

  return (
    <div className="community-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">COMMUNITY</span>
            <h2>Reports from your neighbors</h2>
            <p>
              Every report submitted through this workspace, shared for
              community visibility.
            </p>
          </div>
          <button className="text-action" onClick={onUpload}>
            New report <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="community-stats">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div className="community-stat" key={stat.label}>
                <span className="community-stat-icon">
                  <Icon size={17} />
                </span>
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="community-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">NEIGHBORHOOD SPOTLIGHT</span>
              <h2>Where reports come from</h2>
            </div>
          </div>

          {districts.length === 0 ? (
            <div className="empty-state">
              <MapPin size={23} />
              <strong>No districts yet</strong>
              <span>
                Submit a report with a location to light up the map.
              </span>
            </div>
          ) : (
            <div className="district-list">
              {districts.map(([name, count]) => (
                <div className="district-row" key={name}>
                  <div className="district-row-head">
                    <span>
                      <MapPin size={13} /> {name}
                    </span>
                    <strong>
                      {count} report{count === 1 ? "" : "s"}
                    </strong>
                  </div>
                  <div className="district-bar">
                    <span
                      style={{
                        width: `${Math.round(
                          (count / districtMax) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">COMMUNITY FEED</span>
              <h2>Latest activity</h2>
            </div>
          </div>

          <div className="report-toolbar">
            <label className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reports or locations..."
              />
            </label>
          </div>

          <div className="filter-chips">
            {filters.map((item) => (
              <button
                key={item}
                className={`filter-chip ${filter === item ? "selected" : ""}`}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="report-list">
            {visibleReports.length ? (
              visibleReports.map((report) => {
                const image = resolveReportImage(report, imageUrls);

                return (
                  <ReportCard
                    key={report.id}
                    report={{ ...report, image }}
                    onOpen={() => onOpen({ ...report, image })}
                  />
                );
              })
            ) : (
              <div className="empty-state">
                <Users size={23} />
                <strong>
                  {reports.length === 0
                    ? "No community reports yet"
                    : "No matching reports"}
                </strong>
                <span>
                  {reports.length === 0
                    ? "Be the first to document an issue in your neighborhood."
                    : "Try another search or filter."}
                </span>
                {reports.length === 0 && (
                  <button
                    className="button-primary"
                    onClick={onUpload}
                  >
                    <Camera size={16} /> Analyze your first photo
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
