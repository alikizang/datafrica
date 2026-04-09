"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  Download,
  Lock,
  CheckCircle2,
  FileSpreadsheet,
  FileJson,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { Dataset } from "@/types";

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

  // Check if user already purchased
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
          toast.success("Payment successful! You can now download the dataset.");
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
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Database className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Dataset not found</h2>
        <p className="text-muted-foreground mb-4">
          The dataset you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button onClick={() => router.push("/datasets")}>Browse Datasets</Button>
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
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="secondary">{dataset.category}</Badge>
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {dataset.country}
              </Badge>
              {dataset.featured && (
                <Badge className="bg-amber-500 hover:bg-amber-600">
                  Featured
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">{dataset.title}</h1>
            <p className="text-muted-foreground text-lg">{dataset.description}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Database className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{dataset.recordCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Records</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Columns3 className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{dataset.columns.length}</p>
              <p className="text-xs text-muted-foreground">Columns</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Calendar className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-sm font-medium">
                {new Date(dataset.updatedAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">Last Updated</p>
            </div>
            {dataset.ratingCount > 0 && (
              <div className="p-4 rounded-lg border bg-card">
                <Star className="h-4 w-4 text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{dataset.rating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">
                  {dataset.ratingCount} ratings
                </p>
              </div>
            )}
          </div>

          {/* Columns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {dataset.columns.map((col) => (
                  <Badge key={col} variant="outline">
                    {col}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Data Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataPreviewTable
                data={dataset.previewData}
                columns={dataset.columns}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(dataset.price, dataset.currency)}
                </p>
                <p className="text-sm text-muted-foreground">One-time purchase</p>
              </div>

              <Separator />

              {purchased ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Purchased</span>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    Download your dataset:
                  </p>

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => handleDownload("csv")}
                      disabled={downloading}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDownload("excel")}
                      disabled={downloading}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download Excel
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDownload("json")}
                      disabled={downloading}
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      Download JSON
                    </Button>
                  </div>
                </div>
              ) : user ? (
                <div className="space-y-3">
                  <KKiapayButton
                    dataset={dataset}
                    onSuccess={handlePaymentSuccess}
                    onError={(err) => toast.error(err)}
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment via KKiaPay. Supports mobile money and cards.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => router.push("/login")}>
                    Sign in to Purchase
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You need an account to purchase datasets
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span>CSV, Excel, JSON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Records</span>
                  <span>{dataset.recordCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Columns</span>
                  <span>{dataset.columns.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Country</span>
                  <span>{dataset.country}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
