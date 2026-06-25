"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Loader2, Film, Tv, User } from "lucide-react";
import Image from "next/image";

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
  known_for_department?: string;
}

export function HeaderSearch() {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<readonly SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      const items = data.results || [];
      setResults(items);
      setOpen(items.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setValue(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => handleSearch(q), 300);
    },
    [handleSearch]
  );

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const movies = results.filter((r) => r.media_type === "movie");
  const tv = results.filter((r) => r.media_type === "tv");
  const people = results.filter((r) => r.media_type === "person");

  return (
    <div ref={containerRef} className="relative flex-1 mx-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search movies, TV shows, people..."
          className="w-full pl-9 pr-10 py-1.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown results */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl max-h-[70vh] overflow-y-auto z-[100]">
          {movies.length > 0 && (
            <ResultSection icon={<Film className="h-3.5 w-3.5" />} label="Movies">
              {movies.slice(0, 5).map((item) => (
                <ResultItem
                  key={item.id}
                  href={`/movie/${item.id}`}
                  imagePath={item.poster_path ? `/api/tmdb/image/t/p/w92${item.poster_path}` : null}
                  title={item.title || ""}
                  subtitle={(item.release_date || "").slice(0, 4)}
                  rating={item.vote_average}
                  onClick={() => { setOpen(false); setValue(""); }}
                />
              ))}
            </ResultSection>
          )}

          {tv.length > 0 && (
            <ResultSection icon={<Tv className="h-3.5 w-3.5" />} label="TV Shows">
              {tv.slice(0, 5).map((item) => (
                <ResultItem
                  key={item.id}
                  href={`/tv/${item.id}`}
                  imagePath={item.poster_path ? `/api/tmdb/image/t/p/w92${item.poster_path}` : null}
                  title={item.name || ""}
                  subtitle={(item.first_air_date || "").slice(0, 4)}
                  rating={item.vote_average}
                  onClick={() => { setOpen(false); setValue(""); }}
                />
              ))}
            </ResultSection>
          )}

          {people.length > 0 && (
            <ResultSection icon={<User className="h-3.5 w-3.5" />} label="People">
              {people.slice(0, 5).map((item) => (
                <ResultItem
                  key={item.id}
                  href={`/person/${item.id}`}
                  imagePath={item.profile_path ? `/api/tmdb/image/t/p/w92${item.profile_path}` : null}
                  title={item.name || ""}
                  subtitle={item.known_for_department || ""}
                  onClick={() => { setOpen(false); setValue(""); }}
                />
              ))}
            </ResultSection>
          )}

          {results.length > 0 && (
            <a
              href={`/search?q=${encodeURIComponent(value)}`}
              className="block text-center text-sm text-muted-foreground hover:text-foreground py-2.5 border-t border-border transition-colors"
              onClick={() => { setOpen(false); }}
            >
              View all results
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultItem({
  href,
  imagePath,
  title,
  subtitle,
  rating,
  onClick,
}: {
  href: string;
  imagePath: string | null;
  title: string;
  subtitle: string;
  rating?: number;
  onClick: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
    >
      {imagePath ? (
        <div className="relative w-8 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
          <Image src={imagePath} alt={title} fill className="object-cover" sizes="32px" />
        </div>
      ) : (
        <div className="w-8 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <Film className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {subtitle && <span>{subtitle}</span>}
          {rating != null && rating > 0 && <span>★ {rating.toFixed(1)}</span>}
        </div>
      </div>
    </a>
  );
}
