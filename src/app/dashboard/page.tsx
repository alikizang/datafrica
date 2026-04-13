"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Pencil,
  Check,
  X,
  KeyRound,
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import type { Purchase, Alert } from "@/types";

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
  const { user, firebaseUser, loading: authLoading, getIdToken, updateUserProfile } = useAuth();
  const { t } = useLanguage();
  const { subscription, subscriptionPlan, loading: membershipLoading } = useMembership();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

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

  // Fetch user alerts
  useEffect(() => {
    async function fetchAlerts() {
      if (!user) return;
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch("/api/user/alerts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts || []);
        }
      } catch {
        // fail silently
      }
    }
    fetchAlerts();
  }, [user, getIdToken]);

  const markAlertRead = async (alertId: string) => {
    const token = await getIdToken();
    if (!token) return;
    try {
      await fetch("/api/user/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, read: true } : a));
    } catch { /* silent */ }
  };

  const markAllAlertsRead = async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      await fetch("/api/user/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAllRead: true }),
      });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch { /* silent */ }
  };

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

      {/* Alerts section */}
      {alerts.filter((a) => !a.read).length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              {t("dashboard.alerts")}
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                {alerts.filter((a) => !a.read).length}
              </Badge>
            </h3>
            <button
              onClick={markAllAlertsRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("dashboard.markAllRead")}
            </button>
          </div>
          {alerts
            .filter((a) => !a.read)
            .slice(0, 5)
            .map((alert) => (
              <div
                key={alert.id}
                className={`glass-card rounded-xl p-4 flex items-start gap-3 border ${
                  alert.type === "error"
                    ? "border-red-500/20 bg-red-500/5"
                    : alert.type === "warning"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-blue-500/20 bg-blue-500/5"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {alert.type === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  ) : alert.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => markAlertRead(alert.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <MessageSquare className="h-4 w-4 text-primary" />
          {t("messages.title")}
        </Link>
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
          <ProfileTab user={user} firebaseUser={firebaseUser} updateUserProfile={updateUserProfile} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Profile Tab Component ---

function ProfileTab({
  user,
  firebaseUser,
  updateUserProfile,
  t,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  firebaseUser: ReturnType<typeof useAuth>["firebaseUser"];
  updateUserProfile: ReturnType<typeof useAuth>["updateUserProfile"];
  t: (key: string) => string;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.displayName || "");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const isEmailProvider = firebaseUser?.providerData?.some(
    (p) => p.providerId === "password"
  );

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      await updateUserProfile({ displayName: nameInput.trim() });
      setEditingName(false);
      toast.success(t("dashboard.profileUpdated") !== "dashboard.profileUpdated" ? t("dashboard.profileUpdated") : "Profile updated");
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setChangingPassword(true);
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      await sendPasswordResetEmail(auth, user.email);
      toast.success(t("dashboard.passwordResetSent") !== "dashboard.passwordResetSent" ? t("dashboard.passwordResetSent") : "Password reset email sent");
    } catch {
      toast.error(t("common.error"));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar & Name */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <h3 className="font-semibold text-foreground text-lg">{t("dashboard.profileInfo")}</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ""} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold border border-primary/20">
              {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground text-lg">{user.displayName || user.email.split("@")[0]}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Name */}
        <div>
          <p className="text-sm text-muted-foreground mb-1.5">{t("dashboard.name")}</p>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameInput(user.displayName || ""); } }}
              />
              <button
                onClick={handleSaveName}
                disabled={saving || !nameInput.trim()}
                className="h-10 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setEditingName(false); setNameInput(user.displayName || ""); }}
                className="h-10 px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground text-sm transition-colors flex items-center gap-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{user.displayName || t("dashboard.notSet")}</p>
              <button
                onClick={() => { setNameInput(user.displayName || ""); setEditingName(true); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                title={t("dashboard.editName") !== "dashboard.editName" ? t("dashboard.editName") : "Edit name"}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <Separator className="bg-border" />

        {/* Email */}
        <div>
          <p className="text-sm text-muted-foreground mb-1.5">{t("auth.email")}</p>
          <p className="font-medium text-foreground">{user.email}</p>
        </div>

        <Separator className="bg-border" />

        {/* Role */}
        <div>
          <p className="text-sm text-muted-foreground mb-1.5">{t("dashboard.role")}</p>
          <Badge className="bg-primary/10 text-primary border-0 capitalize">{user.role}</Badge>
        </div>

        <Separator className="bg-border" />

        {/* Member Since */}
        <div>
          <p className="text-sm text-muted-foreground mb-1.5">{t("dashboard.memberSince")}</p>
          <p className="font-medium text-foreground">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Password Change (only for email/password users) */}
      {isEmailProvider && (
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {t("dashboard.security") !== "dashboard.security" ? t("dashboard.security") : "Security"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.passwordResetDesc") !== "dashboard.passwordResetDesc"
              ? t("dashboard.passwordResetDesc")
              : "Send a password reset link to your email address."}
          </p>
          <button
            onClick={handlePasswordReset}
            disabled={changingPassword}
            className="px-5 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <KeyRound className={`h-4 w-4 ${changingPassword ? "animate-spin" : ""}`} />
            {t("dashboard.sendPasswordReset") !== "dashboard.sendPasswordReset"
              ? t("dashboard.sendPasswordReset")
              : "Send password reset email"}
          </button>
        </div>
      )}
    </div>
  );
}
