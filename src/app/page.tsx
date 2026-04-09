"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DatasetCard } from "@/components/dataset/dataset-card";
import { useLanguage } from "@/hooks/use-language";
import {
  Database,
  ArrowRight,
  Globe,
  ShieldCheck,
  Download,
  Search,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { Dataset } from "@/types";

export default function HomePage() {
  const { t } = useLanguage();
  const [featuredDatasets, setFeaturedDatasets] = useState<Dataset[]>([]);
  const [recentDatasets, setRecentDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDatasets() {
      try {
        const [featuredRes, recentRes] = await Promise.all([
          fetch("/api/datasets?featured=true&limit=3"),
          fetch("/api/datasets?limit=6"),
        ]);
        if (featuredRes.ok) {
          const data = await featuredRes.json();
          setFeaturedDatasets(data.datasets);
        }
        if (recentRes.ok) {
          const data = await recentRes.json();
          setRecentDatasets(data.datasets);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchDatasets();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="container mx-auto px-4 lg:px-8 py-24 md:py-36 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-sm">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{t("hero.badge")}</span>
              <span className="text-foreground font-medium">{t("hero.badgeCountries")}</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
              {t("hero.title")}{" "}
              <span className="gradient-text">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/datasets" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20">
                <Search className="h-4 w-4" />
                {t("hero.browseBtn")}
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-foreground font-medium rounded-full border border-border hover:bg-muted transition-all">
                {t("hero.trialBtn")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-sm text-dim">{t("hero.noCreditCard")}</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: t("stats.datasets"), value: t("stats.datasetsValue"), icon: Database },
              { label: t("stats.records"), value: t("stats.recordsValue"), icon: TrendingUp },
              { label: t("stats.countries"), value: t("stats.countriesValue"), icon: Globe },
              { label: t("stats.formats"), value: t("stats.formatsValue"), icon: Zap },
            ].map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <stat.icon className="h-5 w-5 text-primary mx-auto" />
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 lg:px-8 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">{t("features.sectionLabel")}</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("features.sectionTitle")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Database, title: t("features.verified"), desc: t("features.verifiedDesc") },
            { icon: ShieldCheck, title: t("features.secure"), desc: t("features.secureDesc") },
            { icon: Download, title: t("features.instant"), desc: t("features.instantDesc") },
          ].map((feature) => (
            <div key={feature.title} className="glass-card rounded-xl p-8 space-y-4 transition-all duration-300 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Datasets */}
      {!loading && featuredDatasets.length > 0 && (
        <section className="container mx-auto px-4 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">{t("sections.featured")}</p>
              <h2 className="text-3xl font-bold text-foreground">{t("sections.topDatasets")}</h2>
            </div>
            <Link href="/datasets?featured=true" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
              {t("sections.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredDatasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Datasets */}
      {!loading && recentDatasets.length > 0 && (
        <section className="container mx-auto px-4 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">{t("sections.marketplace")}</p>
              <h2 className="text-3xl font-bold text-foreground">{t("sections.latestDatasets")}</h2>
            </div>
            <Link href="/datasets" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
              {t("sections.browseAll")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentDatasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && recentDatasets.length === 0 && (
        <section className="container mx-auto px-4 lg:px-8 py-24 text-center space-y-4">
          <Database className="h-16 w-16 mx-auto text-muted" />
          <h2 className="text-2xl font-bold text-foreground">{t("sections.noDatasets")}</h2>
          <p className="text-muted-foreground max-w-md mx-auto">{t("sections.noDatasetsDesc")}</p>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 lg:px-8 py-24 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-sm mb-4">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{t("sections.joinBadge")}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("sections.ctaTitle")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">{t("sections.ctaDesc")}</p>
          <Link href="/register" className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 text-lg">
            {t("sections.ctaBtn")}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
