"use client";

import { AdminGuard } from "@/components/auth/guards";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
