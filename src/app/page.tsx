"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DatasetCard } from "@/components/dataset/dataset-card";
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
        // Silently fail for homepage
      } finally {
        setLoading(false);
      }
    }

    fetchDatasets();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="container mx-auto px-4 lg:px-8 py-24 md:py-36 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Social proof badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-sm">
              <Globe className="h-4 w-4 text-[#3d7eff]" />
              <span className="text-[#7a8ba3]">Trusted by businesses across</span>
              <span className="text-white font-medium">15+ African countries</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
              Africa&apos;s data,{" "}
              <span className="gradient-text">unlocked</span>
            </h1>

            <p className="text-lg md:text-xl text-[#7a8ba3] max-w-2xl mx-auto leading-relaxed">
              Access verified business directories, leads, contacts, and institutional data
              from across the African continent. Pay once, download instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/datasets"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#3d7eff] text-white font-medium rounded-full hover:bg-[#2d6eef] transition-all hover:shadow-lg hover:shadow-[#3d7eff]/20"
              >
                <Search className="h-4 w-4" />
                Browse Datasets
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-white font-medium rounded-full border border-white/20 hover:bg-white/5 transition-all"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="text-sm text-[#525f73]">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-white/[0.06] bg-[#0d1a2d]/50">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Datasets", value: "Growing", icon: Database },
              { label: "Records Available", value: "400K+", icon: TrendingUp },
              { label: "African Countries", value: "15+", icon: Globe },
              { label: "Data Formats", value: "CSV, Excel, JSON", icon: Zap },
            ].map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <stat.icon className="h-5 w-5 text-[#3d7eff] mx-auto" />
                <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-[#7a8ba3]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 lg:px-8 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-[#3d7eff] uppercase tracking-wider mb-3">Why Datafrica</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Everything you need for African data
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Database,
              title: "Verified Datasets",
              desc: "Curated, verified datasets covering businesses, leads, jobs, and institutions across 15+ African countries.",
            },
            {
              icon: ShieldCheck,
              title: "Secure Payments",
              desc: "Pay securely with KKiaPay (mobile money, cards) or Stripe. Your transactions are always protected.",
            },
            {
              icon: Download,
              title: "Instant Access",
              desc: "Preview data before purchase. Download in CSV, Excel, or JSON format immediately after payment.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass-card rounded-xl p-8 space-y-4 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#3d7eff]/10">
                <feature.icon className="h-6 w-6 text-[#3d7eff]" />
              </div>
              <h3 className="font-semibold text-lg text-white">{feature.title}</h3>
              <p className="text-sm text-[#7a8ba3] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Datasets */}
      {!loading && featuredDatasets.length > 0 && (
        <section className="container mx-auto px-4 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-medium text-[#3d7eff] uppercase tracking-wider mb-2">Featured</p>
              <h2 className="text-3xl font-bold text-white">Top Datasets</h2>
            </div>
            <Link
              href="/datasets?featured=true"
              className="text-sm text-[#3d7eff] hover:text-[#5a9aff] flex items-center gap-1 font-medium"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
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
              <p className="text-sm font-medium text-[#3d7eff] uppercase tracking-wider mb-2">Marketplace</p>
              <h2 className="text-3xl font-bold text-white">Latest Datasets</h2>
            </div>
            <Link
              href="/datasets"
              className="text-sm text-[#3d7eff] hover:text-[#5a9aff] flex items-center gap-1 font-medium"
            >
              Browse all <ArrowRight className="h-3.5 w-3.5" />
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
          <Database className="h-16 w-16 mx-auto text-[#1a2a42]" />
          <h2 className="text-2xl font-bold text-white">No datasets yet</h2>
          <p className="text-[#7a8ba3] max-w-md mx-auto">
            Datasets will appear here once they are uploaded. Check back soon!
          </p>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-white/[0.06]">
        <div className="container mx-auto px-4 lg:px-8 py-24 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-sm mb-4">
            <Users className="h-4 w-4 text-[#3d7eff]" />
            <span className="text-[#7a8ba3]">Join hundreds of businesses</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to unlock Africa&apos;s data potential?
          </h2>
          <p className="text-[#7a8ba3] max-w-xl mx-auto text-lg">
            Create your free account and start accessing high-quality African datasets today.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-[#3d7eff] text-white font-medium rounded-full hover:bg-[#2d6eef] transition-all hover:shadow-lg hover:shadow-[#3d7eff]/20 text-lg"
          >
            Get started for free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
