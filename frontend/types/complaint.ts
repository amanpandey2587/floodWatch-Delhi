export enum ComplaintStatus {
  PENDING = "pending",
  ACKNOWLEDGED = "acknowledged",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed"
}

export enum ComplaintPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent"
}

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface ComplaintFormData {
  title: string;
  description: string;
  category: string;
  ward_number: number;
  priority: ComplaintPriority;
  location: LocationData | null;
  attachments: string[];
}

export interface Complaint {
  complaint_id: string;
  title: string;
  description: string;
  category: string;
  ward_number: number;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  created_by: string;
  assigned_officer_id: string | null;
  location: LocationData | null;
  attachments: string[];
  timeline: TimelineEntry[];
  response_time_hours: number | null;
  resolution: string | null;
  rating: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  timestamp: string;
  status: ComplaintStatus;
  remarks: string;
  updated_by: string;
}

export const COMPLAINT_CATEGORIES = [
  "Waterlogging",
  "Drainage Issue",
  "Road Damage",
  "Garbage Accumulation",
  "Street Light",
  "Pothole",
  "Other"
] as const;

export const PRIORITY_LABELS: Record<ComplaintPriority, { label: string; color: string }> = {
  [ComplaintPriority.LOW]: { label: "Low", color: "text-gray-600 bg-gray-100" },
  [ComplaintPriority.MEDIUM]: { label: "Medium", color: "text-blue-600 bg-blue-100" },
  [ComplaintPriority.HIGH]: { label: "High", color: "text-orange-600 bg-orange-100" },
  [ComplaintPriority.URGENT]: { label: "Urgent", color: "text-red-600 bg-red-100" }
};

export const STATUS_LABELS: Record<ComplaintStatus, { label: string; color: string }> = {
  [ComplaintStatus.PENDING]: { label: "Pending", color: "text-yellow-600 bg-yellow-100" },
  [ComplaintStatus.ACKNOWLEDGED]: { label: "Acknowledged", color: "text-blue-600 bg-blue-100" },
  [ComplaintStatus.IN_PROGRESS]: { label: "In Progress", color: "text-purple-600 bg-purple-100" },
  [ComplaintStatus.RESOLVED]: { label: "Resolved", color: "text-green-600 bg-green-100" },
  [ComplaintStatus.CLOSED]: { label: "Closed", color: "text-gray-600 bg-gray-100" }
};