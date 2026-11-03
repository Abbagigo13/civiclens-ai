import { useMemo } from "react";
import {
  CircleCheck,
  Clock3,
  Download,
  FileText,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import type { CivicReport } from "../../data/mockData";

type Props = {
  reports: CivicReport[];
  onOpen: (report: CivicReport) => void;
};

function countBy(
  reports: CivicReport[],
  key: (report: CivicReport) => string,
) {
  const counts = new Map<string, { total: number; open: number }>();

  for (const report of reports) {
    const name = key(report).trim() || "Unspecified";
    const entry = counts.get(name) ?? { total: 0, open: 0 };
    entry.total += 1;
    if (report.status !== "Resolved") entry.open += 1;
    counts.set(name, entry);
  }

  return [...counts.entries()].sort((a, b) => b[1].total - a[1].total);
}

function ageBucket(report: CivicReport): string | null {
  if (report.status === "Resolved" || !report.createdAt) return null;

  const ageMs = Date.now() - Date.parse(report.createdAt);
  if (Number.isNaN(ageMs)) return null;

  const days = ageMs / 86_400_000;
  if (days < 1) return "Under 1 day";
  if (days < 3) return "1–3 days";
  if (days < 7) return "3–7 days";
  return "Over 7 days";
}

function csvCell(value: string | number | undefined): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function InsightsPage({ reports, onOpen }: Props) {
  const resolved = reports.filter((r) => r.status === "Resolved").length;
  const underReview = reports.filter(
    (r) => r.status === "Under Review",
  ).length;
  const attention = reports.filter(
    (r) =>
      (r.priority === "High" || r.priority === "Critical") &&
      r.status !== "Resolved",
  ).length;
  const supported = reports.reduce(
    (sum, r) => sum + (r.supportCount ?? 0),
    0,
  );

  const byLocation = useMemo(
    () => countBy(reports, (r) => r.location),
    [reports],
  );
  const byCategory = useMemo(
    () => countBy(reports, (r) => r.category),
    [reports],
  );
  const ages = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const report of reports) {
      const bucket = ageBucket(report);
      if (bucket) buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }

    return ["Under 1 day", "1–3 days", "3–7 days", "Over 7 days"].map(
      (label) => ({ label, count: buckets.get(label) ?? 0 }),
    );
  }, [reports]);

  const hotspots = byLocation.filter(([, v]) => v.open > 0).slice(0, 5);
  const maxLocation = byLocation[0]?.[1].total ?? 1;
  const maxCategory = byCategory[0]?.[1].total ?? 1;

  function exportCsv() {
    const header = [
      "id",
      "title",
      "category",
      "location",
      "status",
      "priority",
      "confirmations",
      "filed",
    ];
    const rows = reports.map((r) =>
      [
        r.id,
        r.title,
        r.category,
        r.location,
        r.status,
        r.priority ?? "",
        r.supportCount ?? 0,
        r.createdAt ?? "",
      ]
        .map(csvCell)
        .join(","),
    );

    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "civiclens-reports.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    { label: "Total reports", value: reports.length, icon: FileText },
    { label: "Resolved", value: resolved, icon: CircleCheck },
    { label: "Under review", value: underReview, icon: Clock3 },
    { label: "Needs attention", value: attention, icon: TriangleAlert },
  ];

  return (
    <div className="community-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Area insights</h2>
            <p>
              What officials need: where problems cluster, what they
              are, and how long they have waited. Real filed reports
              only.
            </p>
          </div>
          <button
            className="text-action"
            onClick={exportCsv}
            disabled={reports.length === 0}
          >
            <Download size={15} /> Export CSV
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
          <div className="community-stat">
            <span className="community-stat-icon">
              <FileText size={17} />
            </span>
            <div>
              <strong>{supported}</strong>
              <span>Community confirmations</span>
            </div>
          </div>
        </div>
      </section>

      {reports.length === 0 ? (
        <section className="panel">
          <div className="empty-state">
            <MapPin size={23} />
            <strong>No reports yet</strong>
            <span>File a report and this dashboard fills itself in.</span>
          </div>
        </section>
      ) : (
        <div className="community-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Hotspots by area</h2>
              </div>
            </div>
            <div className="district-list">
              {byLocation.slice(0, 6).map(([name, value]) => (
                <div className="district-row" key={name}>
                  <div className="district-row-head">
                    <span>
                      <MapPin size={13} /> {name}
                    </span>
                    <strong>
                      {value.total} report{value.total === 1 ? "" : "s"}
                      {value.open > 0 ? ` · ${value.open} open` : ""}
                    </strong>
                  </div>
                  <div className="district-bar">
                    <span
                      style={{
                        width: `${Math.round((value.total / maxLocation) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="panel-heading">
              <div>
                <h2>Unresolved waiting time</h2>
              </div>
            </div>
            <div className="district-list">
              {ages.map(({ label, count }) => (
                <div className="district-row" key={label}>
                  <div className="district-row-head">
                    <span>
                      <Clock3 size={13} /> {label}
                    </span>
                    <strong>{count} open</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>By category</h2>
              </div>
            </div>
            <div className="district-list">
              {byCategory.map(([name, value]) => (
                <div className="district-row" key={name}>
                  <div className="district-row-head">
                    <span>{name}</span>
                    <strong>
                      {value.total} · {value.open} open
                    </strong>
                  </div>
                  <div className="district-bar">
                    <span
                      style={{
                        width: `${Math.round((value.total / maxCategory) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="panel-heading">
              <div>
                <h2>Most confirmed open issues</h2>
              </div>
            </div>
            <div className="report-list">
              {[...reports]
                .filter((r) => r.status !== "Resolved")
                .sort(
                  (a, b) => (b.supportCount ?? 0) - (a.supportCount ?? 0),
                )
                .slice(0, 5)
                .map((report) => (
                  <button
                    key={report.id}
                    className="report-row"
                    onClick={() => onOpen(report)}
                  >
                    <span className="report-row-copy">
                      <strong>{report.title}</strong>
                      <span className="report-location">
                        <MapPin size={12} /> {report.location}
                      </span>
                    </span>
                    <span className="status-badge submitted">
                      {report.supportCount ?? 0} confirmed
                    </span>
                  </button>
                ))}
              {hotspots.length === 0 && (
                <p className="activity-empty">No open issues right now.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
