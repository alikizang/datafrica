"use client";

import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Loader2, CreditCard, Crown } from "lucide-react";
import Image from "next/image";
import type {
  Dataset,
  PaymentProvider,
  MembershipPlan,
  BillingCycle,
} from "@/types";

interface DatasetPaymentProps {
  dataset: Dataset;
  plan?: never;
  billingCycle?: never;
  onSuccess: (transactionId: string) => void;
  onError?: (error: string) => void;
}

interface PlanPaymentProps {
  plan: MembershipPlan;
  billingCycle: BillingCycle;
  dataset?: never;
  onSuccess: (transactionId: string) => void;
  onError?: (error: string) => void;
}

type PaymentButtonProps = DatasetPaymentProps | PlanPaymentProps;

export function PaymentButton(props: PaymentButtonProps) {
  const { onSuccess, onError } = props;
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>("paydunya");
  const [kkiapayReady, setKkiapayReady] = useState(false);
  const [kkiapayPublicKey, setKkiapayPublicKey] = useState("");

  const isPlan = "plan" in props && !!props.plan;
  const dataset = isPlan ? null : props.dataset;
  const plan = isPlan ? props.plan : null;
  const billingCycle = isPlan ? props.billingCycle : null;

  const amount = isPlan ? plan!.pricing[billingCycle!].price : dataset!.price;
  const currency = isPlan
    ? plan!.pricing[billingCycle!].currency || "XOF"
    : dataset!.currency;

  // Fetch active provider on mount
  useEffect(() => {
    async function fetchProvider() {
      try {
        const res = await fetch("/api/payments/provider");
        if (res.ok) {
          const data = await res.json();
          setProvider(data.activeProvider || "paydunya");
          if (data.activeProvider === "kkiapay" && data.kkiapayPublicKey) {
            setKkiapayPublicKey(data.kkiapayPublicKey);
          }
        }
      } catch {
        // Default to paydunya
      }
    }
    fetchProvider();
  }, []);

  // Load KKiaPay SDK if needed
  useEffect(() => {
    if (provider !== "kkiapay") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (
      typeof window !== "undefined" &&
      !(window as any).openKkiapayWidget
    ) {
      const script = document.createElement("script");
      script.src = "https://cdn.kkiapay.me/k.js";
      script.async = true;
      script.onload = () => setKkiapayReady(true);
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    } else {
      setKkiapayReady(true);
    }
  }, [provider]);

  // KKiaPay success listener
  useEffect(() => {
    if (provider !== "kkiapay" || !kkiapayReady) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const addListener = win.addSuccessListener as
      | ((cb: (response: { transactionId: string }) => void) => void)
      | undefined;
    if (addListener) {
      addListener((response) => {
        setLoading(false);
        onSuccess(response.transactionId);
      });
    }
  }, [provider, kkiapayReady, onSuccess]);

  const handleKkiapayPayment = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.openKkiapayWidget) {
      onError?.("KKiaPay SDK not loaded");
      return;
    }
    setLoading(true);
    const openWidget = win.openKkiapayWidget as (
      config: Record<string, unknown>
    ) => void;
    openWidget({
      amount,
      position: "center",
      theme: "#2563eb",
      key:
        kkiapayPublicKey || process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || "",
      sandbox: process.env.NODE_ENV === "development",
      email: user?.email || "",
      name: user?.displayName || "",
      data: isPlan
        ? JSON.stringify({
            type: "subscription",
            planId: plan!.id,
            billingCycle,
            userId: user?.uid,
          })
        : JSON.stringify({
            datasetId: dataset!.id,
            userId: user?.uid,
          }),
    });
  }, [amount, user, onError, kkiapayPublicKey, isPlan, plan, billingCycle, dataset]);

  const handlePaydunyaPayment = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        onError?.("Please sign in to make a purchase");
        setLoading(false);
        return;
      }

      if (isPlan) {
        // Subscription payment via dedicated subscribe API
        const res = await fetch("/api/memberships/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planId: plan!.id,
            billingCycle,
          }),
        });

        const data = await res.json();

        if (data.success && data.url) {
          window.location.href = data.url;
        } else {
          onError?.(data.error || "Failed to initiate payment");
          setLoading(false);
        }
      } else {
        // Dataset purchase (existing flow)
        const res = await fetch("/api/payments/paydunya/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ datasetId: dataset!.id }),
        });

        const data = await res.json();

        if (data.success && data.url) {
          window.location.href = data.url;
        } else {
          onError?.(data.error || "Failed to initiate payment");
          setLoading(false);
        }
      }
    } catch {
      onError?.("Payment failed. Please try again.");
      setLoading(false);
    }
  }, [isPlan, plan, billingCycle, dataset, getIdToken, onError]);

  const handleStripePayment = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        onError?.("Please sign in to make a purchase");
        setLoading(false);
        return;
      }

      const body = isPlan
        ? { type: "subscription", planId: plan!.id, billingCycle }
        : { datasetId: dataset!.id };

      const res = await fetch("/api/payments/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        onError?.(data.error || "Failed to initiate payment");
        setLoading(false);
      }
    } catch {
      onError?.("Payment failed. Please try again.");
      setLoading(false);
    }
  }, [isPlan, plan, billingCycle, dataset, getIdToken, onError]);

  const handlePayment = () => {
    if (provider === "kkiapay") {
      handleKkiapayPayment();
    } else if (provider === "stripe") {
      handleStripePayment();
    } else {
      handlePaydunyaPayment();
    }
  };

  const formatPrice = (price: number, cur: string) => {
    if (cur === "XOF" || cur === "CFA") {
      return `${price.toLocaleString()} CFA`;
    }
    return `$${price.toLocaleString()}`;
  };

  const isDisabled = loading || (provider === "kkiapay" && !kkiapayReady);

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full text-base font-semibold"
        onClick={handlePayment}
        disabled={isDisabled}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("dataset.processing")}
          </>
        ) : isPlan ? (
          <>
            <Crown className="mr-2 h-4 w-4" />
            {t("membership.subscribe")} - {formatPrice(amount, currency)}
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            {t("dataset.pay")} {formatPrice(amount, currency)}
          </>
        )}
      </Button>
      {provider === "paydunya" && (
        <div className="flex justify-center">
          <Image
            src="/paydunya-methods.png"
            alt="Orange Money, Wave, Visa, Mastercard, MTN Mobile Money"
            width={320}
            height={36}
            className="opacity-80"
          />
        </div>
      )}
      {provider === "stripe" && (
        <p className="text-xs text-center text-muted-foreground">
          Visa, Mastercard, Apple Pay, Google Pay
        </p>
      )}
    </div>
  );
}
