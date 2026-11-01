import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { reports as initialReports } from "../../data/mockData";
import type { CivicReport } from "../../data/mockData";
import { resolveReportImage } from "../../api/reports";
import ReportCard from "../../components/ReportCard";

type Props = {
  onOpen: (report: CivicReport) => void;
  addedReports: CivicReport[];
  imageUrls: Record<string, string>;
};

const filters = [
  "All reports",
  "Submitted",
  "Under Review",
  "Resolved",
  "Needs attention",
  "Demo Reports",
];

export default function ReportsPanel({
  onOpen,
  addedReports,
  imageUrls,
}: Props) {
  const [filter, setFilter] = useState("All reports");
  const [query, setQuery] = useState("");

  const allReports = useMemo(() => {
    const realReports = addedReports.map((report) => ({
      ...report,
      reportSource: "real" as const,
    }));

    const demoReports = initialReports.map((report) => ({
      ...report,
      reportSource: "demo" as const,
    }));

    return [...realReports, ...demoReports];
  }, [addedReports]);

  const visibleReports = allReports.filter((report) => {
    const isDemo = report.reportSource === "demo";
    const needsAttention =
      (report.priority === "High" || report.priority === "Critical") &&
      report.status !== "Resolved";

    const matchesFilter =
      filter === "All reports"
        ? !isDemo
        : filter === "Demo Reports"
          ? isDemo
          : filter === "Needs attention"
            ? needsAttention && !isDemo
            : report.status === filter && !isDemo;

    const searchText =
      `${report.title} ${report.location} ${report.category}`.toLowerCase();

    return matchesFilter && searchText.includes(query.toLowerCase());
  });

  return (
    <section className="panel reports-panel" id="reports">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">COMMUNITY FEEDBACK LOOP</span>
          <h2>Recent reports</h2>
          <p>
            Browse submitted reports or explore clearly labelled examples.
          </p>
        </div>

        <button
          className="text-action"
          onClick={() => {
            setFilter("All reports");
            setQuery("");
          }}
        >
          View all <ArrowUpRight size={15} />
        </button>
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

        <button
          className="filter-button"
          onClick={() => {
            const index = filters.indexOf(filter);
            setFilter(filters[(index + 1) % filters.length]);
          }}
          title="Cycle report filters"
        >
          <SlidersHorizontal size={15} />
          Filter
        </button>
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
              <div key={`${report.reportSource}-${report.id}`}>
                {report.reportSource === "demo" && (
                  <span className="demo-label">DEMO EXAMPLE</span>
                )}

                <ReportCard
                  report={{ ...report, image }}
                  onOpen={() => onOpen({ ...report, image })}
                />
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <Search size={23} />
            <strong>
              {filter === "Demo Reports"
                ? "No demo reports found"
                : filter === "All reports"
                  ? "No reports submitted yet"
                  : "No matching reports"}
            </strong>
            <span>
              {filter === "All reports"
                ? "Upload an image and analyze an infrastructure issue to create your first report."
                : "Try another search or filter."}
            </span>
          </div>
        )}
      </div>

      <div className="reports-footer">
        <span>Showing {visibleReports.length} reports</span>
        <span className="demo-label">
          {filter === "Demo Reports"
            ? "DEMONSTRATION DATA"
            : filter === "All reports"
              ? "USER SUBMISSIONS"
              : "FILTERED REPORTS"}
        </span>
      </div>
    </section>
  );
}