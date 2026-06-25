"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  readonly value: number | null;
  readonly onChange: (rating: number) => void;
  readonly readonly?: boolean;
}

export function RatingStars({ value, onChange, readonly = false }: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const display = hovered ?? value ?? 0;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(null)}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"
          )}
          aria-label={`Rate ${star} out of 10`}
        >
          <Star
            className={cn(
              "h-4 w-4",
              star <= display
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
      {value && (
        <span className="ml-1 text-sm text-muted-foreground">{value}/10</span>
      )}
    </div>
  );
}
