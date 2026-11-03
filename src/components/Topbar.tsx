import { useState } from "react";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import type { ActivityItem } from "../api/reports";

type Props = {
  onMenuClick: () => void;
  lightMode: boolean;
  onToggleTheme: () => void;
  notifications: ActivityItem[];
  unseenCount: number;
  onMarkSeen: () => void;
};

export default function Topbar({
  onMenuClick,
  lightMode,
  onToggleTheme,
  notifications,
  unseenCount,
  onMarkSeen,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </button>

      <div className="topbar-context">
        <span className="context-dot" />
        <span>Community intelligence</span>
        <span className="context-separator">/</span>
        <span className="muted">Dashboard</span>
      </div>

      <div className="topbar-actions">
        <span className="environment-pill">
          <span className="online-dot" />
          OPEN ACCESS
        </span>

        <button
          className="icon-button"
          onClick={onToggleTheme}
          aria-label="Toggle color theme"
          title="Toggle theme"
        >
          {lightMode ? <Moon size={19} /> : <Sun size={19} />}
        </button>

        <div className="notification-wrap">
          <button
            className="icon-button notification-button"
            aria-label="Status notifications"
            title="Status notifications"
            aria-expanded={open}
            onClick={() => {
              setOpen((value) => !value);
              if (!open) onMarkSeen();
            }}
          >
            <Bell size={19} />
            {unseenCount > 0 && (
              <span className="notification-badge">{unseenCount}</span>
            )}
          </button>

          {open && (
            <div className="notification-panel" role="menu">
              <strong>Report updates</strong>
              {notifications.length === 0 ? (
                <p>
                  No status changes yet. Updates to reports in this
                  workspace appear here.
                </p>
              ) : (
                notifications.map((item) => (
                  <div className="notification-item" key={item.id}>
                    <span>{item.heading}</span>
                    <small>
                      {item.detail} · {item.time}
                    </small>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
