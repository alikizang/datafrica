"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  CreditCard,
  Check,
  Loader2,
  Shield,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { PaymentProvider } from "@/types";

interface ProviderSettings {
  activeProvider: PaymentProvider;
  paydunya: {
    masterKey: string;
    privateKey: string;
    publicKey: string;
    token: string;
    mode: "test" | "live";
  };
  kkiapay: {
    publicKey: string;
    privateKey: string;
    secret: string;
    sandbox: boolean;
  };
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PaymentProvider>("paydunya");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchSettings() {
      if (!user || user.role !== "admin") return;
      const token = await getIdToken();
      if (!token) return;

      try {
        const res = await fetch("/api/admin/payment-settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setActiveTab(data.activeProvider || "paydunya");
        }
      } catch {
        toast.error("Failed to load payment settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [user, getIdToken]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Payment settings saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const setActiveProvider = (provider: PaymentProvider) => {
    setSettings((prev) => (prev ? { ...prev, activeProvider: provider } : prev));
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure and switch between payment providers
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 bg-muted rounded-xl" />
            <Skeleton className="h-64 bg-muted rounded-xl" />
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Provider Selection */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Active Payment Provider
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["paydunya", "kkiapay"] as const).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setActiveProvider(provider)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      settings.activeProvider === provider
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    {settings.activeProvider === provider && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <p className="font-semibold text-foreground capitalize">{provider === "paydunya" ? "PayDunya" : "KKiaPay"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {provider === "paydunya"
                        ? "Mobile Money & Cards - West Africa"
                        : "Mobile Money & Cards - Africa"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Tabs */}
            <div className="flex gap-2 border-b border-border pb-0">
              {(["paydunya", "kkiapay"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab
                      ? "bg-card text-foreground border border-border border-b-0"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "paydunya" ? "PayDunya" : "KKiaPay"}
                  {settings.activeProvider === tab && (
                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>

            {/* PayDunya Settings */}
            {activeTab === "paydunya" && (
              <div className="glass-card rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">PayDunya Configuration</h2>
                  <a
                    href="https://app.paydunya.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    PayDunya Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Master Key *</label>
                    <Input
                      type="password"
                      placeholder="Your PayDunya Master Key"
                      value={settings.paydunya.masterKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          paydunya: { ...settings.paydunya, masterKey: e.target.value },
                        })
                      }
                      className="bg-muted border-border text-foreground rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Private Key *</label>
                    <Input
                      type="password"
                      placeholder="Your PayDunya Private Key"
                      value={settings.paydunya.privateKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          paydunya: { ...settings.paydunya, privateKey: e.target.value },
                        })
                      }
                      className="bg-muted border-border text-foreground rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Public Key</label>
                    <Input
                      type="password"
                      placeholder="Your PayDunya Public Key"
                      value={settings.paydunya.publicKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          paydunya: { ...settings.paydunya, publicKey: e.target.value },
                        })
                      }
                      className="bg-muted border-border text-foreground rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Token *</label>
                    <Input
                      type="password"
                      placeholder="Your PayDunya Token"
                      value={settings.paydunya.token}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          paydunya: { ...settings.paydunya, token: e.target.value },
                        })
                      }
                      className="bg-muted border-border text-foreground rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Mode</label>
                    <div className="flex gap-3">
                      {(["test", "live"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              paydunya: { ...settings.paydunya, mode },
                            })
                          }
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            settings.paydunya.mode === mode
                              ? mode === "live"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {mode === "test" ? "Test (Sandbox)" : "Live (Production)"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-start gap-2 text-xs text-dim">
                  <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    IPN Webhook URL:{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                      {process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app"}/api/payments/paydunya/webhook
                    </code>
                  </span>
                </div>
              </div>
            )}

            {/* KKiaPay Settings */}
            {activeTab === "kkiapay" && (
              <div className="glass-card rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">KKiaPay Configuration</h2>
                  <a
                    href="https://app.kkiapay.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    KKiaPay Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Public API Key *</label>
                    <Input
                      type="password"
                      placeholder="Your KKiaPay Public Key"
                      value={settings.kkiapay.publicKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          kkiapay: { ...settings.kkiapay, publicKey: e.target.value },
                        })
                      }
                      className="bg-muted border-border text-foreground rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Private API Key *</label>
                    <Input
                      type="password"
                      placeholder="Your KKiaPay Private Key"
                      value={settings.kkiapay.privateKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          kkiapay: { ...settings.kkiapay, privateKey: e.target.value },
                        })
                      }
                      className="bg-muted border-border text-foreground rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Secret Key *</label>
                    <Input
                      type="password"
                      placeholder="Your KKiaPay Secret Key"
                      value={settings.kkiapay.secret}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          kkiapay: { ...settings.kkiapay, secret: e.target.value },
                        })
                      }
                      className="bg-muted border-border text-foreground rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Environment</label>
                    <div className="flex gap-3">
                      {[true, false].map((sandbox) => (
                        <button
                          key={String(sandbox)}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              kkiapay: { ...settings.kkiapay, sandbox },
                            })
                          }
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            settings.kkiapay.sandbox === sandbox
                              ? sandbox
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {sandbox ? "Sandbox (Test)" : "Production"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-start gap-2 text-xs text-dim">
                  <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Webhook URL:{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                      {process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app"}/api/payments/webhook
                    </code>
                  </span>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Failed to load payment settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
