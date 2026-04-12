"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  ArrowLeft,
  CreditCard,
  Check,
  Loader2,
  Shield,
  ExternalLink,
  Eye,
  EyeOff,
  CircleAlert,
  CircleCheck,
  CircleMinus,
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
  stripe: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    mode: "test" | "live";
  };
}

type VisibleFields = Record<string, boolean>;

function SecretInput({ label, required, placeholder, value, onChange, visible, onToggleVisibility }: {
  label: string; required?: boolean; placeholder: string; value: string;
  onChange: (val: string) => void; visible: boolean; onToggleVisibility: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label} {required && "*"}</label>
      <div className="relative">
        <Input type={visible ? "text" : "password"} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)} className="bg-muted border-border text-foreground rounded-xl pr-10" />
        <button type="button" onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function getPaydunyaStatus(s: ProviderSettings): { color: "green" | "yellow" | "red"; label: string } {
  const { masterKey, privateKey, token, mode } = s.paydunya;
  const keysConfigured = masterKey.length > 0 && privateKey.length > 0 && token.length > 0;
  if (!keysConfigured) return { color: "red", label: "missingKeys" };
  if (mode === "test") return { color: "yellow", label: "testMode" };
  return { color: "green", label: "ready" };
}

function getKkiapayStatus(s: ProviderSettings): { color: "green" | "yellow" | "red"; label: string } {
  const { publicKey, privateKey, secret, sandbox } = s.kkiapay;
  const keysConfigured = publicKey.length > 0 && privateKey.length > 0 && secret.length > 0;
  if (!keysConfigured) return { color: "red", label: "missingKeys" };
  if (sandbox) return { color: "yellow", label: "testMode" };
  return { color: "green", label: "ready" };
}

function getStripeStatus(s: ProviderSettings): { color: "green" | "yellow" | "red"; label: string } {
  const { publishableKey, secretKey, mode } = s.stripe;
  const keysConfigured = publishableKey.length > 0 && secretKey.length > 0;
  if (!keysConfigured) return { color: "red", label: "missingKeys" };
  if (mode === "test") return { color: "yellow", label: "testMode" };
  return { color: "green", label: "ready" };
}

function StatusBadge({ color, label, t }: { color: "green" | "yellow" | "red"; label: string; t: (key: string) => string }) {
  const config = {
    green: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", icon: <CircleCheck className="h-3.5 w-3.5" /> },
    yellow: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", icon: <CircleMinus className="h-3.5 w-3.5" /> },
    red: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", icon: <CircleAlert className="h-3.5 w-3.5" /> },
  };
  const c = config[color];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
      {c.icon} {t(`admin.status_${label}`)}
    </span>
  );
}

