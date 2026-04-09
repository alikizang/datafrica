"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  Database,
  Users,
  DollarSign,
  BarChart3,
  Upload,
  ShoppingBag,
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

  if (authLoading || (!user || user.role !== "admin")) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-10 space-y-6">
        <Skeleton className="h-8 w-48 bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-sm font-medium text-[#3d7eff] uppercase tracking-wider mb-2">Administration</p>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-[#7a8ba3]">Manage datasets, users, and sales</p>
        </div>
        <Link
          href="/admin/upload"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#3d7eff] text-white rounded-full font-medium hover:bg-[#2d6eef] transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Dataset
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Link href="/admin/upload" className="glass-card rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="h-10 w-10 rounded-xl bg-[#3d7eff]/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-[#3d7eff]" />
          </div>
          <div>
            <p className="font-semibold text-white">Upload Dataset</p>
            <p className="text-sm text-[#7a8ba3]">Add new data to the marketplace</p>
          </div>
        </Link>
        <Link href="/admin/users" className="glass-card rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Manage Users</p>
            <p className="text-sm text-[#7a8ba3]">View and manage user accounts</p>
          </div>
        </Link>
        <Link href="/admin/analytics" className="glass-card rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Analytics</p>
            <p className="text-sm text-[#7a8ba3]">View detailed sales analytics</p>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-white/5" />
          ))
        ) : (
          <>
            {[
              { icon: DollarSign, color: "emerald", label: "Total Revenue (CFA)", value: (analytics?.totalRevenue || 0).toLocaleString() },
              { icon: ShoppingBag, color: "blue", label: "Total Sales", value: analytics?.totalSales || 0 },
              { icon: Users, color: "amber", label: "Total Users", value: analytics?.totalUsers || 0 },
              { icon: Database, color: "purple", label: "Datasets", value: analytics?.totalDatasets || 0 },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-xl p-5 stat-glow">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-${stat.color === "blue" ? "400" : stat.color === "emerald" ? "400" : stat.color === "amber" ? "400" : "400"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-[#7a8ba3]">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Recent Sales */}
      {analytics && analytics.recentSales.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-white mb-4">Recent Sales</h3>
          <div className="space-y-3">
            {analytics.recentSales.slice(0, 10).map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
              >
                <div>
                  <p className="font-medium text-sm text-white">{sale.datasetTitle}</p>
                  <p className="text-xs text-[#525f73]">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </p>
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
