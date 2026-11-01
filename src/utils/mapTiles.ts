export type TileProviderId = "carto" | "humanitarian" | "osm";

export type TileProvider = {
  id: TileProviderId;
  label: string;
  description: string;
  url: string;
  attribution: string;
};

export const tileProviders: Record<TileProviderId, TileProvider> = {
  carto: {
    id: "carto",
    label: "CARTO Voyager",
    description: "Publisher-friendly basemap, default choice.",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
  },
  humanitarian: {
    id: "humanitarian",
    label: "OSM Humanitarian",
    description: "Community-run tiles with a warm style.",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, style <a href="https://www.hotosm.org" target="_blank" rel="noreferrer">HOT</a>',
  },
  osm: {
    id: "osm",
    label: "OpenStreetMap Standard",
    description: "May block apps under the OSM tile usage policy.",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
  },
};

export function parseTileProvider(value: unknown): TileProviderId {
  return value === "humanitarian" || value === "osm" ? value : "carto";
}
