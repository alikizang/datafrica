"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  Users,
  Search,
  ShoppingBag,
  Ban,
  CheckCircle,
  Mail,
  Trash2,
  Clock,
  Bell,
  KeyRound,
  MoreHorizontal,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface UserRecord {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  disabled: boolean;
  provider: string;
  purchaseCount: number;
  createdAt: string;
  lastSignIn: string;
}

type ModalType = "ban" | "suspend" | "delete" | "alert" | null;

export default function AdminUsersPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [stats, setStats] = useState({ total: 0, admins: 0, disabled: 0 });

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"info" | "warning" | "error">("info");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!user || user.role !== "admin") return;
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setStats({ total: data.total, admins: data.admins, disabled: data.disabled });
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user, getIdToken]);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        setStats((prev) => ({
          ...prev,
          admins: newRole === "admin" ? prev.admins + 1 : prev.admins - 1,
        }));
        toast.success(t("admin.roleUpdated"));
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const toggleDisabled = async (userId: string, currentDisabled: boolean) => {
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, disabled: !currentDisabled }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, disabled: !currentDisabled } : u))
        );
        setStats((prev) => ({
          ...prev,
          disabled: !currentDisabled ? prev.disabled + 1 : prev.disabled - 1,
        }));
        toast.success(!currentDisabled ? t("admin.userDisabled") : t("admin.userEnabled"));
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    setModalLoading(true);
    const token = await getIdToken();
    if (!token) { setModalLoading(false); return; }

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUser.id, disabled: true, bannedReason: banReason }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, disabled: true } : u));
        setStats((prev) => ({ ...prev, disabled: prev.disabled + (selectedUser.disabled ? 0 : 1) }));
        toast.success(t("admin.userBanned"));
        closeModal();
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
    finally { setModalLoading(false); }
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    setModalLoading(true);
    const token = await getIdToken();
    if (!token) { setModalLoading(false); return; }

    const until = new Date();
    until.setDate(until.getDate() + parseInt(suspendDays));

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUser.id, suspendedUntil: until.toISOString() }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, disabled: true } : u));
        setStats((prev) => ({ ...prev, disabled: prev.disabled + (selectedUser.disabled ? 0 : 1) }));
        toast.success(t("admin.userSuspended"));
        closeModal();
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
    finally { setModalLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setModalLoading(true);
    const token = await getIdToken();
    if (!token) { setModalLoading(false); return; }

    try {
      const res = await fetch(`/api/admin/users?userId=${selectedUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
        setStats((prev) => ({
          total: prev.total - 1,
          admins: selectedUser.role === "admin" ? prev.admins - 1 : prev.admins,
          disabled: selectedUser.disabled ? prev.disabled - 1 : prev.disabled,
        }));
        toast.success(t("admin.userDeleted"));
        closeModal();
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
    finally { setModalLoading(false); }
  };

  const handleSendAlert = async () => {
    if (!selectedUser || !alertTitle || !alertMessage) return;
    setModalLoading(true);
    const token = await getIdToken();
    if (!token) { setModalLoading(false); return; }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "send-alert", title: alertTitle, message: alertMessage, type: alertType }),
      });
      if (res.ok) {
        toast.success(t("admin.alertSent"));
        closeModal();
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
    finally { setModalLoading(false); }
  };

  const handlePasswordReset = async (userId: string) => {
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "password-reset" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resetLink) {
          await navigator.clipboard.writeText(data.resetLink);
          toast.success(t("admin.resetLinkCopied"));
        }
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
  };

  const openModal = (type: ModalType, u: UserRecord) => {
    setSelectedUser(u);
    setModalType(type);
    setBanReason("");
    setSuspendDays("7");
    setAlertTitle("");
    setAlertMessage("");
    setAlertType("info");
    setOpenDropdown(null);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setModalLoading(false);
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.backToAdmin")}
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("admin.manageUsers")}</h1>
              <p className="text-sm text-muted-foreground">
                {stats.total} {t("admin.totalUsersCount")}
              </p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{t("admin.totalUsersCount")}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">{t("admin.adminCount")}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Ban className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{stats.disabled}</p>
              <p className="text-xs text-muted-foreground">{t("admin.disabledCount")}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchUsers")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted border-border text-foreground rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "admin", "user"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setRoleFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  roleFilter === filter
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter === "all" ? t("admin.allUsers") : filter === "admin" ? t("admin.adminsOnly") : t("admin.usersOnly")}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl border border-border overflow-visible">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("admin.noUsers")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">{t("admin.email")}</TableHead>
                    <TableHead className="text-muted-foreground hidden sm:table-cell">{t("admin.name")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.role")}</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">{t("admin.provider")}</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">{t("admin.purchasesCol")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.status")}</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">{t("admin.joined")}</TableHead>
                    <TableHead className="text-muted-foreground text-right">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id} className={`border-border hover:bg-muted ${u.disabled ? "opacity-60" : ""}`}>
                      <TableCell className="font-medium text-foreground max-w-[180px] truncate">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{u.displayName || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.role === "admin"
                              ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted"
                          }
                        >
                          {u.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge className="bg-muted text-muted-foreground border-border">
                          {u.provider === "google" ? (
                            <>
                              <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                              Google
                            </>
                          ) : (
                            <>
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ShoppingBag className="h-3.5 w-3.5" />
                          {u.purchaseCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.disabled ? (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                            <Ban className="h-3 w-3 mr-1" />
                            {t("admin.disabled")}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("admin.active")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="relative inline-block">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-8 p-0"
                            onClick={() => setOpenDropdown(openDropdown === u.id ? null : u.id)}
                            disabled={u.id === user?.uid}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {openDropdown === u.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-xl z-[60] py-1 max-h-80 overflow-y-auto">
                              {/* Role toggle */}
                              <button
                                onClick={() => { toggleRole(u.id, u.role); setOpenDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                {u.role === "admin" ? <ShieldAlert className="h-4 w-4 text-amber-400" /> : <Shield className="h-4 w-4 text-primary" />}
                                {u.role === "admin" ? t("admin.revokeAdmin") : t("admin.makeAdmin")}
                              </button>
                              {/* Enable/Disable toggle */}
                              <button
                                onClick={() => { toggleDisabled(u.id, u.disabled); setOpenDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                {u.disabled ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Ban className="h-4 w-4 text-red-400" />}
                                {u.disabled ? t("admin.enable") : t("admin.disable")}
                              </button>
                              <div className="border-t border-border my-1" />
                              {/* Ban */}
                              <button
                                onClick={() => openModal("ban", u)}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <Ban className="h-4 w-4 text-red-400" />
                                {t("admin.banUser")}
                              </button>
                              {/* Suspend */}
                              <button
                                onClick={() => openModal("suspend", u)}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <Clock className="h-4 w-4 text-amber-400" />
                                {t("admin.suspendUser")}
                              </button>
                              {/* Send Alert */}
                              <button
                                onClick={() => openModal("alert", u)}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <Bell className="h-4 w-4 text-blue-400" />
                                {t("admin.sendAlert")}
                              </button>
                              {/* Password Reset */}
                              <button
                                onClick={() => { handlePasswordReset(u.id); setOpenDropdown(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <KeyRound className="h-4 w-4 text-purple-400" />
                                {t("admin.passwordReset")}
                              </button>
                              <div className="border-t border-border my-1" />
                              {/* Delete */}
                              <button
                                onClick={() => openModal("delete", u)}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t("admin.deleteUser")}
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {openDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
      )}

      {/* Modals */}
      {modalType && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {modalType === "ban" && <><Ban className="h-5 w-5 text-red-400" /> {t("admin.banUser")}</>}
                {modalType === "suspend" && <><Clock className="h-5 w-5 text-amber-400" /> {t("admin.suspendUser")}</>}
                {modalType === "delete" && <><Trash2 className="h-5 w-5 text-red-400" /> {t("admin.deleteUser")}</>}
                {modalType === "alert" && <><Bell className="h-5 w-5 text-blue-400" /> {t("admin.sendAlert")}</>}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedUser.email}
            </p>

            {/* Ban modal */}
            {modalType === "ban" && (
              <div className="space-y-3">
                <p className="text-sm text-foreground">{t("admin.banConfirm")}</p>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t("admin.banReason")}</label>
                  <Input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder={t("admin.banReasonPlaceholder")}
                    className="bg-muted border-border text-foreground rounded-xl"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={closeModal} className="border-border rounded-xl">{t("common.cancel")}</Button>
                  <Button onClick={handleBan} disabled={modalLoading} className="bg-red-500 hover:bg-red-600 text-white rounded-xl">
                    {modalLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {t("admin.banUser")}
                  </Button>
                </div>
              </div>
            )}

            {/* Suspend modal */}
            {modalType === "suspend" && (
              <div className="space-y-3">
                <p className="text-sm text-foreground">{t("admin.suspendConfirm")}</p>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t("admin.suspendDuration")}</label>
                  <div className="flex gap-2">
                    {["1", "3", "7", "14", "30"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setSuspendDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          suspendDays === d
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={closeModal} className="border-border rounded-xl">{t("common.cancel")}</Button>
                  <Button onClick={handleSuspend} disabled={modalLoading} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
                    {modalLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {t("admin.suspendUser")}
                  </Button>
                </div>
              </div>
            )}

            {/* Delete modal */}
            {modalType === "delete" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{t("admin.deleteConfirm")}</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={closeModal} className="border-border rounded-xl">{t("common.cancel")}</Button>
                  <Button onClick={handleDelete} disabled={modalLoading} className="bg-red-500 hover:bg-red-600 text-white rounded-xl">
                    {modalLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {t("admin.deleteUser")}
                  </Button>
                </div>
              </div>
            )}

            {/* Send Alert modal */}
            {modalType === "alert" && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t("admin.alertTypeLabel")}</label>
                  <div className="flex gap-2">
                    {(["info", "warning", "error"] as const).map((at) => (
                      <button
                        key={at}
                        onClick={() => setAlertType(at)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          alertType === at
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
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder={t("admin.alertTitlePlaceholder")}
                    className="bg-muted border-border text-foreground rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t("admin.alertMessage")}</label>
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder={t("admin.alertMessagePlaceholder")}
                    className="w-full h-24 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={closeModal} className="border-border rounded-xl">{t("common.cancel")}</Button>
                  <Button onClick={handleSendAlert} disabled={modalLoading || !alertTitle || !alertMessage} className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl">
                    {modalLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {t("admin.sendAlert")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
