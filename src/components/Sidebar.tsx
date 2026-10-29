
import {
  Activity,
  Camera,
  Eye,
  FileText,
  House,
  Map,
  Settings,
  Users,
  Leaf,
} from "lucide-react";

type Props = {
  active: string;
  onNavigate: (page: string) => void;
};

const navItems = [
  { label: "Home", icon: House },
  { label: "Upload & Analyze", icon: Camera },
  { label: "My Reports", icon: FileText },
  { label: "Map View", icon: Map },
  { label: "Community", icon: Users },
  { label: "Settings", icon: Settings },
];

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate("Home")}>
        <span className="brand-mark">
          <Eye size={28} strokeWidth={2.4} />
        </span>
        <span className="brand-copy">
          <span className="brand-name">
            CivicLens <b>AI</b>
          </span>
          <span className="brand-tagline">
            See it. Report it. Make it better.
          </span>
        </span>
      </button>

      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`nav-item ${active === label ? "active" : ""}`}
            onClick={() => onNavigate(label)}
            aria-current={active === label ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
            {label === "My Reports" && (
              <span className="nav-count">5</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="community-promo">
          <div className="promo-icon">
            <Leaf size={23} />
          </div>
          <span className="eyebrow">COMMUNITY FIRST</span>
          <h3>
            Better communities start with better visibility.
          </h3>
          <p>
            Every observation is a step toward safer, cleaner,
            stronger neighborhoods.
          </p>
          <div className="city-silhouette" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="sidebar-footer">
          <Activity size={14} />
          <span>Prototype environment</span>
          <span className="online-dot" />
        </div>
      </div>
    </aside>
  );
}
