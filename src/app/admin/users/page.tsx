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
        toast.error("Failed to fetch users");
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
        toast.error("Failed to update user role");
      }
    } catch {
      toast.error("Failed to update user role");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-[#7a8ba3] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-[#3d7eff]/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#3d7eff]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Manage Users</h1>
        </div>

        <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/5" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-[#7a8ba3] mx-auto mb-3" />
              <p className="text-[#7a8ba3]">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-[#7a8ba3]">Email</TableHead>
                    <TableHead className="text-[#7a8ba3]">Name</TableHead>
                    <TableHead className="text-[#7a8ba3]">Role</TableHead>
                    <TableHead className="text-[#7a8ba3]">Joined</TableHead>
                    <TableHead className="text-[#7a8ba3] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{u.email}</TableCell>
                      <TableCell className="text-[#c0c8d4]">{u.displayName || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.role === "admin"
                              ? "bg-[#3d7eff]/20 text-[#3d7eff] border-[#3d7eff]/30 hover:bg-[#3d7eff]/30"
                              : "bg-white/10 text-[#7a8ba3] border-white/10 hover:bg-white/15"
                          }
                        >
                          {u.role === "admin" && (
                            <Shield className="h-3 w-3 mr-1" />
                          )}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#7a8ba3]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-[#c0c8d4] hover:bg-white/10 hover:text-white"
                          onClick={() => toggleRole(u.id, u.role)}
                          disabled={u.id === user?.uid}
                        >
                          {u.role === "admin" ? (
                            <>
                              <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                              Revoke Admin
                            </>
                          ) : (
                            <>
                              <Shield className="h-3.5 w-3.5 mr-1" />
                              Make Admin
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
