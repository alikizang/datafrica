"use client";

import Link from "next/link";
import Image from "next/image";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  Globe,
  Database,
  Briefcase,
  Users,
  Home,
  ShoppingCart,
  TrendingUp,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Shield,
  Bell,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/use-notifications";

const NAV_CATEGORIES = [
  { key: "Business", icon: Briefcase },
  { key: "Leads", icon: Users },
  { key: "Real Estate", icon: Home },
  { key: "E-commerce", icon: ShoppingCart },
  { key: "Finance", icon: TrendingUp },
  { key: "Health", icon: HeartPulse },
  { key: "Education", icon: GraduationCap },
] as const;

export function Navbar() {
  const { user, signOut, loading } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const categoryLabel = (key: string) => {
    const translated = t(`categories.${key}`);
    return translated !== `categories.${key}` ? translated : key;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <Image src="/logo.png" alt="Datafrica" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <span className="text-foreground">Datafrica</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Datasets Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t("nav.datasets")}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover border-border">
              <DropdownMenuItem asChild className="text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                <Link href="/datasets" className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">{t("footer.browseDatasets")}</p>
                    <p className="text-xs text-muted-foreground">{t("dataset.browseSubtitle")}</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {NAV_CATEGORIES.map(({ key, icon: Icon }) => (
                <DropdownMenuItem key={key} asChild className="text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                  <Link href={`/datasets?category=${key}`} className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {categoryLabel(key)}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Pricing */}
          <Link href="/pricing" className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            {t("nav.pricing")}
          </Link>

          {/* Admin */}
          {user?.role === "admin" && (
            <Link href="/admin" className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t("nav.admin")}
            </Link>
          )}
        </nav>

        {/* Desktop Right Side */}
        <div className="hidden md:flex items-center gap-1">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors">
                <Globe className="h-4 w-4" />
                <span className="uppercase text-xs font-medium">{lang}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-popover border-border">
              {LANGUAGES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`text-popover-foreground focus:bg-accent focus:text-accent-foreground ${lang === l.code ? "bg-accent font-medium" : ""}`}
                >
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications Bell */}
          {user && (
            <Link
              href="/dashboard?tab=purchases"
              className="relative p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {/* Auth */}
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-1 px-2 py-1.5 rounded-lg">
                  <Avatar className="h-8 w-8">
                    {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ""} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                      {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline font-medium">{user.displayName || user.email.split("@")[0]}</span>
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
                  <DropdownMenuItem asChild className="text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                    <Link href="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {t("nav.adminPanel")}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild className="text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      {t("nav.dashboard")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg">
                {t("nav.signIn")}
              </Link>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 font-medium" asChild>
                <Link href="/register">{t("nav.startTrial")}</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex md:hidden items-center gap-1">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {/* Browse all */}
            <Link
              href="/datasets"
              className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-primary py-3 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <Database className="h-4 w-4" />
              {t("footer.browseDatasets")}
            </Link>

            {/* Categories */}
            <div className="pl-1 border-l-2 border-border ml-2 space-y-0.5">
              {NAV_CATEGORIES.map(({ key, icon: Icon }) => (
                <Link
                  key={key}
                  href={`/datasets?category=${key}`}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary py-2.5 pl-3 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {categoryLabel(key)}
                </Link>
              ))}
            </div>

            {/* Pricing */}
            <Link
              href="/pricing"
              className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-primary py-3 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {t("nav.pricing")}
            </Link>

            {/* Language selector */}
            <div className="flex gap-2 py-3 flex-wrap">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    lang === l.code
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-primary hover:border-primary/30"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="border-t border-border pt-3 mt-1">
              {user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 py-2 px-1">
                    <Avatar className="h-8 w-8">
                      {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ""} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                        {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.displayName || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {user.role === "admin" ? (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-primary py-3 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      {t("nav.adminPanel")}
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-primary py-3 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {t("nav.dashboard")}
                    </Link>
                  )}
                  <button
                    className="flex items-center gap-2.5 w-full text-left text-sm font-medium text-muted-foreground hover:text-primary py-3 transition-colors"
                    onClick={() => { signOut(); setMobileOpen(false); }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("nav.signOut")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link
                    href="/login"
                    className="flex-1 text-center text-sm font-medium text-muted-foreground border border-border rounded-full py-2.5 hover:text-primary hover:border-primary/30 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("nav.signIn")}
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 text-center text-sm font-medium text-primary-foreground bg-primary rounded-full py-2.5 hover:bg-primary/90 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("nav.startTrial")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
