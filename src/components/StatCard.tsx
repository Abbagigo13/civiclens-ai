
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

type Props = {
  label: string;
  value: number;
  change: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "purple" | "orange";
  suffix?: string;
};

export default function StatCard({
  label,
  value,
  change,
  icon: Icon,
  tone,
  suffix,
}: Props) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={20} />
      </div>

      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <div className="stat-value">
          {value.toLocaleString()}
          {suffix}
        </div>
        <span className="stat-change">
          <ArrowUpRight size={13} />
          {change}
        </span>
      </div>
    </article>
  );
}
