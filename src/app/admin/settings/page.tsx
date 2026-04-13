"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  ArrowLeft,
  Wrench,
  Database,
  Bell,
  Activity,
  Loader2,
  Download,
  Send,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BackupEntry {
  id: string;
  createdAt: string;
  collections: string[];
  totalDocs: number;
}

interface ActivityEntry {
  id: string;
  action: string;
  userId?: string;
  details?: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();

  // Maintenance
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // Backup
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // Activity Logs
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"info" | "warning" | "error">("info");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastSendEmail, setBroadcastSendEmail] = useState(false);

  const getToken = useCallback(async () => {
    const token = await getIdToken();
    return token;
  }, [getIdToken]);

  // Fetch maintenance state
  useEffect(() => {
    async function fetch_() {
      if (!user || user.role !== "admin") return;
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/maintenance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMaintenanceEnabled(!!data.enabled);
          setMaintenanceMessage(data.message || "");
        }
      } catch { /* silent */ }
    }
    fetch_();
  }, [user, getToken]);

  // Fetch backups
  useEffect(() => {
    async function fetch_() {
      if (!user || user.role !== "admin") return;
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/backup", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBackups(data.backups || []);
        }
      } catch { /* silent */ }
    }
    fetch_();
  }, [user, getToken]);

  // Fetch activity logs
  useEffect(() => {
    async function fetch_() {
      if (!user || user.role !== "admin") return;
      setActivitiesLoading(true);
      const token = await getToken();
      if (!token) { setActivitiesLoading(false); return; }
      try {
        const res = await fetch("/api/admin/activity-logs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setActivities(data.logs || []);
        }
      } catch { /* silent */ }
      finally { setActivitiesLoading(false); }
    }
    fetch_();
  }, [user, getToken]);

  const toggleMaintenance = async () => {
    const token = await getToken();
    if (!token) return;
    setMaintenanceLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: !maintenanceEnabled, message: maintenanceMessage }),
      });
      if (res.ok) {
        setMaintenanceEnabled(!maintenanceEnabled);
        toast.success(!maintenanceEnabled ? t("admin.maintenanceOn") : t("admin.maintenanceOff"));
      }
    } catch { toast.error(t("common.error")); }
    finally { setMaintenanceLoading(false); }
  };

  const triggerBackup = async () => {
    const token = await getToken();
    if (!token) return;
    setBackupLoading(true);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBackups((prev) => [data.backup, ...prev]);
        toast.success(t("admin.backupCreated"));
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
    finally { setBackupLoading(false); }
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) return;
    const token = await getToken();
    if (!token) return;
    setBroadcastLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage, type: broadcastType, sendEmail: broadcastSendEmail }),
      });
      if (res.ok) {
        toast.success(t("admin.broadcastSent"));
        setBroadcastTitle("");
        setBroadcastMessage("");
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
    finally { setBroadcastLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.backToAdmin")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("admin.settings")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.settingsDesc")}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="glass-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${maintenanceEnabled ? "bg-amber-500/20" : "bg-muted"}`}>
                <Wrench className={`h-4 w-4 ${maintenanceEnabled ? "text-amber-400" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">{t("admin.maintenance")}</h2>
                <p className="text-sm text-muted-foreground">{t("admin.maintenanceDesc")}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${maintenanceEnabled ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                {maintenanceEnabled ? t("admin.maintenanceOn") : t("admin.maintenanceOff")}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t("admin.maintenanceMessageLabel")}</label>
                <Input
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder={t("admin.maintenanceMessagePlaceholder")}
                  className="bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <Button
                onClick={toggleMaintenance}
                disabled={maintenanceLoading}
                className={`rounded-xl ${maintenanceEnabled ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"} text-white`}
              >
                {maintenanceLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {maintenanceEnabled ? t("admin.disableMaintenance") : t("admin.enableMaintenance")}
              </Button>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="glass-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Database className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">{t("admin.backup")}</h2>
                <p className="text-sm text-muted-foreground">{t("admin.backupDesc")}</p>
              </div>
              <Button
                onClick={triggerBackup}
                disabled={backupLoading}
                className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
              >
                {backupLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {t("admin.createBackup")}
              </Button>
            </div>
            {backups.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium text-muted-foreground">{t("admin.recentBackups")}</p>
                {backups.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-foreground">{new Date(b.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{b.totalDocs} docs</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Broadcast Notifications */}
          <div className="glass-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("admin.broadcast")}</h2>
                <p className="text-sm text-muted-foreground">{t("admin.broadcastDesc")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t("admin.alertTypeLabel")}</label>
                <div className="flex gap-2">
                  {(["info", "warning", "error"] as const).map((at) => (
                    <button
                      key={at}
                      onClick={() => setBroadcastType(at)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        broadcastType === at
                          ? at === "info" ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : at === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {at === "info" ? t("admin.alertInfo") : at === "warning" ? t("admin.alertWarning") : t("admin.alertError")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t("admin.title")}</label>
                <Input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder={t("admin.alertTitlePlaceholder")}
                  className="bg-muted border-border text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t("admin.alertMessage")}</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder={t("admin.alertMessagePlaceholder")}
                  className="w-full h-24 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setBroadcastSendEmail(!broadcastSendEmail)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${broadcastSendEmail ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full transition-transform shadow ${broadcastSendEmail ? "translate-x-4" : ""}`} />
                </button>
                <span className="text-sm text-muted-foreground">{t("admin.alsoSendEmail")}</span>
              </label>
              <Button
                onClick={sendBroadcast}
                disabled={broadcastLoading || !broadcastTitle || !broadcastMessage}
                className="rounded-xl bg-violet-500 hover:bg-violet-600 text-white"
              >
                {broadcastLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {t("admin.sendBroadcast")}
              </Button>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="glass-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("admin.activityLogs")}</h2>
                <p className="text-sm text-muted-foreground">{t("admin.activityLogsDesc")}</p>
              </div>
            </div>
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("admin.noActivityLogs")}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium">{a.action}</p>
                      {a.details && <p className="text-xs text-muted-foreground truncate">{a.details}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cleanup */}
          <div className="glass-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("admin.cleanup")}</h2>
                <p className="text-sm text-muted-foreground">{t("admin.cleanupDesc")}</p>
              </div>
            </div>
            <Button
              onClick={async () => {
                const token = await getToken();
                if (!token) return;
                try {
                  await fetch("/api/admin/cleanup-payments", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  toast.success(t("admin.cleanupDone"));
                } catch { toast.error(t("common.error")); }
              }}
              variant="outline"
              className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("admin.cleanupPayments")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
