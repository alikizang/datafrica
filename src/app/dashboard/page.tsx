"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useMembership } from "@/hooks/use-membership";
import {
  ShoppingBag,
  Download,
  User,
  FileText,
  FileSpreadsheet,
  FileJson,
  ExternalLink,
  Eye,
  Database,
  Crown,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { Purchase } from "@/types";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-48" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const { t } = useLanguage();
  const { subscription, subscriptionPlan, loading: membershipLoading } = useMembership();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);

  const defaultTab = searchParams.get("tab") || "purchases";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
    if (!authLoading && user && user.role === "admin") {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchPurchases() {
      if (!user) return;
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch("/api/user/purchases", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPurchases(data.purchases || []);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, [user, getIdToken]);

  // Check for payment result
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success(t("membership.subscribed"));
      router.replace("/dashboard?tab=membership", { scroll: false });
    } else if (payment === "renewed") {
      toast.success(t("membership.renewed"));
      router.replace("/dashboard?tab=membership", { scroll: false });
    }
  }, [searchParams, t, router]);

  const handleDownload = async (
    datasetId: string,
    datasetTitle: string,
    format: "csv" | "excel" | "json"
  ) => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(
        `/api/datasets/${datasetId}/download?format=${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      a.download = `${datasetTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${t("dashboard.downloadedAs")} ${format.toUpperCase()}`);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleRenew = async () => {
    if (!subscription) return;
    setRenewLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/memberships/renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setRenewLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-10 space-y-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-64 w-full bg-muted" />
      </div>
    );
  }

  if (!user) return null;

  const isExpiringSoon =
    subscription &&
    new Date(subscription.endDate).getTime() - Date.now() <
      7 * 24 * 60 * 60 * 1000;

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      <div className="mb-10">
        <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">{t("dashboard.account")}</p>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("dashboard.dashboard")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.welcomeBack")}, {user.displayName || user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{purchases.length}</p>
            <p className="text-sm text-muted-foreground">{t("dashboard.purchases")}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{purchases.length}</p>
            <p className="text-sm text-muted-foreground">{t("dashboard.datasetsAvailable")}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            {subscription ? (
              <Crown className="h-5 w-5 text-purple-400" />
            ) : (
              <User className="h-5 w-5 text-purple-400" />
            )}
          </div>
          <div>
            {subscription ? (
              <>
                <p className="text-sm font-medium text-foreground">{subscription.planName}</p>
                <p className="text-sm text-muted-foreground">{t("membership.activePlan")}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="purchases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
            {t("dashboard.myPurchases")}
          </TabsTrigger>
          <TabsTrigger value="membership" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
            {t("membership.membership")}
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
            {t("dashboard.profile")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full bg-muted" />
              ))}
            </div>
          ) : purchases.length > 0 ? (
            <div className="space-y-4">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="glass-card rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{purchase.datasetTitle}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge className={purchase.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-0 text-xs" : "bg-muted text-muted-foreground border-border text-xs"}>
                          {purchase.status}
                        </Badge>
                        <span>{new Date(purchase.createdAt).toLocaleDateString()}</span>
                        <span>{purchase.amount.toLocaleString()} {purchase.currency}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {purchase.allowDownload !== false ? (
                        (["csv", "excel", "json"] as const).map((format) => (
                          <button key={format} onClick={() => handleDownload(purchase.datasetId, purchase.datasetTitle, format)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-muted transition-colors flex items-center gap-1">
                            {format === "csv" && <FileText className="h-3 w-3" />}
                            {format === "excel" && <FileSpreadsheet className="h-3 w-3" />}
                            {format === "json" && <FileJson className="h-3 w-3" />}
                            {format.toUpperCase()}
                          </button>
                        ))
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-purple-400 bg-purple-500/10 flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {t("dataset.viewOnly")}
                        </span>
                      )}
                      <Link href={`/datasets/${purchase.datasetId}?fullview=true`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {t("dataset.fullView")}
                      </Link>
                      <Link href={`/datasets/${purchase.datasetId}`} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors" title={t("dataset.viewDataset")}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-4">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground">{t("dashboard.noPurchases")}</h3>
              <p className="text-muted-foreground">{t("dashboard.noPurchasesDesc")}</p>
              <Link href="/datasets" className="inline-flex px-6 py-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-medium">
                {t("dashboard.browseDatasets")}
              </Link>
            </div>
          )}
        </TabsContent>

        {/* Membership Tab */}
        <TabsContent value="membership" className="mt-6">
          {membershipLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full bg-muted" />
            </div>
          ) : subscription ? (
            <div className="space-y-6">
              {/* Active subscription card */}
              <div className="glass-card rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{subscription.planName}</h3>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                        {t("membership.active")}
                      </Badge>
                    </div>
                  </div>
                  <Badge className="bg-muted text-muted-foreground border-border">
                    {subscription.billingCycle === "yearly" ? t("membership.yearly") : t("membership.monthly")}
                  </Badge>
                </div>

                <Separator className="bg-border" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("membership.startDate")}</p>
                    <p className="font-medium text-foreground">{new Date(subscription.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("membership.endDate")}</p>
                    <p className={`font-medium ${isExpiringSoon ? "text-amber-400" : "text-foreground"}`}>
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("membership.datasetsIncluded")}</p>
                    <p className="font-medium text-foreground">{subscriptionPlan?.datasetCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("membership.renewals")}</p>
                    <p className="font-medium text-foreground">{subscription.renewalCount}</p>
                  </div>
                </div>

                {isExpiringSoon && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-sm text-amber-400">
                      {t("membership.expiringSoon")}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleRenew}
                    disabled={renewLoading}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${renewLoading ? "animate-spin" : ""}`} />
                    {t("membership.renew")}
                  </button>
                  <Link
                    href="/pricing"
                    className="px-6 py-2.5 border border-border text-foreground rounded-xl font-medium hover:bg-muted transition-colors"
                  >
                    {t("membership.changePlan")}
                  </Link>
                </div>
              </div>

              {/* Payment history */}
              {subscription.payments && subscription.payments.length > 0 && (
                <div className="glass-card rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-foreground">{t("membership.paymentHistory")}</h3>
                  <div className="space-y-3">
                    {subscription.payments
                      .slice()
                      .reverse()
                      .map((payment, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="text-sm">
                            <p className="text-foreground">{payment.billingCycle === "yearly" ? t("membership.yearly") : t("membership.monthly")}</p>
                            <p className="text-muted-foreground">{new Date(payment.paidAt).toLocaleDateString()}</p>
                          </div>
                          <p className="font-medium text-emerald-400">
                            {payment.amount.toLocaleString()} {payment.currency}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 space-y-4">
              <Crown className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground">{t("membership.noSubscription")}</h3>
              <p className="text-muted-foreground">{t("membership.noSubscriptionDesc")}</p>
              <Link href="/pricing" className="inline-flex px-6 py-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-medium">
                {t("membership.viewPlans")}
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-lg">{t("dashboard.profileInfo")}</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.name")}</p>
                <p className="font-medium text-foreground">{user.displayName || t("dashboard.notSet")}</p>
              </div>
              <Separator className="bg-border" />
              <div>
                <p className="text-sm text-muted-foreground">{t("auth.email")}</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
              <Separator className="bg-border" />
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.role")}</p>
                <Badge className="bg-primary/10 text-primary border-0 capitalize">{user.role}</Badge>
              </div>
              <Separator className="bg-border" />
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.memberSince")}</p>
                <p className="font-medium text-foreground">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
