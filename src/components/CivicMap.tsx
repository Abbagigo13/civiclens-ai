import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { MapPin, LocateFixed, Search } from "lucide-react";
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

function markerColor(report: CivicReport): string {
  return report.status === "Resolved"
    ? "#43d39a"
    : report.priority === "Critical"
      ? "#ff8a7a"
      : report.priority === "High"
        ? "#ffb15e"
        : "#5fd7ff";
}

// Groups markers sharing a ~72px screen cell at the current zoom.
// Recomputes on pan/zoom so clusters split as you zoom in.
function ClusteredMarkers({
  reports,
  onOpenReport,
}: {
  reports: LocatedReport[];
  onOpenReport?: (report: CivicReport) => void;
}) {
  const map = useMap();
  const [, setViewportTick] = useState(0);

  useMapEvents({
    moveend: () => setViewportTick((value) => value + 1),
    zoomend: () => setViewportTick((value) => value + 1),
  });

  const zoom = map.getZoom();
  const clusters = new Map<string, LocatedReport[]>();

  for (const report of reports) {
    const point = map.project([report.latitude, report.longitude], zoom);
    const key = `${Math.floor(point.x / 72)}:${Math.floor(point.y / 72)}`;
    const group = clusters.get(key) ?? [];
    group.push(report);
    clusters.set(key, group);
  }

  return (
    <>
      {[...clusters.entries()].map(([key, group]) => {
        if (group.length === 1) {
          const report = group[0];

          return (
            <CircleMarker
              key={report.id}
              center={[report.latitude, report.longitude]}
              radius={8}
              pathOptions={{
                color: markerColor(report),
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
          );
        }

        const lat =
          group.reduce((sum, r) => sum + r.latitude, 0) / group.length;
        const lng =
          group.reduce((sum, r) => sum + r.longitude, 0) / group.length;

        return (
          <CircleMarker
            key={`cluster-${key}`}
            center={[lat, lng]}
            radius={13}
            pathOptions={{
              color: "#8be4e7",
              fillOpacity: 0.75,
              weight: 2,
            }}
            eventHandlers={{
              click: () => {
                map.setView([lat, lng], Math.min(zoom + 2, 18));
              },
            }}
          >
            <Tooltip permanent direction="center" className="cluster-count">
              {group.length}
            </Tooltip>
            <Popup>
              <div className="civic-map-popup">
                <strong>{group.length} reports in this area</strong>
                {group.slice(0, 6).map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => onOpenReport?.(report)}
                  >
                    {report.title} · {report.status}
                  </button>
                ))}
                <span>Click the cluster to zoom in.</span>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function CivicMap({
  reports,
  onOpenReport,
  tiles = "carto",
}: CivicMapProps) {
  const [showUnlocated, setShowUnlocated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const provider = tileProviders[tiles] ?? tileProviders.carto;

  const categories = useMemo(
    () => [...new Set(reports.map((report) => report.category))].sort(),
    [reports],
  );

  const filtered = reports.filter((report) => {
    const matchesStatus =
      statusFilter === "All statuses" || report.status === statusFilter;
    const matchesCategory =
      categoryFilter === "All categories" ||
      report.category === categoryFilter;
    const searchText =
      `${report.title} ${report.location} ${report.category}`.toLowerCase();

    return (
      matchesStatus &&
      matchesCategory &&
      searchText.includes(query.toLowerCase())
    );
  });

  const locatedReports: LocatedReport[] = filtered.filter((report) => {
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

  const unlocatedReports = filtered.filter(
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

      <div className="civic-map-filters">
        <label className="search-box">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search map reports..."
            aria-label="Search map reports"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          <option>All statuses</option>
          <option>Submitted</option>
          <option>Under Review</option>
          <option>Resolved</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
        >
          <option>All categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
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

        <ClusteredMarkers
          reports={locatedReports}
          onOpenReport={onOpenReport}
        />
      </MapContainer>

      {showUnlocated && (
        <div className="civic-unlocated-list">
          <strong>Reports awaiting coordinates</strong>

          {unlocatedReports.length === 0 ? (
            <p>All matching reports have coordinates.</p>
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
        <div className="map-legend" aria-label="Map pin legend">
          <span>
            <i style={{ background: "#5fd7ff" }} /> Open
          </span>
          <span>
            <i style={{ background: "#ffb15e" }} /> High priority
          </span>
          <span>
            <i style={{ background: "#ff8a7a" }} /> Critical
          </span>
          <span>
            <i style={{ background: "#43d39a" }} /> Resolved
          </span>
        </div>
        <span>{locatedReports.length} mapped</span>
        <span>{unlocatedReports.length} awaiting coordinates</span>
      </div>
    </div>
  );
}
