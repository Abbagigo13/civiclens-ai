import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LeafletMouseEvent, LatLngExpression } from "leaflet";
import { Search, MapPin, LoaderCircle } from "lucide-react";
import { tileProviders } from "../utils/mapTiles";
import type { TileProviderId } from "../utils/mapTiles";
import "leaflet/dist/leaflet.css";

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number | null, longitude: number | null) => void;
  tiles?: TileProviderId;
};

type SearchResult = {
  lat: string;
  lon: string;
  display_name: string;
};

const DEFAULT_CENTER: LatLngExpression = [10.5105, 7.4165];

function MapClickHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function MapRecenter({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { duration: 0.8 });
    }
  }, [map, position]);

  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onSelect,
  tiles = "carto",
}: LocationPickerProps) {
  const provider = tileProviders[tiles] ?? tileProviders.carto;
  const [selected, setSelected] = useState<[number, number] | null>(
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : null,
  );

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [candidates, setCandidates] = useState<SearchResult[]>([]);

  function selectLocation(lat: number, lng: number) {
    setSelected([lat, lng]);
    setPlaceName("");
    setError("");
    setCandidates([]);
    onSelect(lat, lng);
  }

  function selectCandidate(result: SearchResult) {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setError("The location service returned invalid coordinates.");
      return;
    }

    setSelected([lat, lng]);
    setPlaceName(result.display_name);
    setCandidates([]);
    setError("");
    onSelect(lat, lng);
  }

  async function searchAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchText = query.trim();

    if (!searchText) {
      setError("Enter a street, landmark, or area to search.");
      return;
    }

    setBusy(true);
    setError("");
    setPlaceName("");
    setCandidates([]);

    try {
      const params = new URLSearchParams({
        q: searchText,
        format: "jsonv2",
        limit: "5",
        countrycodes: "ng",
        addressdetails: "1",
        viewbox: "2.69,14.72,14.68,4.24",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8000),
        },
      );

      if (!response.ok) {
        throw new Error("The location service is temporarily unavailable.");
      }

      const results = (await response.json()) as SearchResult[];

      if (results.length === 0) {
        setError(
          "No matching place was found. Try a nearby landmark or select the location directly on the map.",
        );
        return;
      }

      // Never silently pick a result: the user confirms the place.
      setCandidates(results);
    } catch {
      setError(
        "Could not reach location search. Check your connection, or click the map to select the location.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="location-picker">
      <p className="location-picker-help">
        Search for a Nigerian street, area, or landmark, or click directly on
        the map. Check the pin before saving your report.
      </p>

      <form className="location-search-form" onSubmit={searchAddress}>
        <label className="location-search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Ahmadu Bello Way, Kaduna"
            aria-label="Search for a report location"
          />
        </label>

        <button
          type="submit"
          className="button-primary location-search-button"
          disabled={busy || !query.trim()}
        >
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Search size={16} />
          )}
          {busy ? "Searching..." : "Find"}
        </button>
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {candidates.length > 0 && (
        <ul className="location-candidates">
          {candidates.map((result) => (
            <li key={`${result.lat},${result.lon},${result.display_name}`}>
              <button type="button" onClick={() => selectCandidate(result)}>
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <MapContainer
        center={selected ?? DEFAULT_CENTER}
        zoom={selected ? 16 : 12}
        className="location-picker-map"
        scrollWheelZoom
      >
        <MapResizeHandler />
        <MapRecenter position={selected} />

        <TileLayer
          key={provider.id}
          attribution={provider.attribution}
          url={provider.url}
        />

        <MapClickHandler onSelect={selectLocation} />

        {selected && (
          <CircleMarker
            center={selected}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#2f7bff",
              fillOpacity: 1,
            }}
          />
        )}
      </MapContainer>

      {selected ? (
        <div className="location-picker-coordinates">
          <p>
            <MapPin size={14} />
            <strong>Selected location</strong>
          </p>

          {placeName && <span>{placeName}</span>}

          <span>
            {selected[0].toFixed(6)}, {selected[1].toFixed(6)}
          </span>

          <button
            type="button"
            className="location-clear-button"
            onClick={() => {
              setSelected(null);
              setPlaceName("");
              setError("");
              onSelect(null, null);
            }}
          >
            Clear selection
          </button>
        </div>
      ) : (
        <p className="location-picker-coordinates">
          No location selected yet.
        </p>
      )}

      <p className="location-service-note">
        Search results provided by OpenStreetMap contributors. Always verify
        the pin manually.
      </p>
    </div>
  );
}