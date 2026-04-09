"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatasetCard } from "@/components/dataset/dataset-card";
import {
  Database,
  ArrowRight,
  Globe,
  ShieldCheck,
  Download,
  Search,
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
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <Globe className="h-3 w-3 mr-1" />
              Powering data-driven decisions across Africa
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Africa&apos;s Premier{" "}
              <span className="text-primary">Data Marketplace</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Access high-quality datasets from across the African continent.
              Business directories, leads, contacts, real estate, and more &mdash;
              all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link href="/datasets">
                  <Search className="mr-2 h-4 w-4" />
                  Browse Datasets
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Database,
              title: "Quality Datasets",
              desc: "Curated, verified datasets covering businesses, leads, jobs, and more across 15+ African countries.",
            },
            {
              icon: ShieldCheck,
              title: "Secure Payments",
              desc: "Pay securely with KKiaPay (mobile money, cards) or Stripe. Your transactions are protected.",
            },
            {
              icon: Download,
              title: "Instant Downloads",
              desc: "Download datasets in CSV, Excel, or JSON format immediately after purchase.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="text-center space-y-3 p-6 rounded-lg border bg-card"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Datasets */}
      {!loading && featuredDatasets.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Featured Datasets</h2>
              <p className="text-muted-foreground">
                Hand-picked datasets for your business needs
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/datasets?featured=true">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
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
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Latest Datasets</h2>
              <p className="text-muted-foreground">
                Recently added to the marketplace
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/datasets">
                Browse all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentDatasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State when no datasets loaded yet */}
      {!loading && recentDatasets.length === 0 && (
        <section className="container mx-auto px-4 py-20 text-center space-y-4">
          <Database className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <h2 className="text-2xl font-bold">No datasets yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Datasets will appear here once they are uploaded by an admin.
            Check back soon!
          </p>
        </section>
      )}

      {/* CTA */}
      <section className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">
            Ready to unlock Africa&apos;s data potential?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join hundreds of businesses using Datafrica to power their growth
            across the continent.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">Create your free account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
