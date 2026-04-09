"use client";

import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CreditCard } from "lucide-react";
import type { Dataset, PaymentProvider } from "@/types";

interface PaymentButtonProps {
  dataset: Dataset;
  onSuccess: (transactionId: string) => void;
  onError?: (error: string) => void;
}

export function PaymentButton({ dataset, onSuccess, onError }: PaymentButtonProps) {
  const { user, getIdToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>("paydunya");
  const [kkiapayReady, setKkiapayReady] = useState(false);
  const [kkiapayPublicKey, setKkiapayPublicKey] = useState("");

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
    if (typeof window !== "undefined" && !(window as any).openKkiapayWidget) {
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
    const openWidget = win.openKkiapayWidget as (config: Record<string, unknown>) => void;
    openWidget({
      amount: dataset.price,
      position: "center",
      theme: "#2563eb",
      key: kkiapayPublicKey || process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY || "",
      sandbox: process.env.NODE_ENV === "development",
      email: user?.email || "",
      name: user?.displayName || "",
      data: JSON.stringify({
        datasetId: dataset.id,
        userId: user?.uid,
      }),
    });
  }, [dataset, user, onError, kkiapayPublicKey]);

  const handlePaydunyaPayment = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        onError?.("Please sign in to make a purchase");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/payments/paydunya/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ datasetId: dataset.id }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        // Redirect to PayDunya checkout page
        window.location.href = data.url;
      } else {
        onError?.(data.error || "Failed to initiate payment");
        setLoading(false);
      }
    } catch {
      onError?.("Payment failed. Please try again.");
      setLoading(false);
    }
  }, [dataset.id, getIdToken, onError]);

  const handlePayment = () => {
    if (provider === "kkiapay") {
      handleKkiapayPayment();
    } else {
      handlePaydunyaPayment();
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "XOF" || currency === "CFA") {
      return `${price.toLocaleString()} CFA`;
    }
    return `$${price.toLocaleString()}`;
  };

  const isDisabled = loading || (provider === "kkiapay" && !kkiapayReady);

  return (
    <Button
      size="lg"
      className="w-full text-base font-semibold"
      onClick={handlePayment}
      disabled={isDisabled}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay {formatPrice(dataset.price, dataset.currency)}
        </>
      )}
    </Button>
  );
}
