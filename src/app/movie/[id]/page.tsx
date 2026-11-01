"use client";
import {useLocale as useFormatLocale} from "next-intl";

import { useLocale as useInterfaceLocale } from "next-intl";



import { useTranslations as useInterfaceTranslations } from "next-intl";
import { useState, useEffect, use } from "react";
import Image from "next/image";
import { Star, Clock, ExternalLink, Loader2 } from "lucide-react";
import { MovieCard } from "@/components/cinema/movie-card";
import { PersonCard } from "@/components/cinema/person-card";
import { Carousel } from "@/components/cinema/carousel";
import { WatchlistSelector } from "@/components/cinema/watchlist-selector";
import { ReviewEditor } from "@/components/cinema/review-editor";
import { StatusBadge } from "@/components/cinema/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TMDBMovie {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  imdb_id: string | null;
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
    crew: Array<{ id: number; name: string; job: string; profile_path: string | null }>;
  };
  similar?: { results: TMDBSimple[] };
}

interface TMDBSimple {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

interface UserItem {
  status: string;
  user_rating: number | null;
  review_text: string;
}

export default function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const formatLocale = useFormatLocale();

  const interfaceLocale = useInterfaceLocale();

  const translateInterface = useInterfaceTranslations("interface");

  const { id } = use(params);
  const [movie, setMovie] = useState<TMDBMovie | null>(null);
  const [userItem, setUserItem] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tmdb/movie/${id}?append_to_response=credits,similar`).then((r) => r.json()),
      fetch(`/api/items/${id}?type=movie`).then((r) => r.json()).catch(() => ({ item: null })),
    ])
      .then(([movieData, itemData]) => {
        setMovie(movieData);
        setUserItem(itemData.item || null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!movie) {
    return <div className="p-6 text-center text-muted-foreground">{translateInterface("ma603fddc115d")}</div>;
  }

  const year = movie.release_date?.slice(0, 4) || "";
  const runtime = movie.runtime
    ? translateInterface("m425dc6c72de6", {hours: Math.floor(movie.runtime / 60), minutes: movie.runtime % 60})
    : null;
  const director = movie.credits?.crew.find((c) => c.job === "Director");
  const writer = movie.credits?.crew.find((c) => c.job === "Writer" || c.job === "Screenplay");

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "movie", status }),
    });
    setUserItem((prev) => ({ ...(prev || { user_rating: null, review_text: "" }), status }));
  };

  return (
    <div>
      {/* Backdrop — full-width */}
      {movie.backdrop_path && (
        <div className="relative w-full h-72 md:h-96 overflow-hidden">
          <Image
            unoptimized
            src={`/api/tmdb/image/t/p/w1280${movie.backdrop_path}`}
            alt={movie.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      {/* Content — constrained */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Poster */}
          {movie.poster_path && (
            <div className="flex-shrink-0">
              <div className="relative w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-xl">
                <Image
            unoptimized
                  src={`/api/tmdb/image/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="176px"
                />
              </div>
            </div>
          )}

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-1">{movie.title}</h1>
            {movie.tagline && (
              <p className="text-muted-foreground italic mb-3">{movie.tagline}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-muted-foreground">
              {year && <span>{year}</span>}
              {runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {runtime}
                </span>
              )}
              {movie.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {new Intl.NumberFormat(formatLocale, {minimumFractionDigits: 1, maximumFractionDigits: 1}).format(movie.vote_average)} ({movie.vote_count.toLocaleString(interfaceLocale)})
                </span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.genres.map((g) => (
                <span key={g.id} className="px-2.5 py-0.5 rounded-full bg-muted text-xs">
                  {g.name}
                </span>
              ))}
            </div>

            {/* Overview */}
            <p className="text-sm leading-relaxed mb-4">{movie.overview}</p>

            {/* Crew */}
            {(director || writer) && (
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                {director && (
                  <div>
                    <span className="text-muted-foreground">{translateInterface("m29718cd4d5b9")}{" "}</span>
                    <a href={`/person/${director.id}`} className="hover:text-primary transition-colors">
                      {director.name}
                    </a>
                  </div>
                )}
                {writer && (
                  <div>
                    <span className="text-muted-foreground">{translateInterface("m9e02677b1887")}{" "}</span>
                    <a href={`/person/${writer.id}`} className="hover:text-primary transition-colors">
                      {writer.name}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* User actions */}
            <div className="flex flex-wrap gap-3 mb-4">
              <WatchlistSelector tmdbId={movie.id} mediaType="movie" title={movie.title} />
              <Select
                value={userItem?.status || ""}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder={translateInterface("m981d4cec8228")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="want_to_watch">{translateInterface("m02e740aaf70d")}</SelectItem>
                  <SelectItem value="watching">{translateInterface("mfbc594054d51")}</SelectItem>
                  <SelectItem value="watched">{translateInterface("m1ca8c1c0de6f")}</SelectItem>
                  <SelectItem value="dropped">{translateInterface("m739f68fe97ad")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userItem?.status && (
              <div className="mb-4">
                <StatusBadge status={userItem.status as "want_to_watch" | "watching" | "watched" | "dropped"} />
              </div>
            )}

            {/* External links */}
            <div className="flex gap-3">
              <a
                href={`https://www.themoviedb.org/movie/${movie.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                TMDB
              </a>
              {movie.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  IMDB
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Review */}
        <div className="mb-8 p-4 bg-muted/30 rounded-xl">
          <h2 className="text-lg font-semibold mb-3">{translateInterface("m113fcf1cbe69")}</h2>
          <ReviewEditor
            tmdbId={movie.id}
            mediaType="movie"
            initialRating={userItem?.user_rating}
            initialReview={userItem?.review_text}
          />
        </div>

        {/* Cast */}
        {(movie.credits?.cast?.length ?? 0) > 0 && (
          <div className="mb-8">
            <Carousel title={translateInterface("m150040557337")}>
              {movie.credits!.cast.slice(0, 20).map((person) => (
                <PersonCard
                  key={person.id}
                  id={person.id}
                  name={person.name}
                  profilePath={person.profile_path}
                  character={person.character}
                />
              ))}
            </Carousel>
          </div>
        )}

        {/* Similar */}
        {(movie.similar?.results?.length ?? 0) > 0 && (
          <Carousel title={translateInterface("m6595be82bc46")}>
            {movie.similar!.results.slice(0, 20).map((item) => (
              <MovieCard
                key={item.id}
                id={item.id}
                mediaType="movie"
                title={item.title || item.name || ""}
                posterPath={item.poster_path}
                year={(item.release_date || "").slice(0, 4)}
                rating={item.vote_average}
              />
            ))}
          </Carousel>
        )}
      </div>
    </div>
  );
}
