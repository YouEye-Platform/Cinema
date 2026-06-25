"use client";

import { useState, useEffect } from "react";
import { Loader2, Globe } from "lucide-react";

interface PublishedWatchlist {
  id: string;
  name: string;
  description: string;
  user_id: string;
  share_token: string | null;
  item_count: number;
}

export default function BrowseWatchlistsPage() {
  const [watchlists, setWatchlists] = useState<readonly PublishedWatchlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/browse/watchlists")
      .then((r) => r.json())
      .then((d) => setWatchlists(d.watchlists || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-bold mb-2">Browse Watchlists</h1>
      <p className="text-muted-foreground mb-6">Public watchlists shared by community members</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : watchlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Globe className="h-12 w-12 mb-3 opacity-50" />
          <p>No public watchlists yet</p>
          <p className="text-sm mt-1">Publish your watchlist to appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlists.map((wl) => (
            <div key={wl.id} className="p-4 bg-muted/20 rounded-xl border border-border/40 hover:border-border transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold">{wl.name}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{wl.item_count} items</span>
              </div>
              {wl.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{wl.description}</p>
              )}
              <div className="flex gap-2">
                <a
                  href={`/watchlist/${wl.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View watchlist →
                </a>
                {wl.share_token && (
                  <a
                    href={`/shared/${wl.share_token}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Public link
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
