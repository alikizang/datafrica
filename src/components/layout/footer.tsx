"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/use-language";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
              <Image src="/logo.png" alt="Datafrica" width={32} height={32} className="h-8 w-8 rounded-lg" />
              <span className="text-foreground">Datafrica</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("footer.desc")}</p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">{t("footer.marketplace")}</h4>
            <div className="space-y-3">
              <Link href="/datasets" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.browseDatasets")}</Link>
              <Link href="/datasets?category=Business" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.businessData")}</Link>
              <Link href="/datasets?category=Leads" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.leadsContacts")}</Link>
              <Link href="/datasets?category=E-commerce" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.ecommerce")}</Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">{t("footer.company")}</h4>
            <div className="space-y-3">
              <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.privacy")}</Link>
              <Link href="/terms" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.terms")}</Link>
              <Link href="/refund" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.refund")}</Link>
              <Link href="/cookies" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.cookies")}</Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">{t("footer.resources")}</h4>
            <div className="space-y-3">
              <Link href="/acceptable-use" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.acceptableUse")}</Link>
              <Link href="/dpa" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.dpa")}</Link>
              <Link href="/register" className="block text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.getStarted")}</Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-dim">&copy; {new Date().getFullYear()} Datafrica. {t("footer.allRights")}</p>
          <p className="text-sm text-dim">{t("footer.tagline")}</p>
        </div>
      </div>
    </footer>
  );
}
