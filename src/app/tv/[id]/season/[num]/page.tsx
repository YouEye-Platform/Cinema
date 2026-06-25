"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number | null;
}

interface Season {
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episodes: Episode[];
}

export default function SeasonPage({ params }: { params: Promise<{ id: string; num: string }> }) {
  const { id, num } = use(params);
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tmdb/tv/${id}/season/${num}`)
      .then((r) => r.json())
      .then((d) => setSeason(d))
      .finally(() => setLoading(false));
  }, [id, num]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!season) return <div className="p-6 text-center text-muted-foreground">Season not found</div>;

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <a href={`/tv/${id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to show
      </a>

      <div className="flex gap-6 mb-8">
        {season.poster_path && (
          <div className="relative w-32 aspect-[2/3] rounded-xl overflow-hidden flex-shrink-0">
            <Image src={`/api/tmdb/image/t/p/w342${season.poster_path}`} alt={season.name} fill className="object-cover" sizes="128px" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold mb-2">{season.name}</h1>
          <p className="text-muted-foreground text-sm">{season.air_date?.slice(0, 4)} • {season.episodes?.length} episodes</p>
          {season.overview && <p className="text-sm leading-relaxed mt-3">{season.overview}</p>}
        </div>
      </div>

      <div className="space-y-3">
        {(season.episodes || []).map((ep) => (
          <div key={ep.id} className="flex gap-4 p-4 bg-muted/20 rounded-xl border border-border/40">
            {ep.still_path && (
              <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                <Image src={`/api/tmdb/image/t/p/w300${ep.still_path}`} alt={ep.name} fill className="object-cover" sizes="128px" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-medium">
                  <span className="text-muted-foreground text-sm mr-1">E{ep.episode_number}</span>
                  {ep.name}
                </h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{ep.runtime ? `${ep.runtime}m` : ""}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{ep.air_date}</p>
              {ep.overview && <p className="text-sm text-muted-foreground line-clamp-2">{ep.overview}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
