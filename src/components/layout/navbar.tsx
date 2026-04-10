"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage, LANGUAGES } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, ChevronDown, Sun, Moon, Globe } from "lucide-react";
import { useState, useEffect } from "react";

export function Navbar() {
  const { user, signOut, loading } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[#6c5ce7] flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="text-foreground">Datafrica</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/datasets" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.datasets")}
          </Link>
          <Link href="/datasets?category=Business" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.businessData")}
          </Link>
          <Link href="/datasets?category=Leads" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.leads")}
          </Link>
          {user?.role === "admin" && (
            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.admin")}
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Globe className="h-4 w-4" />
                <span className="uppercase text-xs font-medium">{lang}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-popover border-border">
              {LANGUAGES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`text-popover-foreground focus:bg-muted ${lang === l.code ? "bg-muted font-medium" : ""}`}
                >
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-1">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-primary text-xs font-semibold border border-border">
                      {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline">{user.displayName || user.email.split("@")[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                <div className="flex items-center gap-2 p-2">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium text-popover-foreground">{user.displayName || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-border" />
                {user.role === "admin" ? (
                  <DropdownMenuItem asChild className="text-popover-foreground focus:bg-muted">
                    <Link href="/admin">{t("nav.adminPanel")}</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild className="text-popover-foreground focus:bg-muted">
                    <Link href="/dashboard">{t("nav.dashboard")}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-popover-foreground focus:bg-muted"
                >
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-3 ml-1">
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
                {t("nav.signIn")}
              </Link>
              <Button size="sm" className="btn-pill bg-primary hover:bg-primary/90 text-primary-foreground px-5" asChild>
                <Link href="/register">{t("nav.startTrial")}</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-3">
          <Link href="/datasets" className="block text-sm font-medium text-secondary-foreground hover:text-foreground py-2" onClick={() => setMobileOpen(false)}>
            {t("nav.datasets")}
          </Link>
          <Link href="/datasets?category=Business" className="block text-sm font-medium text-secondary-foreground hover:text-foreground py-2" onClick={() => setMobileOpen(false)}>
            {t("nav.businessData")}
          </Link>
          <Link href="/datasets?category=Leads" className="block text-sm font-medium text-secondary-foreground hover:text-foreground py-2" onClick={() => setMobileOpen(false)}>
            {t("nav.leads")}
          </Link>

          {/* Mobile language selector */}
          <div className="flex gap-2 py-2 flex-wrap">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${lang === l.code ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {user ? (
            <>
              {user.role === "admin" ? (
                <Link href="/admin" className="block text-sm font-medium text-secondary-foreground hover:text-foreground py-2" onClick={() => setMobileOpen(false)}>
                  {t("nav.adminPanel")}
                </Link>
              ) : (
                <Link href="/dashboard" className="block text-sm font-medium text-secondary-foreground hover:text-foreground py-2" onClick={() => setMobileOpen(false)}>
                  {t("nav.dashboard")}
                </Link>
              )}
              <button
                className="w-full text-left text-sm font-medium text-secondary-foreground hover:text-foreground py-2"
                onClick={() => { signOut(); setMobileOpen(false); }}
              >
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1 text-center text-sm font-medium text-secondary-foreground border border-border rounded-full py-2 hover:bg-muted" onClick={() => setMobileOpen(false)}>
                {t("nav.signIn")}
              </Link>
              <Link href="/register" className="flex-1 text-center text-sm font-medium text-primary-foreground bg-primary rounded-full py-2 hover:bg-primary/90" onClick={() => setMobileOpen(false)}>
                {t("nav.startTrial")}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
