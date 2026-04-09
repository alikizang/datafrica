"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, MapPin, Star, ArrowRight } from "lucide-react";
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
    <Card className="group hover:shadow-lg transition-all duration-200 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs shrink-0">
                {dataset.category}
              </Badge>
              {dataset.featured && (
                <Badge className="text-xs bg-amber-500 hover:bg-amber-600 shrink-0">
                  Featured
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {dataset.title}
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {dataset.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {dataset.country}
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-3.5 w-3.5" />
            {dataset.recordCount.toLocaleString()} records
          </span>
          {dataset.ratingCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              {dataset.rating.toFixed(1)}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <span className="font-bold text-lg text-primary">
          {formatPrice(dataset.price, dataset.currency)}
        </span>
        <Button size="sm" variant="ghost" className="group-hover:bg-primary group-hover:text-primary-foreground transition-all" asChild>
          <Link href={`/datasets/${dataset.id}`}>
            View
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
