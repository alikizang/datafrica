"use client";

import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CreditCard } from "lucide-react";
import type { Dataset } from "@/types";

interface KKiapayButtonProps {
  dataset: Dataset;
  onSuccess: (transactionId: string) => void;
  onError?: (error: string) => void;
}

export function KKiapayButton({ dataset, onSuccess, onError }: KKiapayButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    // Load KKiaPay SDK via script tag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && !(window as any).openKkiapayWidget) {
      const script = document.createElement("script");
      script.src = "https://cdn.kkiapay.me/k.js";
      script.async = true;
      script.onload = () => setSdkReady(true);
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    } else {
      setSdkReady(true);
    }
  }, []);

  const handlePayment = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.openKkiapayWidget) {
      onError?.("KKiaPay SDK not loaded");
      return;
    }

    setLoading(true);

    const openWidget = win.openKkiapayWidget as (config: Record<string, unknown>) => void;

    openWidget({
      amount: dataset.price,
      position: "center",
      theme: "#2563eb",
      key: process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || "",
      sandbox: process.env.NODE_ENV === "development",
      email: user?.email || "",
      name: user?.displayName || "",
      data: JSON.stringify({
        datasetId: dataset.id,
        userId: user?.uid,
      }),
    });
  }, [dataset, user, onError]);

  useEffect(() => {
    if (!sdkReady) return;

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
  }, [sdkReady, onSuccess]);

  const formatPrice = (price: number, currency: string) => {
    if (currency === "XOF" || currency === "CFA") {
      return `${price.toLocaleString()} CFA`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <Button
      size="lg"
      className="w-full text-base font-semibold"
      onClick={handlePayment}
      disabled={loading || !sdkReady}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay {formatPrice(dataset.price, dataset.currency)} with KKiaPay
        </>
      )}
    </Button>
  );
}
