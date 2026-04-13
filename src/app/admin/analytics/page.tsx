"use client";

import { useEffect, useState, useCallback } from "react";
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
  Eye,
  Globe,
  Wifi,
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

// Simple mini bar chart for monthly/daily data
function MiniBarChart({
  data,
  valueKey,
  color,
  labelKey = "month",
}: {
  data: Array<Record<string, unknown>>;
  valueKey: string;
  color: string;
  labelKey?: string;
}) {
  const max = Math.max(...data.map((d) => (d[valueKey] as number) || 0), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((item, i) => {
        const value = (item[valueKey] as number) || 0;
        const pct = Math.max((value / max) * 100, 2);
        const rawLabel = (item[labelKey] as string) || "";
        const shortLabel = rawLabel.split("-").slice(1).join("/");
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex-1 flex items-end">
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{ height: `${pct}%`, backgroundColor: color }}
                title={`${rawLabel}: ${value.toLocaleString()}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{shortLabel}</span>
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

  // Visitor analytics
  const [visitorData, setVisitorData] = useState<{
    activeNow: number;
    sessions: Array<{ id: string; userId?: string; userEmail?: string; page: string; lastSeen: string }>;
    totalViews: number;
    totalUnique: number;
    daily: Array<{ date: string; views: number; uniqueVisitors: number }>;
  } | null>(null);
  const [visitorDays, setVisitorDays] = useState(30);

  const fetchVisitorData = useCallback(async () => {
    if (!user || user.role !== "admin") return;
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/analytics/track?days=${visitorDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVisitorData({
          activeNow: data.realtime?.activeNow || 0,
          sessions: data.realtime?.sessions || [],
          totalViews: data.period?.totalViews || 0,
          totalUnique: data.period?.totalUnique || 0,
          daily: data.period?.daily || [],
        });
      }
    } catch { /* silent */ }
  }, [user, getIdToken, visitorDays]);

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

  // Fetch visitor data + auto-refresh every 30s
  useEffect(() => {
    fetchVisitorData();
    const interval = setInterval(fetchVisitorData, 30000);
    return () => clearInterval(interval);
  }, [fetchVisitorData]);

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

            {/* Real-Time Visitor Analytics */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Globe className="h-5 w-5 text-cyan-400" />
                  {t("admin.visitorAnalytics")}
                </h2>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setVisitorDays(d)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        visitorDays === d
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d} {t("admin.days")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visitor stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center relative">
                      <Wifi className="h-5 w-5 text-cyan-400" />
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{visitorData?.activeNow ?? 0}</p>
                      <p className="text-sm text-muted-foreground">{t("admin.activeNow")}</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{(visitorData?.totalViews ?? 0).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{t("admin.totalPageViews")} ({visitorDays}j)</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{(visitorData?.totalUnique ?? 0).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{t("admin.uniqueVisitors")} ({visitorDays}j)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily page views chart */}
              {visitorData && visitorData.daily.length > 0 && (
                <div className="glass-card rounded-xl border border-border overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-400" />
                      {t("admin.dailyPageViews")}
                    </h3>
                  </div>
                  <div className="p-6">
                    <MiniBarChart
                      data={visitorData.daily as unknown as Array<Record<string, unknown>>}
                      valueKey="views"
                      color="#06b6d4"
                      labelKey="date"
                    />
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{visitorData.daily[0]?.date}</span>
                      <span>{visitorData.daily[visitorData.daily.length - 1]?.date}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Connected users list */}
              {visitorData && visitorData.sessions.length > 0 && (
                <div className="glass-card rounded-xl border border-border overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-green-400" />
                      {t("admin.connectedUsers")}
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs ml-auto">
                        {visitorData.sessions.length} {t("admin.online")}
                      </Badge>
                    </h3>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {visitorData.sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 bg-green-500 rounded-full" />
                            <span className="text-sm font-medium text-foreground">
                              {session.userEmail || t("admin.anonymousVisitor")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {session.page}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(session.lastSeen).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
