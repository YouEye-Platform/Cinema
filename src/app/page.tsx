"use client";

import { useState, useEffect } from "react";
import { Loader2, Film } from "lucide-react";
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

interface SectionData {
  readonly title: string;
  readonly path: string;
  readonly mediaType: "movie" | "tv";
}

const SECTIONS: readonly SectionData[] = [
  { title: "Trending Today", path: "/api/tmdb/trending/all/day", mediaType: "movie" },
  { title: "Popular Movies", path: "/api/tmdb/movie/popular", mediaType: "movie" },
  { title: "Popular TV Shows", path: "/api/tmdb/tv/popular", mediaType: "tv" },
  { title: "Top Rated Movies", path: "/api/tmdb/movie/top_rated", mediaType: "movie" },
  { title: "Upcoming Movies", path: "/api/tmdb/movie/upcoming", mediaType: "movie" },
];

function useSection(path: string) {
  const [data, setData] = useState<readonly TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(path)
      .then((r) => r.json())
      .then((d) => setData(d.results || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [path]);

  return { data, loading };
}

export default function HomePage() {
  const trending = useSection("/api/tmdb/trending/all/day");
  const popularMovies = useSection("/api/tmdb/movie/popular");
  const popularTV = useSection("/api/tmdb/tv/popular");
  const topRated = useSection("/api/tmdb/movie/top_rated");
  const upcoming = useSection("/api/tmdb/movie/upcoming");

  // Pick a random trending item for the hero
  const hero = trending.data.length > 0
    ? trending.data[Math.floor(Math.random() * Math.min(5, trending.data.length))]
    : null;

  return (
    <div>
      {/* Hero — full-width, no container constraint */}
      {trending.loading ? (
        <div className="w-full h-[400px] bg-muted flex items-center justify-center">
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
        <div className="w-full h-[200px] bg-muted flex items-center justify-center">
          <Film className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Sections — constrained */}
      <div className="px-4 md:px-6 py-6 max-w-screen-2xl mx-auto space-y-8">
        <CarouselSection
          title="Trending Today"
          items={trending.data}
          loading={trending.loading}
          getMediaType={(item) => item.media_type === "tv" ? "tv" : "movie"}
        />
        <CarouselSection
          title="Popular Movies"
          items={popularMovies.data}
          loading={popularMovies.loading}
          getMediaType={() => "movie"}
        />
        <CarouselSection
          title="Popular TV Shows"
          items={popularTV.data}
          loading={popularTV.loading}
          getMediaType={() => "tv"}
        />
        <CarouselSection
          title="Top Rated Movies"
          items={topRated.data}
          loading={topRated.loading}
          getMediaType={() => "movie"}
        />
        <CarouselSection
          title="Upcoming Movies"
          items={upcoming.data}
          loading={upcoming.loading}
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
}: {
  title: string;
  items: readonly TMDBResult[];
  loading: boolean;
  getMediaType: (item: TMDBResult) => "movie" | "tv";
}) {
  if (loading) {
    return (
      <div>
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

  if (items.length === 0) return null;

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
