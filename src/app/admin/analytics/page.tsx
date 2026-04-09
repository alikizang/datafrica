"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  DollarSign,
  ShoppingBag,
  Users,
  Database,
  TrendingUp,
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
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>

      <h1 className="text-3xl font-bold mb-8">Sales Analytics</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : analytics ? (
        <div className="space-y-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analytics.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Revenue (CFA)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalSales}</p>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalDatasets}</p>
                    <p className="text-sm text-muted-foreground">Datasets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Selling Datasets */}
          {analytics.topDatasets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Selling Datasets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topDatasets.map((ds, i) => (
                    <div
                      key={ds.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-muted-foreground/50 w-8">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium">{ds.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {ds.count} sales
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-green-600 dark:text-green-400">
                        {ds.revenue.toLocaleString()} CFA
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Sales */}
          {analytics.recentSales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{sale.datasetTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        +{sale.amount.toLocaleString()} {sale.currency}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          No analytics data available yet.
        </p>
      )}
    </div>
  );
}
