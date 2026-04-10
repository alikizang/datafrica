"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatasetCard } from "@/components/dataset/dataset-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Database } from "lucide-react";
import { AFRICAN_COUNTRIES, DATASET_CATEGORIES } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import type { Dataset } from "@/types";

export default function DatasetsPage() {
  const { t } = useLanguage();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (country) params.set("country", country);
      if (search) params.set("search", search);
      const res = await fetch(`/api/datasets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.datasets);
      }
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  }, [category, country, search]);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  const clearFilters = () => { setSearch(""); setCategory(""); setCountry(""); };
  const hasFilters = search || category || country;

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      <div className="mb-10">
        <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">{t("sections.marketplace")}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t("dataset.browseTitle")}</h1>
        <p className="text-muted-foreground text-lg">{t("dataset.browseSubtitle")}</p>
      </div>

      <div className="space-y-4 mb-10">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
            <Input
              placeholder={t("dataset.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 bg-card border-border text-foreground placeholder:text-dim rounded-xl focus:border-primary focus:ring-primary/20"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-card border-border text-secondary-foreground rounded-xl">
              <SelectValue placeholder={t("dataset.category")} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {DATASET_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-popover-foreground focus:bg-muted focus:text-foreground">
                  {t(`categories.${cat}`) !== `categories.${cat}` ? t(`categories.${cat}`) : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-card border-border text-secondary-foreground rounded-xl">
              <SelectValue placeholder={t("dataset.country")} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {AFRICAN_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c} className="text-popover-foreground focus:bg-muted focus:text-foreground">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <button onClick={clearFilters} className="h-12 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> {t("dataset.clear")}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 space-y-4">
              <Skeleton className="h-5 w-20 bg-muted" />
              <Skeleton className="h-6 w-3/4 bg-muted" />
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-2/3 bg-muted" />
              <div className="flex justify-between pt-4">
                <Skeleton className="h-6 w-24 bg-muted" />
                <Skeleton className="h-6 w-16 bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : datasets.length > 0 ? (
        <>
          <p className="text-sm text-dim mb-6">{datasets.length} dataset{datasets.length !== 1 ? "s" : ""} {t("dataset.found")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset) => (<DatasetCard key={dataset.id} dataset={dataset} />))}
          </div>
        </>
      ) : (
        <div className="text-center py-24 space-y-4">
          <Database className="h-16 w-16 mx-auto text-muted" />
          <h3 className="text-xl font-semibold text-foreground">{t("dataset.noResults")}</h3>
          <p className="text-muted-foreground">{t("dataset.noResultsDesc")}</p>
          {hasFilters && (
            <button onClick={clearFilters} className="px-6 py-2.5 rounded-full text-sm text-foreground border border-border hover:bg-muted transition-colors">
              {t("dataset.clearFilters")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
