"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatasetCard } from "@/components/dataset/dataset-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { AFRICAN_COUNTRIES, DATASET_CATEGORIES } from "@/types";
import type { Dataset } from "@/types";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Datasets</h1>
        <p className="text-muted-foreground">
          Discover and purchase high-quality African datasets
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className={`flex flex-wrap gap-3 ${showFilters ? "flex" : "hidden md:flex"}`}>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {DATASET_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {AFRICAN_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Active filters */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {category && (
              <Badge variant="secondary" className="gap-1">
                {category}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setCategory("")}
                />
              </Badge>
            )}
            {country && (
              <Badge variant="secondary" className="gap-1">
                {country}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setCountry("")}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6 space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex justify-between pt-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : datasets.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {datasets.length} dataset{datasets.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 space-y-3">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No datasets found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
