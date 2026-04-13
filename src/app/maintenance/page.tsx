"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Wrench, RefreshCw } from "lucide-react";

const DEFAULT_MSG = "We are currently performing scheduled maintenance. Please check back soon.";

export default function MaintenancePage() {
  const router = useRouter();
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read initial message from URL params
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized) return;
    const params = new URLSearchParams(window.location.search);
    const msg = params.get("message");
    const until = params.get("until");
    if (msg) setMessage(msg);
    if (until) setScheduledEnd(until);
    setInitialized(true);
  }, [initialized]);

  // Auto-refresh: check every 30s if maintenance is still on
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setChecking(true);
        const res = await fetch("/api/maintenance-status");
        if (res.ok) {
          const data = await res.json();
          if (!data.enabled) {
            router.replace("/");
            return;
          }
          if (data.message) setMessage(data.message);
          if (data.scheduledEnd) setScheduledEnd(data.scheduledEnd);
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    };

    timerRef.current = setInterval(checkStatus, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/maintenance-status");
      if (res.ok) {
        const data = await res.json();
        if (!data.enabled) {
          router.replace("/");
          return;
        }
        if (data.message) setMessage(data.message);
        if (data.scheduledEnd) setScheduledEnd(data.scheduledEnd);
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Wrench className="h-10 w-10 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Under Maintenance</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>
        {scheduledEnd && (
          <div className="text-sm text-muted-foreground bg-muted rounded-xl p-3">
            Expected to be back:{" "}
            <span className="font-medium text-foreground">
              {new Date(scheduledEnd).toLocaleString()}
            </span>
          </div>
        )}
        <button
          onClick={handleManualCheck}
          disabled={checking}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking..." : "Check again"}
        </button>
        <div className="flex items-center justify-center gap-2.5">
          <Image src="/logo.png" alt="Datafrica" width={24} height={24} className="h-6 w-6 rounded" />
          <span className="text-sm text-muted-foreground font-medium">Datafrica</span>
        </div>
      </div>
    </div>
  );
}
