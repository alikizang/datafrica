"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Database, MapPin, Star, ArrowRight, Eye, Lock } from "lucide-react";
import type { Dataset } from "@/types";

interface DatasetCardProps {
  dataset: Dataset;
}

export function DatasetCard({ dataset }: DatasetCardProps) {
  const formatPrice = (price: number, currency: string) => {
    if (currency === "XOF" || currency === "CFA") {
      return `${price.toLocaleString()} CFA`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <Link href={`/datasets/${dataset.id}`} className="group">
      <div className="glass-card rounded-xl p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#3d7eff]/5">
        {/* Header badges */}
        <div className="flex items-center gap-2 mb-4">
          <Badge className="bg-[#3d7eff]/10 text-[#3d7eff] border-0 text-xs font-medium">
            {dataset.category}
          </Badge>
          {dataset.featured && (
            <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs font-medium">
              Featured
            </Badge>
          )}
          {!dataset.allowDownload && (
            <Badge className="bg-purple-500/10 text-purple-400 border-0 text-xs font-medium gap-1">
              <Eye className="h-3 w-3" />
              View only
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base text-white leading-tight line-clamp-2 mb-2 group-hover:text-[#3d7eff] transition-colors">
          {dataset.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[#7a8ba3] line-clamp-2 mb-4 flex-1">
          {dataset.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-[#525f73] mb-5">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {dataset.country}
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {dataset.recordCount.toLocaleString()} records
          </span>
          {dataset.ratingCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {dataset.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <span className="font-bold text-lg text-[#3d7eff]">
            {formatPrice(dataset.price, dataset.currency)}
          </span>
          <span className="text-sm text-[#7a8ba3] group-hover:text-[#3d7eff] flex items-center gap-1 transition-colors font-medium">
            {dataset.allowDownload ? "View dataset" : "Preview data"}
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
