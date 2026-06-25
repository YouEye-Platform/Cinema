"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MovieCard } from "@/components/cinema/movie-card";
import { PersonCard } from "@/components/cinema/person-card";
import { SearchInput } from "@/components/cinema/search-input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SearchResult {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  poster_path: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  known_for_department?: string;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<readonly SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    doSearch(q);
  }, [doSearch]);

  // Auto-search if ?q= is present
  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery, doSearch]);

  const movies = results.filter((r) => r.media_type === "movie");
  const tv = results.filter((r) => r.media_type === "tv");
  const people = results.filter((r) => r.media_type === "person");

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      <SearchInput
        onSearch={handleSearch}
        loading={loading}
        placeholder="Search movies, TV shows, people..."
        className="max-w-xl mb-6"
        initialValue={initialQuery}
      />

      {query && !loading && results.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No results found for &ldquo;{query}&rdquo;</p>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {results.length > 0 && (
        <Tabs defaultValue="movies">
          <TabsList className="mb-6">
            <TabsTrigger value="movies">Movies ({movies.length})</TabsTrigger>
            <TabsTrigger value="tv">TV Shows ({tv.length})</TabsTrigger>
            <TabsTrigger value="people">People ({people.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="movies">
            {movies.length === 0 ? (
              <p className="text-muted-foreground">No movies found</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {movies.map((item) => (
                  <MovieCard
                    key={item.id}
                    id={item.id}
                    mediaType="movie"
                    title={item.title || ""}
                    posterPath={item.poster_path}
                    year={(item.release_date || "").slice(0, 4)}
                    rating={item.vote_average || null}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tv">
            {tv.length === 0 ? (
              <p className="text-muted-foreground">No TV shows found</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {tv.map((item) => (
                  <MovieCard
                    key={item.id}
                    id={item.id}
                    mediaType="tv"
                    title={item.name || ""}
                    posterPath={item.poster_path}
                    year={(item.first_air_date || "").slice(0, 4)}
                    rating={item.vote_average || null}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="people">
            {people.length === 0 ? (
              <p className="text-muted-foreground">No people found</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {people.map((person) => (
                  <PersonCard
                    key={person.id}
                    id={person.id}
                    name={person.name || ""}
                    profilePath={person.profile_path || null}
                    department={person.known_for_department}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
