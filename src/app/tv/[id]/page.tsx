"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { Star, ExternalLink, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { PersonCard } from "@/components/cinema/person-card";
import { MovieCard } from "@/components/cinema/movie-card";
import { Carousel } from "@/components/cinema/carousel";
import { WatchlistSelector } from "@/components/cinema/watchlist-selector";
import { ReviewEditor } from "@/components/cinema/review-editor";
import { StatusBadge } from "@/components/cinema/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TMDBShow {
  id: number;
  name: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: Array<{ id: number; name: string }>;
  created_by: Array<{ id: number; name: string }>;
  seasons: Array<{
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    poster_path: string | null;
    air_date: string;
    overview: string;
  }>;
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
  };
  similar?: { results: Array<{ id: number; name?: string; title?: string; poster_path: string | null; first_air_date?: string; vote_average: number }> };
}

export default function TVDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [show, setShow] = useState<TMDBShow | null>(null);
  const [userItem, setUserItem] = useState<{ status?: string; user_rating?: number | null; review_text?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tmdb/tv/${id}?append_to_response=credits,similar`).then((r) => r.json()),
      fetch(`/api/items/${id}?type=tv`).then((r) => r.json()).catch(() => ({ item: null })),
    ])
      .then(([data, itemData]) => {
        setShow(data);
        setUserItem(itemData.item || null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!show) {
    return <div className="p-6 text-center text-muted-foreground">Show not found</div>;
  }

  const year = show.first_air_date?.slice(0, 4) || "";
  const episodeRuntime = show.episode_run_time?.[0] ? `${show.episode_run_time[0]}m/ep` : null;

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "tv", status }),
    });
    setUserItem((prev) => ({ ...prev, status }));
  };

  return (
    <div>
      {/* Backdrop — full-width */}
      {show.backdrop_path && (
        <div className="relative w-full h-72 md:h-96 overflow-hidden">
          <Image src={`/api/tmdb/image/t/p/w1280${show.backdrop_path}`} alt={show.name} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      {/* Content — constrained */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {show.poster_path && (
            <div className="relative w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-xl flex-shrink-0">
              <Image src={`/api/tmdb/image/t/p/w500${show.poster_path}`} alt={show.name} fill className="object-cover" sizes="176px" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-1">{show.name}</h1>
            {show.tagline && <p className="text-muted-foreground italic mb-3">{show.tagline}</p>}

            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-muted-foreground">
              {year && <span>{year}</span>}
              {episodeRuntime && <span>{episodeRuntime}</span>}
              {show.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {show.vote_average.toFixed(1)}
                </span>
              )}
              <span>{show.number_of_seasons} seasons</span>
              <span>{show.number_of_episodes} episodes</span>
              <span className={show.status === "Ended" || show.status === "Canceled" ? "text-red-400" : "text-green-400"}>{show.status}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {show.genres.map((g) => (
                <span key={g.id} className="px-2.5 py-0.5 rounded-full bg-muted text-xs">{g.name}</span>
              ))}
            </div>

            <p className="text-sm leading-relaxed mb-4">{show.overview}</p>

            {show.created_by.length > 0 && (
              <div className="text-sm mb-4">
                <span className="text-muted-foreground">Created by: </span>
                {show.created_by.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ", "}
                    <a href={`/person/${c.id}`} className="hover:text-primary transition-colors">{c.name}</a>
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-4">
              <WatchlistSelector tmdbId={show.id} mediaType="tv" title={show.name} />
              <Select value={userItem?.status || ""} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="Set Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="want_to_watch">Want to Watch</SelectItem>
                  <SelectItem value="watching">Watching</SelectItem>
                  <SelectItem value="watched">Watched</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userItem?.status && (
              <div className="mb-4">
                <StatusBadge status={userItem.status as "want_to_watch" | "watching" | "watched" | "dropped"} />
              </div>
            )}

            <div className="flex gap-3">
              <a href={`https://www.themoviedb.org/tv/${show.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="h-3 w-3" />TMDB
              </a>
            </div>
          </div>
        </div>

        {/* Review */}
        <div className="mb-8 p-4 bg-muted/30 rounded-xl">
          <h2 className="text-lg font-semibold mb-3">Your Review</h2>
          <ReviewEditor tmdbId={show.id} mediaType="tv" initialRating={userItem?.user_rating} initialReview={userItem?.review_text} />
        </div>

        {/* Seasons */}
        {show.seasons.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Seasons</h2>
            <div className="space-y-2">
              {show.seasons.filter(s => s.season_number > 0).map((season) => (
                <div key={season.id} className="border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSeason(expandedSeason === season.season_number ? null : season.season_number)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    {season.poster_path && (
                      <div className="relative w-12 aspect-[2/3] rounded overflow-hidden flex-shrink-0">
                        <Image src={`/api/tmdb/image/t/p/w92${season.poster_path}`} alt={season.name} fill className="object-cover" sizes="48px" />
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium">{season.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {season.episode_count} episodes
                        {season.air_date && ` • ${season.air_date.slice(0, 4)}`}
                      </p>
                    </div>
                    {expandedSeason === season.season_number ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {expandedSeason === season.season_number && (
                    <div className="px-4 pb-4">
                      <a
                        href={`/tv/${id}/season/${season.season_number}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View all episodes →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cast */}
        {(show.credits?.cast?.length ?? 0) > 0 && (
          <div className="mb-8">
            <Carousel title="Cast">
              {show.credits!.cast.slice(0, 20).map((person) => (
                <PersonCard key={person.id} id={person.id} name={person.name} profilePath={person.profile_path} character={person.character} />
              ))}
            </Carousel>
          </div>
        )}

        {(show.similar?.results?.length ?? 0) > 0 && (
          <Carousel title="Similar Shows">
            {show.similar!.results.slice(0, 20).map((item) => (
              <MovieCard key={item.id} id={item.id} mediaType="tv" title={item.name || item.title || ""} posterPath={item.poster_path} year={(item.first_air_date || "").slice(0, 4)} rating={item.vote_average} />
            ))}
          </Carousel>
        )}
      </div>
    </div>
  );
}
