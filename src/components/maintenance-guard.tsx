"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

const BYPASS_PREFIXES = ["/maintenance", "/login", "/admin"];
const POLL_INTERVAL = 60_000; // 60s

export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBypassed = useMemo(
    () => BYPASS_PREFIXES.some((p) => pathname.startsWith(p)) || user?.role === "admin",
    [pathname, user?.role]
  );

  useEffect(() => {
    if (isBypassed) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/maintenance-status");
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.enabled) {
            const params = new URLSearchParams();
            if (data.message) params.set("message", data.message);
            if (data.scheduledEnd) params.set("until", data.scheduledEnd);
            router.replace(`/maintenance?${params.toString()}`);
            return;
          }
        }
      } catch {
        // Fetch failed — don't block the app
      }
      if (!cancelled) setChecked(true);
    };

    check();

    timerRef.current = setInterval(check, POLL_INTERVAL);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isBypassed, router]);

  // Bypass paths and admins render immediately
  if (isBypassed) return <>{children}</>;

  // Show nothing until first check completes (prevents flash of content)
  if (!checked) return null;

  return <>{children}</>;
}
