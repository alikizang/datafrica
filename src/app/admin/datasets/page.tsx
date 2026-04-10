"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  ArrowLeft,
  Database,
  Search,
  Star,
  StarOff,
  Pencil,
  Trash2,
  ShoppingBag,
  DollarSign,
  Upload,
  X,
  Check,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { DATASET_CATEGORIES, AFRICAN_COUNTRIES } from "@/types";

interface DatasetRecord {
  id: string;
  title: string;
  titles?: Record<string, string>;
  description: string;
  descriptions?: Record<string, string>;
  category: string;
  country: string;
  price: number;
  currency: string;
  recordCount: number;
  columns: string[];
  allowDownload: boolean;
  featured: boolean;
  salesCount: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

interface EditingState {
  id: string;
  title: string;
  description: string;
  category: string;
  country: string;
  price: number;
  featured: boolean;
  allowDownload: boolean;
}

export default function AdminDatasetsPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasets();
  }, [user, getIdToken]);

  async function fetchDatasets() {
    if (!user || user.role !== "admin") return;
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/datasets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.datasets);
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const startEdit = (ds: DatasetRecord) => {
    setEditing({
      id: ds.id,
      title: ds.title,
      description: ds.description,
      category: ds.category,
      country: ds.country,
      price: ds.price,
      featured: ds.featured,
      allowDownload: ds.allowDownload,
    });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/datasets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          datasetId: editing.id,
          title: editing.title,
          description: editing.description,
          category: editing.category,
          country: editing.country,
          price: editing.price,
          featured: editing.featured,
          allowDownload: editing.allowDownload,
        }),
      });

      if (res.ok) {
        setDatasets((prev) =>
          prev.map((ds) =>
            ds.id === editing.id
              ? {
                  ...ds,
                  title: editing.title,
                  description: editing.description,
                  category: editing.category,
                  country: editing.country,
                  price: editing.price,
                  featured: editing.featured,
                  allowDownload: editing.allowDownload,
                }
              : ds
          )
        );
        setEditing(null);
        toast.success(t("admin.datasetUpdated"));
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (dsId: string, current: boolean) => {
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/datasets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ datasetId: dsId, featured: !current }),
      });

      if (res.ok) {
        setDatasets((prev) =>
          prev.map((ds) => (ds.id === dsId ? { ...ds, featured: !current } : ds))
        );
        toast.success(t("admin.datasetUpdated"));
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const deleteDataset = async (dsId: string) => {
    if (!confirm(t("admin.confirmDelete"))) return;
    setDeleting(dsId);
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/datasets?id=${dsId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setDatasets((prev) => prev.filter((ds) => ds.id !== dsId));
        toast.success(t("admin.datasetDeleted"));
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = datasets.filter((ds) => {
    const matchesSearch =
      !searchQuery ||
      ds.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === "all" || ds.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalRevenue = datasets.reduce((s, d) => s + d.revenue, 0);
  const totalSales = datasets.reduce((s, d) => s + d.salesCount, 0);

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

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("admin.manageDatasets")}</h1>
              <p className="text-sm text-muted-foreground">
                {datasets.length} {t("admin.datasetsTotal")}
              </p>
            </div>
          </div>
          <Link
            href="/admin/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <Upload className="h-4 w-4" />
            {t("admin.uploadDataset")}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{datasets.length}</p>
              <p className="text-xs text-muted-foreground">{t("admin.datasetsTotal")}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalSales}</p>
              <p className="text-xs text-muted-foreground">{t("admin.totalSales")}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalRevenue.toLocaleString()} CFA</p>
              <p className="text-xs text-muted-foreground">{t("admin.totalRevenue")}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchDatasets")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted border-border text-foreground rounded-xl"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border bg-muted text-foreground"
          >
            <option value="all">{t("dataset.allCategories")}</option>
            {DATASET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
            ))}
          </select>
        </div>

        {/* Edit modal */}
        {editing && (
          <div className="glass-card rounded-xl border border-border p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t("admin.editDataset")}</h3>
              <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("admin.title")}</label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("admin.price")}</label>
                <Input
                  type="number"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  className="bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("admin.category")}</label>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-muted text-foreground"
                >
                  {DATASET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("admin.country")}</label>
                <select
                  value={editing.country}
                  onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-muted text-foreground"
                >
                  {AFRICAN_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-foreground">{t("admin.description")}</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-muted text-foreground min-h-[80px] resize-y"
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.featured}
                    onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                    className="rounded border-border"
                  />
                  {t("admin.featuredDataset")}
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.allowDownload}
                    onChange={(e) => setEditing({ ...editing, allowDownload: e.target.checked })}
                    className="rounded border-border"
                  />
                  {t("admin.allowDownload")}
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={cancelEdit} className="border-border text-muted-foreground rounded-xl">
                {t("common.cancel")}
              </Button>
              <Button onClick={saveEdit} disabled={saving} className="rounded-xl">
                <Check className="h-4 w-4 mr-1" />
                {saving ? t("admin.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="glass-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("admin.noDatasetsFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">{t("admin.title")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.category")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.country")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.price")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.recordsCol")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.salesCol")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.revenueCol")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.access")}</TableHead>
                    <TableHead className="text-muted-foreground text-right">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ds) => (
                    <TableRow key={ds.id} className="border-border hover:bg-muted">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ds.featured && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                          <span className="font-medium text-foreground truncate max-w-[200px]">{ds.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-muted text-muted-foreground border-border">
                          {t(`categories.${ds.category}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ds.country}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        {ds.price > 0 ? `${ds.price.toLocaleString()} ${ds.currency || "CFA"}` : t("admin.free")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{(ds.recordCount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ShoppingBag className="h-3.5 w-3.5" />
                          {ds.salesCount}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-emerald-400">
                        {ds.revenue > 0 ? `${ds.revenue.toLocaleString()} CFA` : "-"}
                      </TableCell>
                      <TableCell>
                        {ds.allowDownload ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <Download className="h-3 w-3 mr-1" />
                            {t("dataset.download")}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <Eye className="h-3 w-3 mr-1" />
                            {t("dataset.viewOnly")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => toggleFeatured(ds.id, ds.featured)}
                            title={ds.featured ? t("admin.removeFeatured") : t("admin.makeFeatured")}
                          >
                            {ds.featured ? (
                              <StarOff className="h-4 w-4" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(ds)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => deleteDataset(ds.id)}
                            disabled={deleting === ds.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
