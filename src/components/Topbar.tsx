
import {
  Bell,
  ChevronDown,
  Menu,
  Moon,
  Sun,
} from "lucide-react";

type Props = {
  onMenuClick: () => void;
  lightMode: boolean;
  onToggleTheme: () => void;
};

export default function Topbar({
  onMenuClick,
  lightMode,
  onToggleTheme,
}: Props) {
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
          DEMO MODE
        </span>

        <button
          className="icon-button"
          onClick={onToggleTheme}
          aria-label="Toggle color theme"
          title="Toggle theme"
        >
          {lightMode ? <Moon size={19} /> : <Sun size={19} />}
        </button>

        <button
          className="icon-button notification-button"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <div className="profile">
          <div className="avatar">UI</div>
          <div className="profile-copy">
            <strong>Community Member</strong>
            <span>Local contributor</span>
          </div>
          <ChevronDown size={15} className="muted" />
        </div>
      </div>
    </header>
  );
}
