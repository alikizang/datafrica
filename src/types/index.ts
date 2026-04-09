// Type definitions for Datafrica

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface Dataset {
  id: string;
  title: string;
  description: string;
  category: DatasetCategory;
  country: string;
  price: number;
  currency: string;
  recordCount: number;
  columns: string[];
  previewData: Record<string, string | number>[];
  fileUrl: string;
  featured: boolean;
  rating: number;
  ratingCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  userId: string;
  datasetId: string;
  datasetTitle: string;
  amount: number;
  currency: string;
  paymentMethod: "kkiapay" | "stripe";
  transactionId: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export interface DownloadToken {
  id: string;
  userId: string;
  datasetId: string;
  token: string;
  expiresAt: string;
  used: boolean;
}

export type DatasetCategory =
  | "Business"
  | "Leads"
  | "Real Estate"
  | "Jobs"
  | "E-commerce"
  | "Finance"
  | "Health"
  | "Education";

export const AFRICAN_COUNTRIES = [
  "Togo",
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "Senegal",
  "Ivory Coast",
  "Cameroon",
  "Tanzania",
  "Ethiopia",
  "Rwanda",
  "Uganda",
  "Morocco",
  "Egypt",
  "DRC",
] as const;

export const DATASET_CATEGORIES: DatasetCategory[] = [
  "Business",
  "Leads",
  "Real Estate",
  "Jobs",
  "E-commerce",
  "Finance",
  "Health",
  "Education",
];
