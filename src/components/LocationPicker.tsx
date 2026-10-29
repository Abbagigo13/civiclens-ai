import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LeafletMouseEvent, LatLngExpression } from "leaflet";
import { Search, MapPin, LoaderCircle } from "lucide-react";
import "leaflet/dist/leaflet.css";

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number | null, longitude: number | null) => void;
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
}: LocationPickerProps) {
  const [selected, setSelected] = useState<[number, number] | null>(
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : null,
  );

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placeName, setPlaceName] = useState("");

  function selectLocation(lat: number, lng: number) {
    setSelected([lat, lng]);
    setPlaceName("");
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

    try {
      const params = new URLSearchParams({
        q: searchText,
        format: "jsonv2",
        limit: "1",
        countrycodes: "ng",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
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

      const result = results[0];
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
        throw new Error("The location service returned invalid coordinates.");
      }

      setSelected([lat, lng]);
      setPlaceName(result.display_name);
      onSelect(lat, lng);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Could not search for that location. Please try again.",
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

      <MapContainer
        center={selected ?? DEFAULT_CENTER}
        zoom={selected ? 16 : 12}
        className="location-picker-map"
        scrollWheelZoom
      >
        <MapRecenter position={selected} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onSelect={selectLocation} />

        {selected && <Marker position={selected} />}
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