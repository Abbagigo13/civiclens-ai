import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Download,
  LockOpen,
  Map,
  Moon,
  PlugZap,
  RefreshCw,
  Sun,
  Trash2,
} from "lucide-react";
import { checkServerHealth } from "../../api/reports";
import { tileProviders } from "../../utils/mapTiles";
import type { TileProviderId } from "../../utils/mapTiles";

type Props = {
  lightMode: boolean;
  onToggleTheme: () => void;
  tiles: TileProviderId;
  onTileProvider: (id: TileProviderId) => void;
  reportCount: number;
  photoCount: number;
  onExport: () => void;
  onClearData: () => void;
};

type BackendState = "checking" | "online" | "offline";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function SettingsPage({
  lightMode,
  onToggleTheme,
  tiles,
  onTileProvider,
  reportCount,
  photoCount,
  onExport,
  onClearData,
}: Props) {
  const [backend, setBackend] = useState<BackendState>("checking");

  const testBackend = useCallback(async () => {
    setBackend("checking");
    const health = await checkServerHealth();
    setBackend(health.online ? "online" : "offline");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialCheck() {
      const health = await checkServerHealth();
      if (cancelled) return;
      setBackend(health.online ? "online" : "offline");
    }

    void initialCheck();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="settings-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
                        <h2>Workspace preferences</h2>
            <p>Appearance, connections and local data controls.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Appearance</h2>
            <p>Choose how the workspace looks on this device.</p>
          </div>
        </div>

        <div className="segmented" role="group" aria-label="Theme">
          <button
            className={!lightMode ? "selected" : ""}
            onClick={() => {
              if (lightMode) onToggleTheme();
            }}
            aria-pressed={!lightMode}
          >
            <Moon size={15} /> Dark
          </button>
          <button
            className={lightMode ? "selected" : ""}
            onClick={() => {
              if (!lightMode) onToggleTheme();
            }}
            aria-pressed={lightMode}
          >
            <Sun size={15} /> Light
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Backend connection</h2>
            <p>AI analysis and report persistence need the API server.</p>
          </div>
          <span
            className={`backend-pill backend-${backend}`}
            role="status"
          >
            <span className="status-dot" />
            {backend === "checking"
              ? "Checking…"
              : backend === "online"
                ? "Connected"
                : "Offline"}
          </span>
        </div>

        <div className="settings-row">
          <div>
            <strong>API address</strong>
            <span>{API_BASE_URL || "Same origin (dev proxy)"} /api</span>
          </div>
          <button
            className="button-secondary"
            onClick={() => void testBackend()}
            disabled={backend === "checking"}
          >
            <RefreshCw size={15} /> Test connection
          </button>
        </div>

        {backend === "offline" && (
          <p className="settings-hint">
            <PlugZap size={14} /> Start the backend with
            <code> npm run server:dev </code>
            in a second terminal, then test again.
          </p>
        )}

        {backend === "online" && (
          <p className="settings-hint">
            <LockOpen size={14} /> Open access — anyone can file, browse
            and update reports. No key or account needed.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Map tiles</h2>
            <p>
              If a provider blocks this app, switch to another basemap.
            </p>
          </div>
          <Map size={18} className="muted" />
        </div>

        <div className="tile-options" role="radiogroup" aria-label="Map tile provider">
          {Object.values(tileProviders).map((provider) => (
            <button
              key={provider.id}
              role="radio"
              aria-checked={tiles === provider.id}
              className={`tile-option ${tiles === provider.id ? "selected" : ""}`}
              onClick={() => onTileProvider(provider.id)}
            >
              <span className="tile-option-check">
                {tiles === provider.id && <Check size={15} />}
              </span>
              <span className="tile-option-copy">
                <strong>{provider.label}</strong>
                <span>{provider.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Reports and photos</h2>
            <p>Export a backup or remove everything to start over.</p>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <strong>Stored reports</strong>
            <span>
              {reportCount} report{reportCount === 1 ? "" : "s"} ·{" "}
              {photoCount} photo{photoCount === 1 ? "" : "s"} in this
              browser
            </span>
          </div>
          <div className="settings-actions">
            <button
              className="button-secondary"
              onClick={onExport}
              disabled={reportCount === 0}
            >
              <Download size={15} /> Export JSON
            </button>
            <button
              className="button-danger"
              onClick={onClearData}
              disabled={reportCount === 0}
            >
              <Trash2 size={15} /> Delete everything
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
