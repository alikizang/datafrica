"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Shield, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

interface UserRecord {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchUsers() {
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
        }
      } catch {
        toast.error(t("common.error"));
      } finally {
        setLoading(false);
      }
    }

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
        toast.success(`User role updated to ${newRole}`);
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (authLoading) return null;

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

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.manageUsers")}</h1>
        </div>

        <div className="glass-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("admin.noUsers")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">{t("admin.email")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.name")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.role")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("admin.joined")}</TableHead>
                    <TableHead className="text-muted-foreground text-right">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-border hover:bg-muted">
                      <TableCell className="font-medium text-foreground">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground">{u.displayName || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.role === "admin"
                              ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted"
                          }
                        >
                          {u.role === "admin" && (
                            <Shield className="h-3 w-3 mr-1" />
                          )}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => toggleRole(u.id, u.role)}
                          disabled={u.id === user?.uid}
                        >
                          {u.role === "admin" ? (
                            <>
                              <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                              {t("admin.revokeAdmin")}
                            </>
                          ) : (
                            <>
                              <Shield className="h-3.5 w-3.5 mr-1" />
                              {t("admin.makeAdmin")}
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