export default function AdminPaymentsPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PaymentProvider>("paydunya");
  const [visibleFields, setVisibleFields] = useState<VisibleFields>({});

  const toggleVisibility = (field: string) => setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));

  useEffect(() => {
    async function fetchSettings() {
      if (!user || user.role !== "admin") return;
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/payment-settings", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            // Ensure stripe defaults exist for backwards compat
            if (!data.stripe) {
              data.stripe = { publishableKey: "", secretKey: "", webhookSecret: "", mode: "test" };
            }
            setSettings(data);
            setActiveTab(data.activeProvider || "paydunya");
          }
      } catch { toast.error(t("common.error")); } finally { setLoading(false); }
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
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      if (res.ok) { toast.success(t("admin.saveSettings")); }
      else { const data = await res.json(); toast.error(data.error || t("common.error")); }
    } catch { toast.error(t("common.error")); } finally { setSaving(false); }
  };

  const setActiveProvider = (provider: PaymentProvider) => {
    setSettings((prev) => (prev ? { ...prev, activeProvider: provider } : prev));
  };

  const paydunyaStatus = settings ? getPaydunyaStatus(settings) : null;
  const kkiapayStatus = settings ? getKkiapayStatus(settings) : null;
  const stripeStatus = settings ? getStripeStatus(settings) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t("admin.backToAdmin")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("admin.paymentSettings")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.configureProviders")}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4"><Skeleton className="h-40 bg-muted rounded-xl" /><Skeleton className="h-64 bg-muted rounded-xl" /></div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Provider Selection */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">{t("admin.activePaymentProvider")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["paydunya", "kkiapay", "stripe"] as const).map((provider) => {
                  const status = provider === "paydunya" ? paydunyaStatus : provider === "kkiapay" ? kkiapayStatus : stripeStatus;
                  const labels: Record<string, { name: string; desc: string }> = {
                    paydunya: { name: "PayDunya", desc: "Mobile Money & Cards - West Africa" },
                    kkiapay: { name: "KKiaPay", desc: "Mobile Money & Cards - Africa" },
                    stripe: { name: "Stripe", desc: "Cards & International Payments" },
                  };
                  return (
                    <button key={provider} onClick={() => setActiveProvider(provider)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${settings.activeProvider === provider ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                      {settings.activeProvider === provider && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center"><Check className="h-3 w-3 text-primary-foreground" /></div>
                      )}
                      <p className="font-semibold text-foreground">{labels[provider].name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{labels[provider].desc}</p>
                      {status && <div className="mt-2"><StatusBadge color={status.color} label={status.label} t={t} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider Tabs */}
            <div className="flex gap-2 border-b border-border pb-0">
              {(["paydunya", "kkiapay", "stripe"] as const).map((tab) => {
                const status = tab === "paydunya" ? paydunyaStatus : tab === "kkiapay" ? kkiapayStatus : stripeStatus;
                const dotColor = status?.color === "green" ? "bg-emerald-400" : status?.color === "yellow" ? "bg-amber-400" : "bg-red-400";
                const tabLabel = tab === "paydunya" ? "PayDunya" : tab === "kkiapay" ? "KKiaPay" : "Stripe";
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab ? "bg-card text-foreground border border-border border-b-0" : "text-muted-foreground hover:text-foreground"}`}>
                    {tabLabel}
                    <span className={`ml-2 inline-block h-2 w-2 rounded-full ${dotColor}`} />
                  </button>
                );
              })}
            </div>

            {/* PayDunya Settings */}
            {activeTab === "paydunya" && (
              <div className="glass-card rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">{t("admin.paydunyaConfig")}</h2>
                    {paydunyaStatus && <StatusBadge color={paydunyaStatus.color} label={paydunyaStatus.label} t={t} />}
                  </div>
                  <a href="https://paydunya.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    PayDunya Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="space-y-4">
                  <SecretInput label={t("admin.masterKey")} required placeholder={t("admin.masterKey")} value={settings.paydunya.masterKey}
                    onChange={(val) => setSettings({ ...settings, paydunya: { ...settings.paydunya, masterKey: val } })}
                    visible={!!visibleFields["pd-master"]} onToggleVisibility={() => toggleVisibility("pd-master")} />
                  <SecretInput label={t("admin.privateKey")} required placeholder={t("admin.privateKey")} value={settings.paydunya.privateKey}
                    onChange={(val) => setSettings({ ...settings, paydunya: { ...settings.paydunya, privateKey: val } })}
                    visible={!!visibleFields["pd-private"]} onToggleVisibility={() => toggleVisibility("pd-private")} />
                  <SecretInput label={t("admin.publicKey")} placeholder={t("admin.publicKey")} value={settings.paydunya.publicKey}
                    onChange={(val) => setSettings({ ...settings, paydunya: { ...settings.paydunya, publicKey: val } })}
                    visible={!!visibleFields["pd-public"]} onToggleVisibility={() => toggleVisibility("pd-public")} />
                  <SecretInput label={t("admin.token")} required placeholder={t("admin.token")} value={settings.paydunya.token}
                    onChange={(val) => setSettings({ ...settings, paydunya: { ...settings.paydunya, token: val } })}
                    visible={!!visibleFields["pd-token"]} onToggleVisibility={() => toggleVisibility("pd-token")} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("admin.mode")}</label>
                    <div className="flex gap-3">
                      {(["test", "live"] as const).map((mode) => (
                        <button key={mode} onClick={() => setSettings({ ...settings, paydunya: { ...settings.paydunya, mode } })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${settings.paydunya.mode === mode ? (mode === "live" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400") : "border-border text-muted-foreground hover:text-foreground"}`}>
                          {mode === "test" ? t("admin.testSandbox") : t("admin.liveProduction")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex items-start gap-2 text-xs text-dim">
                  <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{t("admin.webhookUrl")}: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground break-all text-xs">{process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app"}/api/payments/paydunya/webhook</code></span>
                </div>
              </div>
            )}

            {/* KKiaPay Settings */}
            {activeTab === "kkiapay" && (
              <div className="glass-card rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">{t("admin.kkiapayConfig")}</h2>
                    {kkiapayStatus && <StatusBadge color={kkiapayStatus.color} label={kkiapayStatus.label} t={t} />}
                  </div>
                  <a href="https://app.kkiapay.me" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    KKiaPay Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="space-y-4">
                  <SecretInput label={t("admin.publicApiKey")} required placeholder={t("admin.publicApiKey")} value={settings.kkiapay.publicKey}
                    onChange={(val) => setSettings({ ...settings, kkiapay: { ...settings.kkiapay, publicKey: val } })}
                    visible={!!visibleFields["kk-public"]} onToggleVisibility={() => toggleVisibility("kk-public")} />
                  <SecretInput label={t("admin.privateApiKey")} required placeholder={t("admin.privateApiKey")} value={settings.kkiapay.privateKey}
                    onChange={(val) => setSettings({ ...settings, kkiapay: { ...settings.kkiapay, privateKey: val } })}
                    visible={!!visibleFields["kk-private"]} onToggleVisibility={() => toggleVisibility("kk-private")} />
                  <SecretInput label={t("admin.secretKey")} required placeholder={t("admin.secretKey")} value={settings.kkiapay.secret}
                    onChange={(val) => setSettings({ ...settings, kkiapay: { ...settings.kkiapay, secret: val } })}
                    visible={!!visibleFields["kk-secret"]} onToggleVisibility={() => toggleVisibility("kk-secret")} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("admin.environment")}</label>
                    <div className="flex gap-3">
                      {[true, false].map((sandbox) => (
                        <button key={String(sandbox)} onClick={() => setSettings({ ...settings, kkiapay: { ...settings.kkiapay, sandbox } })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${settings.kkiapay.sandbox === sandbox ? (sandbox ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400") : "border-border text-muted-foreground hover:text-foreground"}`}>
                          {sandbox ? t("admin.sandboxTest") : t("admin.production")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex items-start gap-2 text-xs text-dim">
                  <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{t("admin.webhookUrl")}: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground break-all text-xs">{process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app"}/api/payments/webhook</code></span>
                </div>
              </div>
            )}

            {/* Stripe Settings */}
            {activeTab === "stripe" && (
              <div className="glass-card rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">Stripe</h2>
                    {stripeStatus && <StatusBadge color={stripeStatus.color} label={stripeStatus.label} t={t} />}
                  </div>
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Stripe Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="space-y-4">
                  <SecretInput label={t("admin.publishableKey")} required placeholder="pk_test_..." value={settings.stripe.publishableKey}
                    onChange={(val) => setSettings({ ...settings, stripe: { ...settings.stripe, publishableKey: val } })}
                    visible={!!visibleFields["st-pub"]} onToggleVisibility={() => toggleVisibility("st-pub")} />
                  <SecretInput label={t("admin.secretKey")} required placeholder="sk_test_..." value={settings.stripe.secretKey}
                    onChange={(val) => setSettings({ ...settings, stripe: { ...settings.stripe, secretKey: val } })}
                    visible={!!visibleFields["st-secret"]} onToggleVisibility={() => toggleVisibility("st-secret")} />
                  <SecretInput label={t("admin.webhookSigningSecret")} placeholder="whsec_..." value={settings.stripe.webhookSecret}
                    onChange={(val) => setSettings({ ...settings, stripe: { ...settings.stripe, webhookSecret: val } })}
                    visible={!!visibleFields["st-webhook"]} onToggleVisibility={() => toggleVisibility("st-webhook")} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("admin.mode")}</label>
                    <div className="flex gap-3">
                      {(["test", "live"] as const).map((mode) => (
                        <button key={mode} onClick={() => setSettings({ ...settings, stripe: { ...settings.stripe, mode } })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${settings.stripe.mode === mode ? (mode === "live" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400") : "border-border text-muted-foreground hover:text-foreground"}`}>
                          {mode === "test" ? t("admin.testSandbox") : t("admin.liveProduction")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex items-start gap-2 text-xs text-dim">
                  <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{t("admin.webhookUrl")}: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground break-all text-xs">{process.env.NEXT_PUBLIC_APP_URL || "https://mydatafrica.web.app"}/api/payments/stripe/webhook</code></span>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> {t("admin.saving")}</>) : t("admin.saveSettings")}
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("admin.failedLoadPayments")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
