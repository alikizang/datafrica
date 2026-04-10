"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useMembership } from "@/hooks/use-membership";
import { PaymentButton } from "@/components/payment/payment-button";
import { Crown, Check, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MembershipPlan, BillingCycle } from "@/types";

export default function PricingPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { plans, subscription, loading } = useMembership();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  // Check for payment result in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "cancelled") {
      toast.error(t("membership.paymentCancelled"));
      router.replace("/pricing", { scroll: false });
    }
  }, [t, router]);

  const getLocalizedName = (plan: MembershipPlan) =>
    plan.names?.[lang] || plan.name;

  const getLocalizedDescription = (plan: MembershipPlan) =>
    plan.descriptions?.[lang] || plan.description;

  const getLocalizedFeatures = (plan: MembershipPlan) =>
    plan.featuresByLang?.[lang] || plan.features || [];

  const formatPrice = (price: number, currency: string) => {
    if (currency === "XOF" || currency === "CFA") {
      return `${price.toLocaleString()} CFA`;
    }
    return `$${price.toLocaleString()}`;
  };

  const getSavings = (plan: MembershipPlan) => {
    const monthly = plan.pricing.monthly.price;
    const yearly = plan.pricing.yearly.price;
    if (monthly <= 0) return 0;
    return Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            {t("membership.pricing")}
          </p>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t("membership.choosePlan")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("membership.pricingSubtitle")}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center bg-muted rounded-full p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("membership.monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("membership.yearly")}
            </button>
          </div>
        </div>

        {/* Plans grid */}
        {plans.length === 0 ? (
          <div className="text-center py-16">
            <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              {t("membership.noPlans")}
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-6 max-w-5xl mx-auto ${
              plans.length === 1
                ? "grid-cols-1 max-w-md"
                : plans.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {plans.map((plan) => {
              const price = plan.pricing[billingCycle].price;
              const currency = plan.pricing[billingCycle].currency || "XOF";
              const savings = getSavings(plan);
              const isCurrentPlan =
                subscription?.planId === plan.id &&
                subscription?.status === "active";
              const features = getLocalizedFeatures(plan);

              return (
                <div
                  key={plan.id}
                  className={`relative glass-card rounded-2xl border p-8 flex flex-col ${
                    plan.highlighted
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                      {t("membership.recommended")}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {getLocalizedName(plan)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getLocalizedDescription(plan)}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        {formatPrice(price, currency)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        /{billingCycle === "yearly"
                          ? t("membership.year")
                          : t("membership.month")}
                      </span>
                    </div>
                    {billingCycle === "yearly" && savings > 0 && (
                      <p className="text-sm text-emerald-500 mt-1">
                        {t("membership.save")} {savings}%{" "}
                        {t("membership.vsMonthly")}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8 flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {plan.datasetIds.length}{" "}
                        {t("membership.datasetsIncluded")}
                      </span>
                    </div>
                    {features.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {plan.conditions.allowDownload && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{t("membership.downloadIncluded")}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <div className="text-center py-3 px-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-medium text-sm">
                      {t("membership.currentPlan")}
                    </div>
                  ) : selectedPlan?.id === plan.id ? (
                    <div className="space-y-3">
                      <PaymentButton
                        plan={plan}
                        billingCycle={billingCycle}
                        onSuccess={() => {
                          toast.success(t("membership.subscribed"));
                          setSelectedPlan(null);
                          router.push("/dashboard?tab=membership");
                        }}
                        onError={(err) => toast.error(err)}
                      />
                      <button
                        onClick={() => setSelectedPlan(null)}
                        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (!user) {
                          router.push("/login");
                          return;
                        }
                        setSelectedPlan(plan);
                      }}
                      className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
                        plan.highlighted
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                      }`}
                    >
                      {t("membership.getStarted")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
