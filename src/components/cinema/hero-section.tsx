"use client";
import {useLocale} from "next-intl";


import { useTranslations as useInterfaceTranslations } from "next-intl";
import { useState } from "react";
import Image from "next/image";
import { Plus, ArrowUpRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  readonly id: number;
  readonly mediaType: "movie" | "tv";
  readonly title: string;
  readonly overview: string;
  readonly backdropPath: string | null;
  readonly year: string;
  readonly rating: number | null;
  readonly onAddToWatchlist?: () => void;
}

export function HeroSection({
  id,
  mediaType,
  title,
  overview,
  backdropPath,
  year,
  rating,
  onAddToWatchlist,
}: HeroSectionProps) {
  const locale = useLocale();
  const translateInterface = useInterfaceTranslations("interface");

  const [imgError, setImgError] = useState(false);
  const hasArtwork = Boolean(backdropPath) && !imgError;

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${hasArtwork ? "bg-muted" : "border border-border bg-card"}`}>
      {/* Background image */}
      {backdropPath && !imgError ? (
        <Image
            unoptimized
          src={`/api/tmdb/image/t/p/w1280${backdropPath}`}
          alt={title}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
          priority
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}

      {/* Gradient overlay */}
      {hasArtwork && <><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /></>}

      {/* Content */}
      <div className={`relative z-10 flex flex-col justify-end p-6 md:p-10 ${hasArtwork ? "min-h-[360px] md:min-h-[440px] text-white" : "text-foreground"}`}>
        <div className="max-w-xl">
          <div className={`flex items-center gap-3 mb-2 text-sm ${hasArtwork ? "text-white/70" : "text-muted-foreground"}`}>
            {year && <span>{year}</span>}
            {rating && rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {rating.toLocaleString(locale, {minimumFractionDigits: 1, maximumFractionDigits: 1})}
              </span>
            )}
          </div>

          <p className={`mb-3 text-xs font-medium uppercase tracking-widest ${hasArtwork ? "text-white/80" : "text-muted-foreground"}`}>{translateInterface("uxInTheSpotlight")}</p>
          <h2 className="text-3xl md:text-4xl font-semibold mb-3 leading-tight">
            {title}
          </h2>

          <p className={`text-sm md:text-base line-clamp-3 mb-5 ${hasArtwork ? "text-white/80" : "text-muted-foreground"}`}>
            {overview}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className={`min-h-11 rounded-xl gap-2 ${hasArtwork ? "bg-white text-black hover:bg-white/90" : ""}`}
            >
              <a href={`/${mediaType}/${id}`}>
                <ArrowUpRight className="h-4 w-4" />
                {translateInterface("m90789c12d073")}
              </a>
            </Button>
            {onAddToWatchlist && (
              <Button
                variant="outline"
                onClick={onAddToWatchlist}
                className={`gap-2 ${hasArtwork ? "border-white/50 text-white hover:bg-white/10" : ""}`}
              >
                <Plus className="h-4 w-4" />
                {translateInterface("m2bae6c86af29")}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
