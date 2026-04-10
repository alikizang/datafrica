"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { MembershipPlan, Subscription, AccessResult } from "@/types";

interface UseMembershipReturn {
  plans: MembershipPlan[];
  subscription: Subscription | null;
  subscriptionPlan: {
    id: string;
    name: string;
    names: Record<string, string>;
    conditions: { allowDownload: boolean; maxDownloadsPerMonth: number | null };
    datasetIds: string[];
    datasetCount: number;
  } | null;
  loading: boolean;
  checkAccess: (datasetId: string) => Promise<AccessResult>;
  refreshSubscription: () => Promise<void>;
}

export function useMembership(): UseMembershipReturn {
  const { user, getIdToken } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<UseMembershipReturn["subscriptionPlan"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/memberships");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setSubscriptionPlan(null);
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/memberships/subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription || null);
        setSubscriptionPlan(data.plan || null);
      }
    } catch {
      // silent
    }
  }, [user, getIdToken]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchPlans(), fetchSubscription()]);
      setLoading(false);
    }
    load();
  }, [fetchPlans, fetchSubscription]);

  const checkAccess = useCallback(
    async (datasetId: string): Promise<AccessResult> => {
      if (!user) {
        return { hasAccess: false, accessType: "none", allowDownload: false };
      }

      try {
        const token = await getIdToken();
        if (!token) {
          return { hasAccess: false, accessType: "none", allowDownload: false };
        }

        const res = await fetch(
          `/api/memberships/access?datasetId=${encodeURIComponent(datasetId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.ok) {
          return await res.json();
        }
      } catch {
        // silent
      }

      return { hasAccess: false, accessType: "none", allowDownload: false };
    },
    [user, getIdToken]
  );

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  return {
    plans,
    subscription,
    subscriptionPlan,
    loading,
    checkAccess,
    refreshSubscription,
  };
}
