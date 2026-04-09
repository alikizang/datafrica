"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#0a1628]/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#3d7eff] to-[#6c5ce7] flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="text-white">Datafrica</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/datasets"
            className="text-sm font-medium text-[#7a8ba3] hover:text-white transition-colors"
          >
            Datasets
          </Link>
          <Link
            href="/datasets?category=Business"
            className="text-sm font-medium text-[#7a8ba3] hover:text-white transition-colors"
          >
            Business Data
          </Link>
          <Link
            href="/datasets?category=Leads"
            className="text-sm font-medium text-[#7a8ba3] hover:text-white transition-colors"
          >
            Leads
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-[#7a8ba3] hover:text-white transition-colors"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-[#7a8ba3] hover:text-white transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#1a2a42] text-[#3d7eff] text-xs font-semibold border border-white/10">
                      {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline">{user.displayName || user.email.split("@")[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#111d32] border-white/10">
                <div className="flex items-center gap-2 p-2">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium text-white">{user.displayName || "User"}</p>
                    <p className="text-xs text-[#7a8ba3]">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild className="text-[#c8d6e5] focus:text-white focus:bg-white/5">
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem asChild className="text-[#c8d6e5] focus:text-white focus:bg-white/5">
                    <Link href="/admin">Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-[#c8d6e5] focus:text-white focus:bg-white/5"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-[#7a8ba3] hover:text-white transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Button size="sm" className="btn-pill bg-[#3d7eff] hover:bg-[#2d6eef] text-white px-5" asChild>
                <Link href="/register">Start free trial</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-[#7a8ba3] hover:text-white"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0d1a2d] p-4 space-y-3">
          <Link
            href="/datasets"
            className="block text-sm font-medium text-[#c8d6e5] hover:text-white py-2"
            onClick={() => setMobileOpen(false)}
          >
            Datasets
          </Link>
          <Link
            href="/datasets?category=Business"
            className="block text-sm font-medium text-[#c8d6e5] hover:text-white py-2"
            onClick={() => setMobileOpen(false)}
          >
            Business Data
          </Link>
          <Link
            href="/datasets?category=Leads"
            className="block text-sm font-medium text-[#c8d6e5] hover:text-white py-2"
            onClick={() => setMobileOpen(false)}
          >
            Leads
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="block text-sm font-medium text-[#c8d6e5] hover:text-white py-2"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="block text-sm font-medium text-[#c8d6e5] hover:text-white py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
              <button
                className="w-full text-left text-sm font-medium text-[#c8d6e5] hover:text-white py-2"
                onClick={() => { signOut(); setMobileOpen(false); }}
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link
                href="/login"
                className="flex-1 text-center text-sm font-medium text-[#c8d6e5] border border-white/10 rounded-full py-2 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="flex-1 text-center text-sm font-medium text-white bg-[#3d7eff] rounded-full py-2 hover:bg-[#2d6eef]"
                onClick={() => setMobileOpen(false)}
              >
                Start free trial
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
