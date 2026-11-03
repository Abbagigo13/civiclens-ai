
import { useState } from "react";
import { ArrowUpRight, ImageOff, MapPin, ThumbsUp } from "lucide-react";
import type { CivicReport } from "../data/mockData";

type Props = {
  report: CivicReport;
  onOpen: (report: CivicReport) => void;
};

export default function ReportCard({ report, onOpen }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(report.image) && !imageFailed;

  return (
    <button
      className="report-row"
      onClick={() => onOpen(report)}
      aria-label={`Open report: ${report.title}`}
    >
      {showImage ? (
        <img
          className="report-thumbnail"
          src={report.image}
          alt={`Evidence for ${report.title}`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className="report-thumbnail report-thumbnail-placeholder"
          aria-hidden="true"
        >
          <ImageOff size={17} />
        </span>
      )}

      <span className="report-row-copy">
        <strong>{report.title}</strong>
        <span className="report-location">
          <MapPin size={12} />
          {report.location}
        </span>
        <span className="report-time">{report.time}</span>
        {(report.supportCount ?? 0) > 0 && (
          <span className="report-time">
            <ThumbsUp size={11} /> {report.supportCount} confirmed
          </span>
        )}
        {report.syncState === "pending" && (
          <span className="report-time">Pending sync</span>
        )}
        {report.flagged && (
          <span className="report-time">Flagged for review</span>
        )}
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
