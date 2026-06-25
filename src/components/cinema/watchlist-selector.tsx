"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Watchlist {
  readonly id: string;
  readonly name: string;
  readonly is_default: boolean;
}

interface WatchlistSelectorProps {
  readonly tmdbId: number;
  readonly mediaType: "movie" | "tv";
  readonly title: string;
}

export function WatchlistSelector({ tmdbId, mediaType, title }: WatchlistSelectorProps) {
  const [open, setOpen] = useState(false);
  const [watchlists, setWatchlists] = useState<readonly Watchlist[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/watchlists")
      .then((r) => r.json())
      .then((d) => setWatchlists(d.watchlists || []))
      .catch(() => {});
  }, [open]);

  const addToWatchlist = async (watchlistId: string) => {
    setLoading(true);
    try {
      await fetch(`/api/watchlists/${watchlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType }),
      });
      setAdded((prev) => new Set([...prev, watchlistId]));
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add to Watchlist
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-56 bg-popover border rounded-lg shadow-lg z-50 p-2">
            <p className="text-xs text-muted-foreground px-2 py-1 mb-1 truncate">
              Adding: {title}
            </p>
            {watchlists.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No watchlists</p>
            ) : (
              watchlists.map((wl) => (
                <button
                  key={wl.id}
                  onClick={() => addToWatchlist(wl.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <span className="truncate">{wl.name}</span>
                  {added.has(wl.id) ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : loading ? (
                    <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
