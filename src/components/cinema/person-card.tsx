"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";

interface PersonCardProps {
  readonly id: number;
  readonly name: string;
  readonly profilePath: string | null;
  readonly character?: string;
  readonly department?: string;
}

export function PersonCard({ id, name, profilePath, character, department }: PersonCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <a href={`/person/${id}`} className="group block flex-shrink-0 w-28 cursor-pointer">
      <div className="relative overflow-hidden rounded-lg bg-muted aspect-[2/3] mb-2">
        {profilePath && !imgError ? (
          <Image
            src={`/api/tmdb/image/t/p/w185${profilePath}`}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            sizes="112px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <User className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="px-0.5">
        <p className="text-xs font-medium line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {name}
        </p>
        {(character || department) && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {character || department}
          </p>
        )}
      </div>
    </a>
  );
}
