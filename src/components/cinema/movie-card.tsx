"use client";

import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";

interface MovieCardProps {
  readonly id: number;
  readonly mediaType: "movie" | "tv";
  readonly title: string;
  readonly posterPath: string | null;
  readonly year: string;
  readonly rating: number | null;
  readonly onClick?: () => void;
}

export function MovieCard({ id, mediaType, title, posterPath, year, rating, onClick }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const href = `/${mediaType}/${id}`;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="group block flex-shrink-0 w-36 cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-lg bg-muted aspect-[2/3] mb-2">
        {posterPath && !imgError ? (
          <Image
            src={`/api/tmdb/image/t/p/w342${posterPath}`}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            sizes="144px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">
            {title}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
          <p className="text-white text-xs line-clamp-3">{title}</p>
        </div>

        {/* Rating badge */}
        {rating && rating > 0 && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/70 text-yellow-400 text-xs px-1.5 py-0.5 rounded-full">
            <Star className="h-2.5 w-2.5 fill-yellow-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="px-0.5">
        <p className="text-sm font-medium line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {title}
        </p>
        {year && (
          <p className="text-xs text-muted-foreground mt-0.5">{year}</p>
        )}
      </div>
    </a>
  );
}
