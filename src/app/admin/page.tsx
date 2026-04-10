"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  Database,
  Users,
  DollarSign,
  BarChart3,
  Upload,
  ShoppingBag,
  CreditCard,
  FolderOpen,
} from "lucide-react";

interface Analytics {
  totalRevenue: number;
  totalSales: number;
  totalUsers: number;
  totalDatasets: number;
  recentSales: Array<{
    id: string;
    datasetTitle: string;
    amount: number;
    currency: string;
    createdAt: string;
  }>;
  topDatasets: Array<{
    id: string;
    title: string;
    count: number;
    revenue: number;
  }>;
}

export default function AdminPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user || user.role !== "admin") return;
      const token = await getIdToken();
      if (!token) {
        setError("Authentication token unavailable");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || `Server error (${res.status})`);
        }
      } catch (err) {
        setError("Network error - could not fetch analytics");
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [user, getIdToken]);

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">{t("admin.administration")}</p>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("admin.adminPanel")}</h1>
          <p className="text-muted-foreground">{t("admin.manageDesc")}</p>
        </div>
        <Link href="/admin/upload" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">
          <Upload className="h-4 w-4" />
          {t("admin.uploadDataset")}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        <Link href="/admin/upload" className="glass-card rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t("admin.uploadDataset")}</p>
            <p className="text-sm text-muted-foreground">{t("admin.addNewData")}</p>
          </div>
        </Link>
        <Link href="/admin/datasets" className="glass-card rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t("admin.manageDatasets")}</p>
            <p className="text-sm text-muted-foreground">{t("admin.editDeleteData")}</p>
          </div>
        </Link>
        <Link href="/admin/users" className="glass-card rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t("admin.manageUsers")}</p>
            <p className="text-sm text-muted-foreground">{t("admin.userAccounts")}</p>
          </div>
        </Link>
        <Link href="/admin/payments" className="glass-card rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t("admin.payments")}</p>
            <p className="text-sm text-muted-foreground">{t("admin.paymentProviders")}</p>
          </div>
        </Link>
        <Link href="/admin/analytics" className="glass-card rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t("admin.analytics")}</p>
            <p className="text-sm text-muted-foreground">{t("admin.salesAnalytics")}</p>
          </div>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-muted" />
          ))
        ) : (
          <>
            {[
              { icon: DollarSign, color: "emerald", label: t("admin.totalRevenue"), value: (analytics?.totalRevenue || 0).toLocaleString() },
              { icon: ShoppingBag, color: "blue", label: t("admin.totalSales"), value: analytics?.totalSales || 0 },
              { icon: Users, color: "amber", label: t("admin.totalUsers"), value: analytics?.totalUsers || 0 },
              { icon: Database, color: "purple", label: t("admin.datasets"), value: analytics?.totalDatasets || 0 },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-xl p-5 stat-glow">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-400`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {analytics && analytics.recentSales.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-foreground mb-4">{t("admin.recentSales")}</h3>
          <div className="space-y-3">
            {analytics.recentSales.slice(0, 10).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-sm text-foreground">{sale.datasetTitle}</p>
                  <p className="text-xs text-dim">{new Date(sale.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="font-semibold text-emerald-400">
                  +{sale.amount.toLocaleString()} {sale.currency}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
