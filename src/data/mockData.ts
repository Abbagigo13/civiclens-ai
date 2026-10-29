
export type IssueStatus =
  | "In Progress"
  | "Resolved"
  | "High Priority"
  | "Critical";


export type CivicReport = {
  id: string;
  title: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  time: string;
  status: IssueStatus;
  image: string;
  description?: string;
};


export const reports: CivicReport[] = [
  {
    id: "CL-1028",
    title: "Blocked Drainage",
    category: "Drainage",
    location: "Kakuri, Kaduna",
    time: "2 hours ago",
    status: "In Progress",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: "CL-1027",
    title: "Pothole on Airport Road",
    category: "Road infrastructure",
    location: "Kaduna",
    time: "4 hours ago",
    status: "High Priority",
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
    status: "In Progress",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: "CL-1024",
    title: "Flooded Road",
    category: "Flooding",
    location: "Millennium City, Kaduna",
    time: "12 hours ago",
    status: "Critical",
    image:
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=240&q=80",
  },
];

export const activity = [
  {
    icon: "file",
    title: "New report submitted",
    detail: "Pothole on Ahmadu Bello Way",
    time: "2 hours ago",
  },
  {
    icon: "refresh",
    title: "Status updated",
    detail: "Drainage issue → In Progress",
    time: "4 hours ago",
  },
  {
    icon: "check",
    title: "Report resolved",
    detail: "Waste accumulation · Sabon Gari",
    time: "6 hours ago",
  },
  {
    icon: "file",
    title: "New report submitted",
    detail: "Damaged street light",
    time: "8 hours ago",
  },
];
