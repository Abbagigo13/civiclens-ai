import { Eye, EyeOff, Flag, ShieldCheck, Trash2 } from "lucide-react";
import type { CivicReport } from "../../data/mockData";

type Props = {
  reports: CivicReport[];
  onOpen: (report: CivicReport) => void;
  onModerate: (
    report: CivicReport,
    patch: { flagged?: boolean; hidden?: boolean },
  ) => void;
  onDelete: (report: CivicReport) => void;
};

export default function ModerationPage({
  reports,
  onOpen,
  onModerate,
  onDelete,
}: Props) {
  const queue = reports.filter((report) => report.flagged || report.hidden);

  return (
    <div className="community-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Moderation</h2>
            <p>
              Flagged and hidden reports. Access is open, so anyone can
              flag — hiding and deleting stay deliberate actions here.
            </p>
          </div>
          <span className="map-demo-badge">
            <ShieldCheck size={13} /> {queue.length} in queue
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="empty-state">
            <Flag size={23} />
            <strong>Queue is clear</strong>
            <span>Nothing flagged or hidden right now.</span>
          </div>
        ) : (
          <div className="report-list">
            {queue.map((report) => (
              <div className="moderation-row" key={report.id}>
                <button
                  className="report-row"
                  onClick={() => onOpen(report)}
                >
                  <span className="report-row-copy">
                    <strong>{report.title}</strong>
                    <span className="report-location">
                      {report.location} · {report.status}
                      {report.hidden ? " · HIDDEN" : ""}
                      {report.flagged ? " · FLAGGED" : ""}
                    </span>
                  </span>
                </button>
                <div className="share-actions">
                  {report.flagged && (
                    <button
                      className="button-secondary"
                      onClick={() =>
                        onModerate(report, { flagged: false })
                      }
                    >
                      <Flag size={14} /> Clear flag
                    </button>
                  )}
                  <button
                    className="button-secondary"
                    onClick={() =>
                      onModerate(report, { hidden: !report.hidden })
                    }
                  >
                    {report.hidden ? (
                      <>
                        <Eye size={14} /> Unhide
                      </>
                    ) : (
                      <>
                        <EyeOff size={14} /> Hide
                      </>
                    )}
                  </button>
                  <button
                    className="button-secondary"
                    onClick={() => onDelete(report)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="queue-health-note">
          Hidden reports disappear from the dashboard, map, community
          and insights, but stay listed here until deleted.
        </p>
      </section>
    </div>
  );
}
