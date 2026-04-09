"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataPreviewTable } from "@/components/dataset/data-preview-table";
import { KKiapayButton } from "@/components/payment/kkiapay-button";
import { useAuth } from "@/hooks/use-auth";
import {
  Database,
  MapPin,
  Calendar,
  Columns3,
  Star,
  Lock,
  CheckCircle2,
  FileSpreadsheet,
  FileJson,
  FileText,
  Eye,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { Dataset } from "@/types";
import Link from "next/link";

export default function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchDataset() {
      try {
        const res = await fetch(`/api/datasets/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDataset(data.dataset);
        }
      } catch {
        toast.error("Failed to load dataset");
      } finally {
        setLoading(false);
      }
    }

    fetchDataset();
  }, [id]);

  useEffect(() => {
    async function checkPurchase() {
      if (!user) return;
      const token = await getIdToken();
      if (!token) return;

      try {
        const res = await fetch(`/api/datasets/${id}/download?format=json`, {
          method: "HEAD",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setPurchased(true);
        }
      } catch {
        // Not purchased
      }
    }

    checkPurchase();
  }, [user, id, getIdToken]);

  const handlePaymentSuccess = useCallback(
    async (transactionId: string) => {
      try {
        const token = await getIdToken();
        if (!token) {
          toast.error("Please sign in to complete the purchase");
          return;
        }

        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transactionId,
            datasetId: id,
            paymentMethod: "kkiapay",
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setPurchased(true);
          setDownloadToken(data.downloadToken);
          toast.success("Payment successful! You can now access the full dataset.");
        } else {
          toast.error(data.error || "Payment verification failed");
        }
      } catch {
        toast.error("An error occurred during payment verification");
      }
    },
    [id, getIdToken]
  );

  const handleDownload = async (format: "csv" | "excel" | "json") => {
    try {
      setDownloading(true);
      const token = await getIdToken();
      if (!token) {
        toast.error("Please sign in");
        return;
      }

      const params = new URLSearchParams({ format });
      if (downloadToken) params.set("token", downloadToken);

      const res = await fetch(`/api/datasets/${id}/download?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Download failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const ext = format === "excel" ? "xlsx" : format;
      a.download = `${dataset?.title || "dataset"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-10 space-y-6">
        <Skeleton className="h-8 w-1/3 bg-white/5" />
        <Skeleton className="h-4 w-2/3 bg-white/5" />
        <Skeleton className="h-64 w-full bg-white/5" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-24 text-center">
        <Database className="h-16 w-16 mx-auto text-[#1a2a42] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Dataset not found</h2>
        <p className="text-[#7a8ba3] mb-6">
          The dataset you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <button
          onClick={() => router.push("/datasets")}
          className="px-6 py-2.5 bg-[#3d7eff] text-white rounded-full hover:bg-[#2d6eef] transition-colors font-medium"
        >
          Browse Datasets
        </button>
      </div>
    );
  }

  const formatPrice = (price: number, currency: string) => {
    if (currency === "XOF" || currency === "CFA") {
      return `${price.toLocaleString()} CFA`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      <Link
        href="/datasets"
        className="inline-flex items-center gap-1.5 text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to datasets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className="bg-[#3d7eff]/10 text-[#3d7eff] border-0 text-xs font-medium">
                {dataset.category}
              </Badge>
              <Badge className="bg-[#1a2a42] text-[#7a8ba3] border-white/[0.08] gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                {dataset.country}
              </Badge>
              {dataset.featured && (
                <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">
                  Featured
                </Badge>
              )}
              {!dataset.allowDownload && (
                <Badge className="bg-purple-500/10 text-purple-400 border-0 text-xs gap-1">
                  <Eye className="h-3 w-3" />
                  View only
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">{dataset.title}</h1>
            <p className="text-[#7a8ba3] text-lg leading-relaxed">{dataset.description}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4 stat-glow">
              <Database className="h-4 w-4 text-[#3d7eff] mb-2" />
              <p className="text-2xl font-bold text-white">{dataset.recordCount.toLocaleString()}</p>
              <p className="text-xs text-[#7a8ba3]">Records</p>
            </div>
            <div className="glass-card rounded-xl p-4 stat-glow">
              <Columns3 className="h-4 w-4 text-[#3d7eff] mb-2" />
              <p className="text-2xl font-bold text-white">{dataset.columns.length}</p>
              <p className="text-xs text-[#7a8ba3]">Columns</p>
            </div>
            <div className="glass-card rounded-xl p-4 stat-glow">
              <Calendar className="h-4 w-4 text-[#3d7eff] mb-2" />
              <p className="text-sm font-medium text-white">
                {new Date(dataset.updatedAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-[#7a8ba3]">Last Updated</p>
            </div>
            {dataset.ratingCount > 0 && (
              <div className="glass-card rounded-xl p-4 stat-glow">
                <Star className="h-4 w-4 text-amber-500 mb-2" />
                <p className="text-2xl font-bold text-white">{dataset.rating.toFixed(1)}</p>
                <p className="text-xs text-[#7a8ba3]">{dataset.ratingCount} ratings</p>
              </div>
            )}
          </div>

          {/* Columns */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Data Columns</h3>
            <div className="flex flex-wrap gap-2">
              {dataset.columns.map((col) => (
                <span
                  key={col}
                  className="px-3 py-1.5 rounded-lg bg-[#0d1a2d] text-sm text-[#c8d6e5] border border-white/[0.06]"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#3d7eff]" />
              Data Preview
            </h3>
            <DataPreviewTable
              data={dataset.previewData}
              columns={dataset.columns}
              maxRows={dataset.previewRows || 10}
              totalRecords={dataset.recordCount}
              purchased={purchased}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6 sticky top-24 space-y-6">
            {/* Price */}
            <div className="text-center">
              <p className="text-4xl font-bold text-white">
                {formatPrice(dataset.price, dataset.currency)}
              </p>
              <p className="text-sm text-[#7a8ba3] mt-1">One-time purchase</p>
            </div>

            <div className="h-px bg-white/[0.06]" />

            {purchased ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Purchased</span>
                </div>

                {dataset.allowDownload ? (
                  <>
                    <p className="text-sm text-[#7a8ba3] text-center">
                      Download your dataset:
                    </p>
                    <div className="space-y-2">
                      <button
                        className="w-full py-3 rounded-xl bg-[#3d7eff] text-white font-medium hover:bg-[#2d6eef] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={() => handleDownload("csv")}
                        disabled={downloading}
                      >
                        <FileText className="h-4 w-4" />
                        Download CSV
                      </button>
                      <button
                        className="w-full py-3 rounded-xl bg-transparent text-white font-medium border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={() => handleDownload("excel")}
                        disabled={downloading}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Download Excel
                      </button>
                      <button
                        className="w-full py-3 rounded-xl bg-transparent text-white font-medium border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={() => handleDownload("json")}
                        disabled={downloading}
                      >
                        <FileJson className="h-4 w-4" />
                        Download JSON
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <Eye className="h-8 w-8 text-purple-400 mx-auto" />
                    <p className="text-sm text-[#7a8ba3]">
                      This dataset is <strong className="text-white">view-only</strong>. You can browse
                      all {dataset.recordCount.toLocaleString()} records online but downloads are not available.
                    </p>
                  </div>
                )}
              </div>
            ) : user ? (
              <div className="space-y-4">
                <KKiapayButton
                  dataset={dataset}
                  onSuccess={handlePaymentSuccess}
                  onError={(err) => toast.error(err)}
                />
                <p className="text-xs text-center text-[#525f73]">
                  Secure payment via KKiaPay. Supports mobile money and cards.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  className="w-full py-3 rounded-xl bg-[#3d7eff] text-white font-medium hover:bg-[#2d6eef] transition-colors"
                  onClick={() => router.push("/login")}
                >
                  Sign in to Purchase
                </button>
                <p className="text-xs text-center text-[#525f73]">
                  You need an account to purchase datasets
                </p>
              </div>
            )}

            <div className="h-px bg-white/[0.06]" />

            {/* Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#7a8ba3]">Format</span>
                <span className="text-[#c8d6e5]">{dataset.allowDownload ? "CSV, Excel, JSON" : "Online view"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8ba3]">Records</span>
                <span className="text-[#c8d6e5]">{dataset.recordCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8ba3]">Columns</span>
                <span className="text-[#c8d6e5]">{dataset.columns.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8ba3]">Country</span>
                <span className="text-[#c8d6e5]">{dataset.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8ba3]">Access</span>
                <span className="text-[#c8d6e5]">{dataset.allowDownload ? "Download" : "View only"}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#525f73]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Secure payment processing
              </div>
              <div className="flex items-center gap-2 text-xs text-[#525f73]">
                <Lock className="h-3.5 w-3.5 text-[#3d7eff]" />
                Data protected & verified
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
