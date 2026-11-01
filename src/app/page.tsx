"use client";
import { useTranslations as useInterfaceTranslations } from "next-intl";


import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Film, ArrowUpRight, RefreshCw, AlertCircle } from "lucide-react";
import { MovieCard } from "@/components/cinema/movie-card";
import { HeroSection } from "@/components/cinema/hero-section";
import { Carousel } from "@/components/cinema/carousel";

interface TMDBResult {
  readonly id: number;
  readonly title?: string;
  readonly name?: string;
  readonly poster_path: string | null;
  readonly backdrop_path: string | null;
  readonly vote_average: number;
  readonly release_date?: string;
  readonly first_air_date?: string;
  readonly overview: string;
  readonly media_type?: string;
}

function useSection(path: string) {
  const translateInterface = useInterfaceTranslations("interface");
  const [data, setData] = useState<readonly TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(path, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (!controller.signal.aborted) setError(translateInterface("uxCollectionUnavailable"));
          return;
        }
        const result = await response.json();
        if (result.error) {
          if (!controller.signal.aborted) setError(translateInterface("uxProviderUnavailable"));
          return;
        }
        if (!controller.signal.aborted) setData(result.results || []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(translateInterface("uxCollectionLoadFailed"));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, attempt, translateInterface]);
  return { data, loading, error, retry: () => setAttempt((value) => value + 1) };
}

export default function HomePage() {
  const translateInterface = useInterfaceTranslations("interface");

  const trending = useSection("/api/tmdb/trending/all/day");
  const popularMovies = useSection("/api/tmdb/movie/popular");
  const popularTV = useSection("/api/tmdb/tv/popular");
  const topRated = useSection("/api/tmdb/movie/top_rated");
  const upcoming = useSection("/api/tmdb/movie/upcoming");

  // Keep the featured title stable while the person browses.
  const hero = trending.data.length > 0
    ? trending.data[0]
    : null;

  return (
    <div className="cinema-workspace">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-sm text-muted-foreground">{translateInterface("uxDiscoveryIntroduction")}</p><h1 className="text-3xl font-semibold tracking-tight">{translateInterface("uxDiscover")}</h1></div>
        <Link href="/watchlist" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium">{translateInterface("uxYourWatchlists")}<ArrowUpRight className="h-4 w-4" /></Link>
      </div>
      {/* Artwork stays with its title and an explicit details action. */}
      {trending.loading ? (
        <div role="status" aria-label={translateInterface("uxLoadingFeaturedTitle")} className="w-full h-80 rounded-2xl bg-muted flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : hero ? (
        <HeroSection
          id={hero.id}
          mediaType={(hero.media_type === "tv" ? "tv" : "movie") as "movie" | "tv"}
          title={hero.title || hero.name || ""}
          overview={hero.overview}
          backdropPath={hero.backdrop_path}
          year={(hero.release_date || hero.first_air_date || "").slice(0, 4)}
          rating={hero.vote_average}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8">
          <Film className="mb-4 h-8 w-8 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">{translateInterface("uxFindSomethingToWatch")}</h2>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">{trending.error || translateInterface("uxWatchlistIntroduction")}</p>
          <Link href="/settings" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{translateInterface("uxCinemaSettings")}</Link>
        </div>
      )}

      {/* Sections — constrained */}
      <div className="py-8 space-y-10">
        <CarouselSection
          title={translateInterface("m273c67034998")}
          items={trending.data}
          loading={trending.loading}
          error={trending.error}
          onRetry={trending.retry}
          getMediaType={(item) => item.media_type === "tv" ? "tv" : "movie"}
        />
        <CarouselSection
          title={translateInterface("m899067e88026")}
          items={popularMovies.data}
          loading={popularMovies.loading}
          error={popularMovies.error}
          onRetry={popularMovies.retry}
          getMediaType={() => "movie"}
        />
        <CarouselSection
          title={translateInterface("m9500b14e3e05")}
          items={popularTV.data}
          loading={popularTV.loading}
          error={popularTV.error}
          onRetry={popularTV.retry}
          getMediaType={() => "tv"}
        />
        <CarouselSection
          title={translateInterface("m9603852f6be0")}
          items={topRated.data}
          loading={topRated.loading}
          error={topRated.error}
          onRetry={topRated.retry}
          getMediaType={() => "movie"}
        />
        <CarouselSection
          title={translateInterface("m305b2492ef37")}
          items={upcoming.data}
          loading={upcoming.loading}
          error={upcoming.error}
          onRetry={upcoming.retry}
          getMediaType={() => "movie"}
        />
      </div>
    </div>
  );
}

function CarouselSection({
  title,
  items,
  loading,
  getMediaType,
  error,
  onRetry,
}: {
  title: string;
  items: readonly TMDBResult[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  getMediaType: (item: TMDBResult) => "movie" | "tv";
}) {
  const translateInterface = useInterfaceTranslations("interface");
  if (loading) {
    return (
      <div className="overflow-hidden" role="status" aria-label={translateInterface("uxLoadingCollection", { title })}>
        <div className="h-6 w-48 bg-muted rounded mb-3 animate-pulse" />
        <div className="flex gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-36 flex-shrink-0">
              <div className="aspect-[2/3] bg-muted rounded-lg animate-pulse mb-2" />
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return (
    <section className="rounded-xl border border-border bg-card p-5" aria-label={title}>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p role="alert" className="flex items-start gap-2 text-sm text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>
      <button onClick={onRetry} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium"><RefreshCw className="h-4 w-4" />{translateInterface("uxTryAgain")}</button>
    </section>
  );
  if (items.length === 0) return <section><h2 className="mb-2 text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{translateInterface("uxEmptyCollection")}</p></section>;

  return (
    <Carousel title={title}>
      {items.map((item) => (
        <MovieCard
          key={item.id}
          id={item.id}
          mediaType={getMediaType(item)}
          title={item.title || item.name || ""}
          posterPath={item.poster_path}
          year={(item.release_date || item.first_air_date || "").slice(0, 4)}
          rating={item.vote_average}
        />
      ))}
    </Carousel>
  );
}
