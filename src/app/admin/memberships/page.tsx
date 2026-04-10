"use client";

import { useEffect, useState, useCallback } from "react";
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
  Crown,
  Plus,
  Pencil,
  Trash2,
  Archive,
  Users,
  X,
  Check,
  Search,
  Eye,
  Calendar,
  Ban,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { MembershipPlan, BillingCycle } from "@/types";

interface DatasetOption {
  id: string;
  title: string;
}

interface SubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  status: string;
  startDate: string;
  endDate: string;
  lastPaymentAmount: number;
  createdAt: string;
}

interface PlanFormData {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  datasetIds: string[];
  allowDownload: boolean;
  maxDownloadsPerMonth: number | null;
  features: string;
  displayOrder: number;
  highlighted: boolean;
}

const emptyForm: PlanFormData = {
  name: "",
  description: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  currency: "XOF",
  datasetIds: [],
  allowDownload: true,
  maxDownloadsPerMonth: null,
  features: "",
  displayOrder: 0,
  highlighted: false,
};

export default function AdminMembershipsPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"plans" | "subscriptions">("plans");

  // Plan form state
  const [showForm, setShowForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState("");

  // Subscription management
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState("all");

  const fetchToken = useCallback(async () => {
    return await getIdToken();
  }, [getIdToken]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadData();
  }, [user]);

  async function loadData() {
    const token = await fetchToken();
    if (!token) return;

    try {
      const [plansRes, subsRes, datasetsRes] = await Promise.all([
        fetch("/api/admin/memberships", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/subscriptions", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/datasets", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans);
      }
      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubscriptions(data.subscriptions);
      }
      if (datasetsRes.ok) {
        const data = await datasetsRes.json();
        setDatasets(
          data.datasets.map((d: { id: string; title: string }) => ({
            id: d.id,
            title: d.title,
          }))
        );
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingPlanId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(plan: MembershipPlan) {
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.pricing.monthly.price,
      yearlyPrice: plan.pricing.yearly.price,
      currency: plan.pricing.monthly.currency || "XOF",
      datasetIds: plan.datasetIds || [],
      allowDownload: plan.conditions.allowDownload,
      maxDownloadsPerMonth: plan.conditions.maxDownloadsPerMonth,
      features: (plan.features || []).join("\n"),
      displayOrder: plan.displayOrder,
      highlighted: plan.highlighted,
    });
    setShowForm(true);
  }

  async function savePlan() {
    if (!form.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (form.monthlyPrice <= 0 || form.yearlyPrice <= 0) {
      toast.error("Prices must be greater than 0");
      return;
    }

    setSaving(true);
    const token = await fetchToken();
    if (!token) return;

    const payload = {
      ...(editingPlanId ? { planId: editingPlanId } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      pricing: {
        monthly: { price: form.monthlyPrice, currency: form.currency },
        yearly: { price: form.yearlyPrice, currency: form.currency },
      },
      datasetIds: form.datasetIds,
      conditions: {
        allowDownload: form.allowDownload,
        maxDownloadsPerMonth: form.maxDownloadsPerMonth,
      },
      features: form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      displayOrder: form.displayOrder,
      highlighted: form.highlighted,
    };

    try {
      const res = await fetch("/api/admin/memberships", {
        method: editingPlanId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingPlanId ? "Plan updated" : "Plan created"
        );
        setShowForm(false);
        setEditingPlanId(null);
        setForm(emptyForm);
        setLoading(true);
        await loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(planId: string) {
    if (!confirm("Delete this plan? Active subscribers will keep their access until expiry."))
      return;

    const token = await fetchToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/memberships?id=${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.archived ? "Plan archived" : "Plan deleted");
        setLoading(true);
        await loadData();
      }
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function handleSubAction(
    subId: string,
    action: string,
    extra?: Record<string, unknown>
  ) {
    setActionLoading(subId);
    const token = await fetchToken();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptionId: subId, action, ...extra }),
      });

      if (res.ok) {
        toast.success(`Subscription ${action}d`);
        setLoading(true);
        await loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setActionLoading(null);
    }
  }

  function toggleDataset(dsId: string) {
    setForm((prev) => ({
      ...prev,
      datasetIds: prev.datasetIds.includes(dsId)
        ? prev.datasetIds.filter((id) => id !== dsId)
        : [...prev.datasetIds, dsId],
    }));
  }

  const filteredDatasets = datasets.filter(
    (ds) =>
      !datasetSearch ||
      ds.title.toLowerCase().includes(datasetSearch.toLowerCase())
  );

  const filteredSubs =
    subFilter === "all"
      ? subscriptions
      : subscriptions.filter((s) => s.status === subFilter);

  const totalSubscribers = plans.reduce(
    (s, p) => s + (p.subscriberCount || 0),
    0
  );
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;

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
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Memberships
              </h1>
              <p className="text-sm text-muted-foreground">
                {plans.length} plans &middot; {totalSubscribers} subscribers
              </p>
            </div>
          </div>
          <Button onClick={openCreateForm} className="rounded-xl">
            <Plus className="h-4 w-4 mr-1" />
            New Plan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crown className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {plans.filter((p) => p.status === "active").length}
              </p>
              <p className="text-xs text-muted-foreground">Active Plans</p>
            </div>
          </div>
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{activeSubs}</p>
              <p className="text-xs text-muted-foreground">
                Active Subscriptions
              </p>
            </div>
          </div>
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {subscriptions.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Total Subscriptions
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("plans")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "plans"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Plans ({plans.length})
          </button>
          <button
            onClick={() => setTab("subscriptions")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "subscriptions"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Subscriptions ({subscriptions.length})
          </button>
        </div>

        {/* Plan form */}
        {showForm && (
          <div className="glass-card rounded-xl border border-border p-6 mb-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-lg">
                {editingPlanId ? "Edit Plan" : "Create Plan"}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingPlanId(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Plan Name *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Professional"
                  className="bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-muted text-foreground"
                >
                  <option value="XOF">XOF (CFA)</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Monthly Price *
                </label>
                <Input
                  type="number"
                  value={form.monthlyPrice}
                  onChange={(e) =>
                    setForm({ ...form, monthlyPrice: Number(e.target.value) })
                  }
                  className="bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Yearly Price *
                </label>
                <Input
                  type="number"
                  value={form.yearlyPrice}
                  onChange={(e) =>
                    setForm({ ...form, yearlyPrice: Number(e.target.value) })
                  }
                  className="bg-muted border-border text-foreground rounded-xl"
                />
                {form.monthlyPrice > 0 && form.yearlyPrice > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Savings:{" "}
                    {Math.round(
                      ((form.monthlyPrice * 12 - form.yearlyPrice) /
                        (form.monthlyPrice * 12)) *
                        100
                    )}
                    % vs monthly
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Display Order
                </label>
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm({ ...form, displayOrder: Number(e.target.value) })
                  }
                  className="bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Max Downloads/Month
                </label>
                <Input
                  type="number"
                  value={form.maxDownloadsPerMonth ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxDownloadsPerMonth: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Leave empty for unlimited"
                  className="bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-muted text-foreground min-h-[80px] resize-y"
                  placeholder="Describe what this plan offers..."
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Features (one per line)
                </label>
                <textarea
                  value={form.features}
                  onChange={(e) =>
                    setForm({ ...form, features: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-muted text-foreground min-h-[80px] resize-y"
                  placeholder={"Access to 50+ datasets\nMonthly updates\nCSV/Excel export"}
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowDownload}
                    onChange={(e) =>
                      setForm({ ...form, allowDownload: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  Allow Download
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.highlighted}
                    onChange={(e) =>
                      setForm({ ...form, highlighted: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  Highlighted (recommended)
                </label>
              </div>
            </div>

            {/* Dataset picker */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Included Datasets ({form.datasetIds.length} selected)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search datasets..."
                  value={datasetSearch}
                  onChange={(e) => setDatasetSearch(e.target.value)}
                  className="pl-9 bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-border rounded-xl p-2 space-y-1">
                {filteredDatasets.map((ds) => (
                  <label
                    key={ds.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.datasetIds.includes(ds.id)}
                      onChange={() => toggleDataset(ds.id)}
                      className="rounded border-border"
                    />
                    <span className="text-foreground truncate">
                      {ds.title}
                    </span>
                  </label>
                ))}
                {filteredDatasets.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No datasets found
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingPlanId(null);
                }}
                className="border-border text-muted-foreground rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={savePlan}
                disabled={saving}
                className="rounded-xl"
              >
                <Check className="h-4 w-4 mr-1" />
                {saving
                  ? "Saving..."
                  : editingPlanId
                    ? "Update Plan"
                    : "Create Plan"}
              </Button>
            </div>
          </div>
        )}

        {/* Plans Tab */}
        {tab === "plans" && (
          <div className="glass-card rounded-xl border border-border overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-muted" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="p-12 text-center">
                <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No membership plans yet
                </p>
                <Button
                  onClick={openCreateForm}
                  className="mt-4 rounded-xl"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Plan
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">
                        Plan
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Monthly
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Yearly
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Datasets
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Subscribers
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Access
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow
                        key={plan.id}
                        className="border-border hover:bg-muted"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {plan.highlighted && (
                              <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="font-medium text-foreground">
                              {plan.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {plan.pricing.monthly.price.toLocaleString()}{" "}
                          {plan.pricing.monthly.currency}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {plan.pricing.yearly.price.toLocaleString()}{" "}
                          {plan.pricing.yearly.currency}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {plan.datasetIds.length}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            {plan.subscriberCount || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          {plan.conditions.allowDownload ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              Download
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                              <Eye className="h-3 w-3 mr-1" />
                              View Only
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              plan.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            }
                          >
                            {plan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditForm(plan)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => deletePlan(plan.id)}
                            >
                              {plan.subscriberCount > 0 ? (
                                <Archive className="h-4 w-4" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
        )}

        {/* Subscriptions Tab */}
        {tab === "subscriptions" && (
          <>
            <div className="flex gap-2 mb-4">
              {["all", "active", "expired", "cancelled"].map((f) => (
                <button
                  key={f}
                  onClick={() => setSubFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    subFilter === f
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="glass-card rounded-xl border border-border overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full bg-muted" />
                  ))}
                </div>
              ) : filteredSubs.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No subscriptions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">
                          User
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Plan
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Cycle
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Ends
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Amount
                        </TableHead>
                        <TableHead className="text-muted-foreground text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map((sub) => {
                        const isExpired = new Date(sub.endDate) < new Date();
                        return (
                          <TableRow
                            key={sub.id}
                            className="border-border hover:bg-muted"
                          >
                            <TableCell className="font-medium text-foreground">
                              {sub.userName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {sub.planName}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-muted text-muted-foreground border-border">
                                {sub.billingCycle}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  sub.status === "active" && !isExpired
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : sub.status === "cancelled"
                                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }
                              >
                                {isExpired && sub.status === "active"
                                  ? "expired"
                                  : sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(sub.endDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {(sub.lastPaymentAmount || 0).toLocaleString()}{" "}
                              CFA
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {sub.status === "active" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                      disabled={actionLoading === sub.id}
                                      onClick={() => {
                                        const days = prompt(
                                          "Extend by how many days?"
                                        );
                                        if (days) {
                                          handleSubAction(sub.id, "extend", {
                                            days: Number(days),
                                          });
                                        }
                                      }}
                                      title="Extend"
                                    >
                                      <Clock className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                      disabled={actionLoading === sub.id}
                                      onClick={() => {
                                        if (
                                          confirm("Cancel this subscription?")
                                        ) {
                                          handleSubAction(sub.id, "cancel");
                                        }
                                      }}
                                      title="Cancel"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
