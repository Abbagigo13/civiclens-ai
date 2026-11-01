
export type ReportStatus = "Submitted" | "Under Review" | "Resolved";

export type ReportPriority = "Low" | "Medium" | "High" | "Critical";

export type CivicReport = {
  id: string;
  title: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  time: string;
  status: ReportStatus;
  image: string;
  description?: string;

  // True when a copy of the photo is stored on the server.
  hasPhoto?: boolean;

  // AI analysis metadata
  priority?: ReportPriority;
  issueDetected?: boolean;
  confidence?: number | null;
  visibleEvidence?: string[];
  limitations?: string[];
};

// One-way migration for reports cached under the old model, where
// priority levels doubled as statuses. Already-new reports pass through.
export function migrateCachedReport(raw: CivicReport): CivicReport {
  const report = { ...raw };
  const statusKey = raw.status as string;
  const priorityKey = raw.priority as string | undefined;

  if (statusKey === "In Progress") {
    report.status = "Under Review";
  } else if (statusKey === "High Priority") {
    report.status = "Under Review";
    report.priority ??= "High";
  } else if (statusKey === "Critical") {
    report.status = "Under Review";
    report.priority ??= "Critical";
  }

  if (priorityKey === "High Priority") {
    report.priority = "High";
  } else if (
    priorityKey === "In Progress" ||
    priorityKey === "Resolved"
  ) {
    report.priority = undefined;
  }

  return report;
}


export const reports: CivicReport[] = [
  {
    id: "CL-1028",
    title: "Blocked Drainage",
    category: "Drainage",
    location: "Kakuri, Kaduna",
    time: "2 hours ago",
    status: "Under Review",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: "CL-1027",
    title: "Pothole on Airport Road",
    category: "Road infrastructure",
    location: "Kaduna",
    time: "4 hours ago",
    status: "Under Review",
    priority: "High",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: "CL-1026",
    title: "Waste Accumulation",
    category: "Waste management",
    location: "Sabon Gari, Kaduna",
    time: "6 hours ago",
    status: "Resolved",
    image:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: "CL-1025",
    title: "Damaged Street Light",
    category: "Public utilities",
    location: "Ungwan Rimi, Kaduna",
    time: "8 hours ago",
    status: "Under Review",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: "CL-1024",
    title: "Flooded Road",
    category: "Flooding",
    location: "Millennium City, Kaduna",
    time: "12 hours ago",
    status: "Under Review",
    priority: "Critical",
    image:
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=240&q=80",
  },
];

