"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Database, MapPin, Star, ArrowRight, Eye, Crown } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { Dataset } from "@/types";

interface DatasetCardProps {
  dataset: Dataset;
}

export function DatasetCard({ dataset }: DatasetCardProps) {
  const { t, lang } = useLanguage();

  const formatPrice = (price: number, currency: string) => {
    if (currency === "XOF" || currency === "CFA") {
      return `${price.toLocaleString()} CFA`;
    }
    return `$${price.toLocaleString()}`;
  };

  const translatedCategory = t(`categories.${dataset.category}`) !== `categories.${dataset.category}`
    ? t(`categories.${dataset.category}`)
    : dataset.category;

  const description = dataset.descriptions?.[lang] || dataset.description;

  return (
    <Link href={`/datasets/${dataset.id}`} className="group">
      <div className="glass-card rounded-xl p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
            {translatedCategory}
          </Badge>
          {dataset.featured && (
            <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium">
              {t("dataset.featured")}
            </Badge>
          )}
          {dataset.accessTier === "premium" && (
            <Badge className="bg-violet-500/10 text-violet-500 border border-violet-500/20 text-xs font-medium gap-1">
              <Crown className="h-3 w-3" />
              {t("dataset.premium")}
            </Badge>
          )}
          {!dataset.allowDownload && (
            <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 text-xs font-medium gap-1">
              <Eye className="h-3 w-3" />
              {t("dataset.viewOnly")}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-base text-foreground leading-tight line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {dataset.titles?.[lang] || dataset.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
          {description}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {dataset.country}
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {(dataset.recordCount || 0).toLocaleString()} {t("dataset.records")}
          </span>
          {(dataset.ratingCount || 0) > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {(dataset.rating || 0).toFixed(1)}
            </span>
          )}
        </div>
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <span className="font-bold text-lg text-primary">
            {formatPrice(dataset.price, dataset.currency)}
          </span>
          <span className="text-sm text-muted-foreground group-hover:text-primary flex items-center gap-1 transition-colors font-medium">
            {dataset.allowDownload ? t("dataset.viewDataset") : t("dataset.previewDataLink")}
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
