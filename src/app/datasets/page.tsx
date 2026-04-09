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
import type { Dataset } from "@/types";

export default function DatasetsPage() {
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

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setCountry("");
  };

  const hasFilters = search || category || country;

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm font-medium text-[#3d7eff] uppercase tracking-wider mb-2">Marketplace</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Browse Datasets</h1>
        <p className="text-[#7a8ba3] text-lg">
          Discover and purchase verified African datasets
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-10">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525f73]" />
            <Input
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 bg-[#111d32] border-white/[0.08] text-white placeholder:text-[#525f73] rounded-xl focus:border-[#3d7eff] focus:ring-[#3d7eff]/20"
            />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-[#111d32] border-white/[0.08] text-[#c8d6e5] rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#111d32] border-white/10">
              {DATASET_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-[#111d32] border-white/[0.08] text-[#c8d6e5] rounded-xl">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent className="bg-[#111d32] border-white/10">
              {AFRICAN_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c} className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="h-12 px-4 rounded-xl text-sm text-[#7a8ba3] hover:text-white border border-white/[0.08] hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 space-y-4">
              <Skeleton className="h-5 w-20 bg-white/5" />
              <Skeleton className="h-6 w-3/4 bg-white/5" />
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-2/3 bg-white/5" />
              <div className="flex justify-between pt-4">
                <Skeleton className="h-6 w-24 bg-white/5" />
                <Skeleton className="h-6 w-16 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : datasets.length > 0 ? (
        <>
          <p className="text-sm text-[#525f73] mb-6">
            {datasets.length} dataset{datasets.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-24 space-y-4">
          <Database className="h-16 w-16 mx-auto text-[#1a2a42]" />
          <h3 className="text-xl font-semibold text-white">No datasets found</h3>
          <p className="text-[#7a8ba3]">
            Try adjusting your search or filters
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 rounded-full text-sm text-white border border-white/20 hover:bg-white/5 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
