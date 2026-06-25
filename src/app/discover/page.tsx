"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { MovieCard } from "@/components/cinema/movie-card";
import { FilterPanel } from "@/components/cinema/filter-panel";
import { Button } from "@/components/ui/button";

interface DiscoverResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

interface Genre {
  id: number;
  name: string;
}

export default function DiscoverPage() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [genres, setGenres] = useState<readonly Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [minRating, setMinRating] = useState("0");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<readonly DiscoverResult[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Load genres
  useEffect(() => {
    fetch(`/api/tmdb/genre/${mediaType}/list`)
      .then((r) => r.json())
      .then((d) => setGenres(d.genres || []));
    setSelectedGenre("all");
    setPage(1);
  }, [mediaType]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort_by: sortBy, page: String(page), vote_count_gte: "50" });
      if (selectedGenre !== "all") params.set("with_genres", selectedGenre);
      if (minRating !== "0") params.set("vote_average_gte", minRating);

      const res = await fetch(`/api/tmdb/discover/${mediaType}?${params.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotalPages(Math.min(data.total_pages || 1, 500));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [mediaType, selectedGenre, sortBy, minRating, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-bold mb-6">Discover</h1>

      <FilterPanel
        mediaType={mediaType}
        onMediaTypeChange={(t) => { setMediaType(t); setPage(1); }}
        genres={genres}
        selectedGenre={selectedGenre}
        onGenreChange={(g) => { setSelectedGenre(g); setPage(1); }}
        sortBy={sortBy}
        onSortByChange={(s) => { setSortBy(s); setPage(1); }}
        minRating={minRating}
        onMinRatingChange={(r) => { setMinRating(r); setPage(1); }}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {results.map((item) => (
              <MovieCard
                key={item.id}
                id={item.id}
                mediaType={mediaType}
                title={item.title || item.name || ""}
                posterPath={item.poster_path}
                year={(item.release_date || item.first_air_date || "").slice(0, 4)}
                rating={item.vote_average}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
