"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface PolicyLayoutProps {
  titleKey: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function PolicyLayout({ titleKey, lastUpdated, children }: PolicyLayoutProps) {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10 max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t(titleKey)}</h1>
          <p className="text-sm text-muted-foreground">
            {t("policy.lastUpdated")}: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </div>
    </div>
  );
}
