"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import {
  ShoppingBag,
  Download,
  User,
  FileText,
  FileSpreadsheet,
  FileJson,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { Purchase } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
    // Redirect admin users to admin dashboard
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
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchPurchases();
  }, [user, getIdToken]);

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

      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error("Download failed");
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-10 space-y-6">
        <Skeleton className="h-8 w-48 bg-white/5" />
        <Skeleton className="h-64 w-full bg-white/5" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm font-medium text-[#3d7eff] uppercase tracking-wider mb-2">Account</p>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-[#7a8ba3]">
          Welcome back, {user.displayName || user.email}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#3d7eff]/10 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-[#3d7eff]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{purchases.length}</p>
            <p className="text-sm text-[#7a8ba3]">Purchases</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{purchases.length}</p>
            <p className="text-sm text-[#7a8ba3]">Datasets Available</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <User className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white truncate">{user.email}</p>
            <p className="text-sm text-[#7a8ba3] capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList className="bg-[#111d32] border border-white/[0.06]">
          <TabsTrigger value="purchases" className="data-[state=active]:bg-[#3d7eff] data-[state=active]:text-white text-[#7a8ba3]">
            My Purchases
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#3d7eff] data-[state=active]:text-white text-[#7a8ba3]">
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full bg-white/5" />
              ))}
            </div>
          ) : purchases.length > 0 ? (
            <div className="space-y-4">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="glass-card rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-white">{purchase.datasetTitle}</h3>
                      <div className="flex items-center gap-2 text-sm text-[#7a8ba3]">
                        <Badge
                          className={
                            purchase.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-0 text-xs"
                              : "bg-[#1a2a42] text-[#7a8ba3] border-white/[0.08] text-xs"
                          }
                        >
                          {purchase.status}
                        </Badge>
                        <span>{new Date(purchase.createdAt).toLocaleDateString()}</span>
                        <span>{purchase.amount.toLocaleString()} {purchase.currency}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {["csv", "excel", "json"].map((format) => (
                        <button
                          key={format}
                          onClick={() => handleDownload(purchase.datasetId, purchase.datasetTitle, format as "csv" | "excel" | "json")}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-[#c8d6e5] hover:bg-white/5 transition-colors flex items-center gap-1"
                        >
                          {format === "csv" && <FileText className="h-3 w-3" />}
                          {format === "excel" && <FileSpreadsheet className="h-3 w-3" />}
                          {format === "json" && <FileJson className="h-3 w-3" />}
                          {format.toUpperCase()}
                        </button>
                      ))}
                      <Link
                        href={`/datasets/${purchase.datasetId}`}
                        className="p-1.5 rounded-lg text-[#7a8ba3] hover:text-[#3d7eff] hover:bg-white/5 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-4">
              <ShoppingBag className="h-12 w-12 mx-auto text-[#1a2a42]" />
              <h3 className="text-lg font-semibold text-white">No purchases yet</h3>
              <p className="text-[#7a8ba3]">
                Browse our marketplace to find datasets you need
              </p>
              <Link
                href="/datasets"
                className="inline-flex px-6 py-2.5 bg-[#3d7eff] text-white rounded-full hover:bg-[#2d6eef] transition-colors font-medium"
              >
                Browse Datasets
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-white text-lg">Profile Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#7a8ba3]">Name</p>
                <p className="font-medium text-white">{user.displayName || "Not set"}</p>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div>
                <p className="text-sm text-[#7a8ba3]">Email</p>
                <p className="font-medium text-white">{user.email}</p>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div>
                <p className="text-sm text-[#7a8ba3]">Role</p>
                <Badge className="bg-[#3d7eff]/10 text-[#3d7eff] border-0 capitalize">
                  {user.role}
                </Badge>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div>
                <p className="text-sm text-[#7a8ba3]">Member since</p>
                <p className="font-medium text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
