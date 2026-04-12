"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  const [message, setMessage] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/admin/maintenance", {
          headers: {},
        });
        // Public endpoint fallback - try to read from page data
      } catch {
        // ignore
      }
    }
    // Read from URL params if passed
    const params = new URLSearchParams(window.location.search);
    setMessage(params.get("message") || "We are currently performing scheduled maintenance. Please check back soon.");
    setScheduledEnd(params.get("until") || "");
  }, []);

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
            Expected to be back: <span className="font-medium text-foreground">{new Date(scheduledEnd).toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-center justify-center gap-2.5">
          <Image src="/logo.png" alt="Datafrica" width={24} height={24} className="h-6 w-6 rounded" />
          <span className="text-sm text-muted-foreground font-medium">Datafrica</span>
        </div>
      </div>
    </div>
  );
}
