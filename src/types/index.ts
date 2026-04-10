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
  descriptions?: Record<string, string>;
  category: DatasetCategory;
  country: string;
  price: number;
  currency: string;
  recordCount: number;
  columns: string[];
  previewData: Record<string, string | number>[];
  previewRows: number;
  allowDownload: boolean;
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
  paymentMethod: "kkiapay" | "paydunya" | "stripe";
  transactionId: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export type PaymentProvider = "paydunya" | "kkiapay";

export interface PaymentSettings {
  activeProvider: PaymentProvider;
  paydunya: {
    masterKey: string;
    privateKey: string;
    publicKey: string;
    token: string;
    mode: "test" | "live";
  };
  kkiapay: {
    publicKey: string;
    privateKey: string;
    secret: string;
    sandbox: boolean;
  };
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
  "Benin",
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
