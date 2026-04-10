"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  ArrowLeft,
  DollarSign,
  ShoppingBag,
  Users,
  Database,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  MapPin,
  CreditCard,
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
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    sales: number;
  }>;
  monthlyUsers: Array<{
    month: string;
    count: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
    revenue: number;
    sales: number;
  }>;
  paymentMethods: Record<string, { count: number; revenue: number }>;
  countries: Array<{
    name: string;
    count: number;
  }>;
}

// Simple bar chart component (CSS-based, no dependency)
function BarChart({
  data,
  labelKey,
  valueKey,
  color = "primary",
  formatValue,
}: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => (d[valueKey] as number) || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const value = (item[valueKey] as number) || 0;
        const label = item[labelKey] as string;
        const pct = (value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 truncate text-right">{label}</span>
            <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
              <div
                className={`h-full bg-${color} rounded-md transition-all duration-500`}
                style={{ width: `${pct}%`, backgroundColor: color === "primary" ? "hsl(var(--primary))" : color }}
              />
            </div>
            <span className="text-xs font-medium text-foreground w-16 text-right">
              {formatValue ? formatValue(value) : value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Simple mini bar chart for monthly data
function MiniBarChart({
  data,
  valueKey,
  color,
}: {
  data: Array<Record<string, unknown>>;
  valueKey: string;
  color: string;
}) {
  const max = Math.max(...data.map((d) => (d[valueKey] as number) || 0), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((item, i) => {
        const value = (item[valueKey] as number) || 0;
        const pct = Math.max((value / max) * 100, 2);
        const month = (item.month as string) || "";
        const shortMonth = month.split("-")[1] || "";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex-1 flex items-end">
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{ height: `${pct}%`, backgroundColor: color }}
                title={`${value.toLocaleString()}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{shortMonth}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user || user.role !== "admin") return;
      const token = await getIdToken();
      if (!token) return;

      try {
        const res = await fetch("/api/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user, getIdToken]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.backToAdmin")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.salesAnalytics")}</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 bg-muted rounded-xl" />
            ))}
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("admin.revenueCFA")}</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalSales}</p>
                    <p className="text-sm text-muted-foreground">{t("admin.totalSales")}</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">{t("admin.users")}</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalDatasets}</p>
                    <p className="text-sm text-muted-foreground">{t("admin.datasets")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Revenue & User Growth Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue */}
              <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {t("admin.monthlyRevenue")}
                  </h2>
                </div>
                <div className="p-6">
                  <MiniBarChart
                    data={analytics.monthlyRevenue as unknown as Array<Record<string, unknown>>}
                    valueKey="revenue"
                    color="#22c55e"
                  />
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{analytics.monthlyRevenue[0]?.month}</span>
                    <span>{analytics.monthlyRevenue[analytics.monthlyRevenue.length - 1]?.month}</span>
                  </div>
                </div>
              </div>

              {/* User Growth */}
              <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-400" />
                    {t("admin.userGrowth")}
                  </h2>
                </div>
                <div className="p-6">
                  <MiniBarChart
                    data={analytics.monthlyUsers as unknown as Array<Record<string, unknown>>}
                    valueKey="count"
                    color="#f59e0b"
                  />
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{analytics.monthlyUsers[0]?.month}</span>
                    <span>{analytics.monthlyUsers[analytics.monthlyUsers.length - 1]?.month}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown & Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              {analytics.categories.length > 0 && (
                <div className="glass-card rounded-xl border border-border overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-400" />
                      {t("admin.categoryBreakdown")}
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {analytics.categories.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-foreground">{t(`categories.${cat.name}`)}</span>
                            <Badge className="bg-muted text-muted-foreground border-border text-xs">
                              {cat.count} {t("admin.datasetsSmall")}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{cat.revenue.toLocaleString()} CFA</p>
                            <p className="text-xs text-muted-foreground">{cat.sales} {t("admin.salesCount")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              {Object.keys(analytics.paymentMethods).length > 0 && (
                <div className="glass-card rounded-xl border border-border overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      {t("admin.paymentBreakdown")}
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {Object.entries(analytics.paymentMethods).map(([method, data]) => {
                        const totalPMethodRevenue = Object.values(analytics.paymentMethods).reduce((s, d) => s + d.revenue, 0) || 1;
                        const pct = Math.round((data.revenue / totalPMethodRevenue) * 100);
                        return (
                          <div key={method}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground capitalize">
                                {method === "paydunya" ? "PayDunya" : method === "kkiapay" ? "KKiaPay" : method}
                              </span>
                              <span className="text-sm text-muted-foreground">{pct}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: method === "paydunya" ? "#6366f1" : method === "kkiapay" ? "#22c55e" : "#f59e0b",
                                }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-muted-foreground">{data.count} {t("admin.transactions")}</span>
                              <span className="text-xs font-medium text-foreground">{data.revenue.toLocaleString()} CFA</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Country Distribution & Monthly Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Country distribution */}
              {analytics.countries.length > 0 && (
                <div className="glass-card rounded-xl border border-border overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-400" />
                      {t("admin.datasetsByCountry")}
                    </h2>
                  </div>
                  <div className="p-6">
                    <BarChart
                      data={analytics.countries.slice(0, 10) as unknown as Array<Record<string, unknown>>}
                      labelKey="name"
                      valueKey="count"
                      color="#22c55e"
                    />
                  </div>
                </div>
              )}

              {/* Monthly Sales */}
              <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    {t("admin.monthlySales")}
                  </h2>
                </div>
                <div className="p-6">
                  <MiniBarChart
                    data={analytics.monthlyRevenue as unknown as Array<Record<string, unknown>>}
                    valueKey="sales"
                    color="hsl(var(--primary))"
                  />
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{analytics.monthlyRevenue[0]?.month}</span>
                    <span>{analytics.monthlyRevenue[analytics.monthlyRevenue.length - 1]?.month}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Selling Datasets */}
            {analytics.topDatasets.length > 0 && (
              <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {t("admin.topSellingDatasets")}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {analytics.topDatasets.map((ds, i) => (
                      <div
                        key={ds.id}
                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-muted-foreground/30 w-8">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{ds.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {ds.count} {t("admin.salesCount")}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-green-400">
                          {ds.revenue.toLocaleString()} CFA
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Sales */}
            {analytics.recentSales.length > 0 && (
              <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">{t("admin.recentSales")}</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {analytics.recentSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm text-foreground">{sale.datasetTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="font-semibold text-green-400">
                          +{sale.amount.toLocaleString()} {sale.currency}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-border p-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {t("admin.noAnalytics")} {t("admin.noAnalyticsDesc")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
