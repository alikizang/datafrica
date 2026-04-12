"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Alert } from "@/types";

interface NotificationsContextType {
  alerts: Alert[];
  unreadCount: number;
  markRead: (alertId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const POLL_INTERVAL = 60_000; // 60s

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, getIdToken } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setUnreadCount(0);
      return;
    }
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/user/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent
    }
  }, [user, getIdToken]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const markRead = async (alertId: string) => {
    const token = await getIdToken();
    if (!token) return;
    try {
      await fetch("/api/user/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      await fetch("/api/user/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAllRead: true }),
      });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  return (
    <NotificationsContext.Provider value={{ alerts, unreadCount, markRead, markAllRead, refresh: fetchAlerts }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
