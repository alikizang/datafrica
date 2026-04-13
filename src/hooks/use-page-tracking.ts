"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("df_sid");
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem("df_sid", sid);
  }
  return sid;
}

export function usePageTracking() {
  const pathname = usePathname();
  const { getIdToken } = useAuth();
  const lastPage = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname === lastPage.current) return;
    lastPage.current = pathname;

    const sessionId = getSessionId();
    if (!sessionId) return;

    const track = async () => {
      try {
        const token = await getIdToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        fetch("/api/analytics/track", {
          method: "POST",
          headers,
          body: JSON.stringify({ page: pathname, sessionId, event: "pageview" }),
        }).catch(() => {});
      } catch { /* non-blocking */ }
    };

    track();
  }, [pathname, getIdToken]);

  // Heartbeat every 60s to maintain presence
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sessionId = getSessionId();
    if (!sessionId) return;

    const interval = setInterval(async () => {
      try {
        const token = await getIdToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        fetch("/api/analytics/track", {
          method: "POST",
          headers,
          body: JSON.stringify({ page: lastPage.current, sessionId, event: "heartbeat" }),
        }).catch(() => {});
      } catch { /* non-blocking */ }
    }, 60000);

    return () => clearInterval(interval);
  }, [getIdToken]);
}
