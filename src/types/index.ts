// Type definitions for Datafrica

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: "user" | "admin";
  activePlanId?: string;
  suspendedUntil?: string;
  bannedReason?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  fingerprintHash?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error";
  read: boolean;
  createdAt: string;
  createdBy: string;
}

export interface Dataset {
  id: string;
  title: string;
  titles?: Record<string, string>;
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
  fileFormat?: "csv" | "json" | "xlsx" | "txt";
  featured: boolean;
  manualFeatured?: boolean;
  featuredScore?: number;
  accessTier?: "standard" | "premium";
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
  allowDownload?: boolean;
  createdAt: string;
}

export type PaymentProvider = "paydunya" | "kkiapay" | "stripe";

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
  stripe: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    mode: "test" | "live";
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

// ─── Membership / Subscription ───────────────────────────────────────

export type BillingCycle = "monthly" | "yearly";
export type PlanStatus = "active" | "archived";
export type SubscriptionStatus = "active" | "expired" | "cancelled";

export interface PlanConditions {
  allowDownload: boolean;
  maxDownloadsPerMonth: number | null; // null = unlimited
}

export interface PlanPricing {
  price: number;
  currency: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  names: Record<string, string>;
  description: string;
  descriptions: Record<string, string>;
  pricing: {
    monthly: PlanPricing;
    yearly: PlanPricing;
  };
  datasetIds: string[];
  conditions: PlanConditions;
  features: string[];
  featuresByLang: Record<string, string[]>;
  displayOrder: number;
  highlighted: boolean;
  status: PlanStatus;
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPayment {
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  billingCycle: BillingCycle;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  renewalCount: number;
  lastPaymentDate: string;
  lastPaymentAmount: number;
  lastPaymentMethod: string;
  lastTransactionId: string;
  payments: SubscriptionPayment[];
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessResult {
  hasAccess: boolean;
  accessType: "purchase" | "subscription" | "trial" | "none";
  allowDownload: boolean;
  planName?: string;
  endDate?: string;
}
