import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Download,
  KeyRound,
  Lock,
  LockOpen,
  Map,
  Moon,
  PlugZap,
  RefreshCw,
  Sun,
  Trash2,
} from "lucide-react";
import {
  checkServerHealth,
  getApiKey,
  setApiKey,
} from "../../api/reports";
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
  const [authEnabled, setAuthEnabled] = useState(false);
  const [apiKey, setApiKeyInput] = useState(getApiKey);
  const [savedFlash, setSavedFlash] = useState(false);

  const testBackend = useCallback(async () => {
    setBackend("checking");
    const health = await checkServerHealth();
    setBackend(health.online ? "online" : "offline");
    setAuthEnabled(health.authEnabled);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialCheck() {
      const health = await checkServerHealth();
      if (cancelled) return;
      setBackend(health.online ? "online" : "offline");
      setAuthEnabled(health.authEnabled);
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
            <span className="eyebrow">SETTINGS</span>
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
            {authEnabled ? (
              <>
                <Lock size={14} /> Writes require the operator key.
              </>
            ) : (
              <>
                <LockOpen size={14} /> Writes are open — no server key
                set.
              </>
            )}
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>API access</h2>
            <p>
              {authEnabled
                ? "This server requires the operator key for writes."
                : "Save the operator key here once the server sets one."}
            </p>
          </div>
          <KeyRound size={18} className="muted" />
        </div>

        <form
          className="api-key-form"
          onSubmit={(event) => {
            event.preventDefault();
            setApiKey(apiKey);
            setSavedFlash(true);
            window.setTimeout(() => setSavedFlash(false), 2000);
          }}
        >
          <label className="search-box">
            <KeyRound size={16} />
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="Paste operator key…"
              autoComplete="off"
              aria-label="Operator API key"
            />
          </label>

          <div className="settings-actions">
            <button className="button-secondary" type="submit">
              Save key
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={!apiKey}
              onClick={() => {
                setApiKey("");
                setApiKeyInput("");
              }}
            >
              Clear
            </button>
          </div>
        </form>

        {savedFlash && (
          <p className="settings-hint">
            <Check size={14} /> Key saved in this browser.
          </p>
        )}

        <p className="settings-hint">
          Stored only in this browser — never in the codebase. Sent with
          analyze, create, update, and delete requests.
        </p>
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
