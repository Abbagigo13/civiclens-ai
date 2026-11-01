import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { MapPin, LocateFixed } from "lucide-react";
import type { CivicReport } from "../data/mockData";
import { tileProviders } from "../utils/mapTiles";
import type { TileProviderId } from "../utils/mapTiles";
import "leaflet/dist/leaflet.css";

type CivicMapProps = {
  reports: CivicReport[];
  onOpenReport?: (report: CivicReport) => void;
  tiles?: TileProviderId;
};

type LocatedReport = CivicReport & {
  latitude: number;
  longitude: number;
};

// Kaduna city is the initial map view, not a claimed report location.
const DEFAULT_CENTER: [number, number] = [10.5105, 7.4165];

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

export default function CivicMap({
  reports,
  onOpenReport,
  tiles = "carto",
}: CivicMapProps) {
  const [showUnlocated, setShowUnlocated] = useState(false);
  const provider = tileProviders[tiles] ?? tileProviders.carto;

  // Only reports with actual numeric coordinates appear as map markers.
  const locatedReports: LocatedReport[] = reports.filter((report) => {
    const candidate = report as CivicReport & {
      latitude?: unknown;
      longitude?: unknown;
    };

    return (
      typeof candidate.latitude === "number" &&
      typeof candidate.longitude === "number" &&
      Number.isFinite(candidate.latitude) &&
      Number.isFinite(candidate.longitude) &&
      candidate.latitude >= -90 &&
      candidate.latitude <= 90 &&
      candidate.longitude >= -180 &&
      candidate.longitude <= 180
    );
  }) as LocatedReport[];

  const unlocatedReports = reports.filter(
    (report) =>
      !locatedReports.some((located) => located.id === report.id),
  );

  return (
    <div className="civic-map-shell">
      <div className="civic-map-toolbar">
        <div className="civic-map-title">
          <MapPin size={16} />
          <span>Community report map</span>
        </div>

        <button
          type="button"
          className="civic-map-location-button"
          onClick={() => setShowUnlocated((value) => !value)}
        >
          <LocateFixed size={15} />
          {showUnlocated ? "Hide report list" : "Reports without coordinates"}
        </button>
      </div>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom
        className="civic-leaflet-map"
      >
        <MapResizeHandler />

        <TileLayer
          key={provider.id}
          attribution={provider.attribution}
          url={provider.url}
        />

        {locatedReports.map((report) => (
          <CircleMarker
            key={report.id}
            center={[report.latitude, report.longitude]}
            radius={8}
            pathOptions={{
              color:
                report.status === "Resolved"
                  ? "#45e2ac"
                  : report.priority === "Critical"
                    ? "#ff646e"
                    : report.priority === "High"
                      ? "#ffa94d"
                      : "#65a9ff",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="civic-map-popup">
                <strong>{report.title}</strong>
                <span>{report.category}</span>
                <span>{report.location || "Location not provided"}</span>
                <span>Status: {report.status}</span>

                {onOpenReport && (
                  <button
                    type="button"
                    onClick={() => onOpenReport(report)}
                  >
                    View report
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {showUnlocated && (
        <div className="civic-unlocated-list">
          <strong>Reports awaiting coordinates</strong>

          {unlocatedReports.length === 0 ? (
            <p>All current reports have coordinates.</p>
          ) : (
            unlocatedReports.map((report) => (
              <button
                type="button"
                key={report.id}
                className="civic-unlocated-item"
                onClick={() => onOpenReport?.(report)}
                disabled={!onOpenReport}
              >
                <span>{report.title}</span>
                <small>
                  {report.location || "Location not provided"} · {report.status}
                </small>
              </button>
            ))
          )}
        </div>
      )}

      <div className="civic-map-footer">
        <span>{locatedReports.length} mapped</span>
        <span>{unlocatedReports.length} awaiting coordinates</span>
      </div>
    </div>
  );
}