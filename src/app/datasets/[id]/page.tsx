"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataPreviewTable } from "@/components/dataset/data-preview-table";
import { FullDatasetViewer } from "@/components/dataset/full-dataset-viewer";
import { PaymentButton } from "@/components/payment/payment-button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
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
  const searchParams = useSearchParams();
  const { user, getIdToken } = useAuth();
  const { t, lang } = useLanguage();
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
        toast.error(t("common.error"));
      } finally {
        setLoading(false);
      }
    }

    fetchDataset();
  }, [id]);

  // Handle PayDunya return (user redirected back after payment)
  // PayDunya appends ?token=INVOICE_TOKEN to the return_url
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const paydunyaToken = searchParams.get("token");

    // PayDunya return: token param present (with or without payment=success)
    if (paydunyaToken && user && !purchased) {
      (async () => {
        try {
          const authToken = await getIdToken();
          if (!authToken) return;

          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              transactionId: paydunyaToken,
              datasetId: id,
              paymentMethod: "paydunya",
            }),
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setPurchased(true);
            setDownloadToken(data.downloadToken);
            toast.success(t("dataset.paymentSuccess"));
          } else if (data.alreadyPurchased) {
            setPurchased(true);
          }
        } catch {
          // IPN webhook will handle it as backup
        }
        // Clean up URL params
        router.replace(`/datasets/${id}`, { scroll: false });
      })();
    } else if (paymentStatus === "cancelled") {
      toast.error(t("dataset.paymentCancelled"));
      router.replace(`/datasets/${id}`, { scroll: false });
    }
  }, [searchParams, user, id, getIdToken, router, purchased, t]);

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
          toast.error(t("dataset.signInToPurchase"));
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
          toast.error(data.error || t("common.error"));
        }
      } catch {
        toast.error(t("common.error"));
      }
    },
    [id, getIdToken, t]
  );

  const handleDownload = async (format: "csv" | "excel" | "json") => {
    try {
      setDownloading(true);
      const token = await getIdToken();
      if (!token) {
        toast.error(t("dataset.signInToPurchase"));
        return;
      }

      const params = new URLSearchParams({ format });
      if (downloadToken) params.set("token", downloadToken);

      const res = await fetch(`/api/datasets/${id}/download?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t("common.error"));
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

      toast.success(`${t("dashboard.downloadedAs")} ${format.toUpperCase()}`);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-10 space-y-6">
        <Skeleton className="h-8 w-1/3 bg-muted" />
        <Skeleton className="h-4 w-2/3 bg-muted" />
        <Skeleton className="h-64 w-full bg-muted" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-24 text-center">
        <Database className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("dataset.notFound")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("dataset.notFoundDesc")}
        </p>
        <button
          onClick={() => router.push("/datasets")}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-medium"
        >
          {t("dataset.browseTitle")}
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
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("dataset.backToDatasets")}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className="bg-primary/10 text-primary border-0 text-xs font-medium">
                {t(`categories.${dataset.category}`) !== `categories.${dataset.category}` ? t(`categories.${dataset.category}`) : dataset.category}
              </Badge>
              <Badge className="bg-muted text-muted-foreground border-border gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                {dataset.country}
              </Badge>
              {dataset.featured && (
                <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">
                  {t("dataset.featured")}
                </Badge>
              )}
              {!dataset.allowDownload && (
                <Badge className="bg-purple-500/10 text-purple-400 border-0 text-xs gap-1">
                  <Eye className="h-3 w-3" />
                  {t("dataset.viewOnly")}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{dataset.titles?.[lang] || dataset.title}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{dataset.descriptions?.[lang] || dataset.description}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4 stat-glow">
              <Database className="h-4 w-4 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{dataset.recordCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{t("dataset.records")}</p>
            </div>
            <div className="glass-card rounded-xl p-4 stat-glow">
              <Columns3 className="h-4 w-4 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{dataset.columns.length}</p>
              <p className="text-xs text-muted-foreground">{t("dataset.columns")}</p>
            </div>
            <div className="glass-card rounded-xl p-4 stat-glow">
              <Calendar className="h-4 w-4 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">
                {new Date(dataset.updatedAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">{t("dataset.lastUpdated")}</p>
            </div>
            {dataset.ratingCount > 0 && (
              <div className="glass-card rounded-xl p-4 stat-glow">
                <Star className="h-4 w-4 text-amber-500 mb-2" />
                <p className="text-2xl font-bold text-foreground">{dataset.rating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{dataset.ratingCount} {t("dataset.ratings")}</p>
              </div>
            )}
          </div>

          {/* Columns */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">{t("dataset.dataColumns")}</h3>
            <div className="flex flex-wrap gap-2">
              {dataset.columns.map((col) => (
                <span
                  key={col}
                  className="px-3 py-1.5 rounded-lg bg-muted text-sm text-foreground border border-border"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Data Table - Full viewer for purchased users, Preview for others */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              {purchased ? (
                <>
                  <Database className="h-4 w-4 text-emerald-500" />
                  {t("dataset.fullDataset")}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-primary" />
                  {t("dataset.dataPreview")}
                </>
              )}
            </h3>
            {purchased ? (
              <FullDatasetViewer datasetId={id} datasetTitle={dataset.titles?.[lang] || dataset.title} />
            ) : (
              <DataPreviewTable
                data={dataset.previewData}
                columns={dataset.columns}
                maxRows={dataset.previewRows || 10}
                totalRecords={dataset.recordCount}
                purchased={purchased}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6 sticky top-24 space-y-6">
            {/* Price */}
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground">
                {formatPrice(dataset.price, dataset.currency)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{t("dataset.oneTimePurchase")}</p>
            </div>

            <div className="h-px bg-border" />

            {purchased ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{t("dataset.purchased")}</span>
                </div>

                {dataset.allowDownload ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      {t("dataset.downloadYour")}
                    </p>
                    <div className="space-y-2">
                      <button
                        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={() => handleDownload("csv")}
                        disabled={downloading}
                      >
                        <FileText className="h-4 w-4" />
                        {t("dataset.downloadCSV")}
                      </button>
                      <button
                        className="w-full py-3 rounded-xl bg-transparent text-foreground font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={() => handleDownload("excel")}
                        disabled={downloading}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        {t("dataset.downloadExcel")}
                      </button>
                      <button
                        className="w-full py-3 rounded-xl bg-transparent text-foreground font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={() => handleDownload("json")}
                        disabled={downloading}
                      >
                        <FileJson className="h-4 w-4" />
                        {t("dataset.downloadJSON")}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <Eye className="h-8 w-8 text-purple-400 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      {t("dataset.viewOnlyDesc")}
                    </p>
                  </div>
                )}
              </div>
            ) : user ? (
              <div className="space-y-4">
                <PaymentButton
                  dataset={dataset}
                  onSuccess={handlePaymentSuccess}
                  onError={(err) => toast.error(err)}
                />
                <p className="text-xs text-center text-dim">
                  {t("dataset.securePayment")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                  onClick={() => router.push("/login")}
                >
                  {t("dataset.signInToPurchase")}
                </button>
                <p className="text-xs text-center text-dim">
                  {t("dataset.needAccount")}
                </p>
              </div>
            )}

            <div className="h-px bg-border" />

            {/* Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("dataset.format")}</span>
                <span className="text-foreground">{dataset.allowDownload ? "CSV, Excel, JSON" : t("dataset.onlineView")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("dataset.records")}</span>
                <span className="text-foreground">{dataset.recordCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("dataset.columns")}</span>
                <span className="text-foreground">{dataset.columns.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("dataset.country")}</span>
                <span className="text-foreground">{dataset.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("dataset.access")}</span>
                <span className="text-foreground">{dataset.allowDownload ? t("dataset.download") : t("dataset.viewOnly")}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-xs text-dim">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t("dataset.secureProcessing")}
              </div>
              <div className="flex items-center gap-2 text-xs text-dim">
                <Lock className="h-3.5 w-3.5 text-primary" />
                {t("dataset.dataProtected")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
