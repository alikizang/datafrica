"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  DollarSign,
  ShoppingBag,
  Users,
  Database,
  TrendingUp,
  BarChart3,
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

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

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

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-[#7a8ba3] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-[#3d7eff]/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-[#3d7eff]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sales Analytics</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 bg-white/5 rounded-xl" />
            ))}
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {analytics.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-[#7a8ba3]">Revenue (CFA)</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#3d7eff]/10 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-[#3d7eff]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{analytics.totalSales}</p>
                    <p className="text-sm text-[#7a8ba3]">Total Sales</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{analytics.totalUsers}</p>
                    <p className="text-sm text-[#7a8ba3]">Users</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{analytics.totalDatasets}</p>
                    <p className="text-sm text-[#7a8ba3]">Datasets</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Selling Datasets */}
            {analytics.topDatasets.length > 0 && (
              <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#3d7eff]" />
                    Top Selling Datasets
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {analytics.topDatasets.map((ds, i) => (
                      <div
                        key={ds.id}
                        className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-white/20 w-8">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-white">{ds.title}</p>
                            <p className="text-sm text-[#7a8ba3]">
                              {ds.count} sales
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
              <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">Recent Sales</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {analytics.recentSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm text-white">{sale.datasetTitle}</p>
                          <p className="text-xs text-[#7a8ba3]">
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
          <div className="glass-card rounded-xl border border-white/10 p-12 text-center">
            <BarChart3 className="h-12 w-12 text-[#7a8ba3] mx-auto mb-3" />
            <p className="text-[#7a8ba3]">
              No analytics data available yet. Sales data will appear here once customers start purchasing datasets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
