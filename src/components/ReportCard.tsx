
import { ArrowUpRight, MapPin } from "lucide-react";
import type { CivicReport } from "../data/mockData";

type Props = {
  report: CivicReport;
  onOpen: (report: CivicReport) => void;
};

export default function ReportCard({ report, onOpen }: Props) {
  return (
    <button
      className="report-row"
      onClick={() => onOpen(report)}
      aria-label={`Open report: ${report.title}`}
    >
      <img
  className="report-thumbnail"
  src={report.image}
  alt={`Evidence for ${report.title}`}
  loading="lazy"
/>

      <span className="report-row-copy">
        <strong>{report.title}</strong>
        <span className="report-location">
          <MapPin size={12} />
          {report.location}
        </span>
        <span className="report-time">{report.time}</span>
      </span>

      <span className={`status-badge ${report.status
        .toLowerCase()
        .replaceAll(" ", "-")}`}>
        <span className="status-dot" />
        {report.status}
      </span>

      <ArrowUpRight size={15} className="report-arrow" />
    </button>
  );
}
