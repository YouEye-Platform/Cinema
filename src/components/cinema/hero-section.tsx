"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Play, Star } from "lucide-react";
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
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
      {/* Background image */}
      {backdropPath && !imgError ? (
        <Image
          src={`/api/tmdb/image/t/p/w1280${backdropPath}`}
          alt={title}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
          priority
          sizes="100vw"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/30" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 mb-2 text-white/70 text-sm">
            {year && <span>{year}</span>}
            {rating && rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            {title}
          </h1>

          <p className="text-white/80 text-sm md:text-base line-clamp-3 mb-5">
            {overview}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-white text-black hover:bg-white/90 gap-2"
            >
              <a href={`/${mediaType}/${id}`}>
                <Play className="h-4 w-4 fill-black" />
                View Details
              </a>
            </Button>
            {onAddToWatchlist && (
              <Button
                variant="outline"
                onClick={onAddToWatchlist}
                className="border-white/50 text-white hover:bg-white/10 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add to Watchlist
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
