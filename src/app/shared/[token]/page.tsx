"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { Loader2, Film, Lock } from "lucide-react";
import { StatusBadge } from "@/components/cinema/status-badge";

interface SharedItem {
  tmdb_id: number;
  media_type: string;
  status: string;
  user_rating: number | null;
}

interface SharedWatchlist {
  name: string;
  description: string;
  user_id: string;
}

export default function SharedWatchlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [watchlist, setWatchlist] = useState<SharedWatchlist | null>(null);
  const [items, setItems] = useState<readonly SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/shared/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => {
        setWatchlist(d.watchlist);
        setItems(d.items || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-muted-foreground">
        <Lock className="h-12 w-12 mb-3 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Watchlist Not Found</h2>
        <p className="text-sm">This watchlist may have been removed or sharing was disabled.</p>
      </div>
    );
  }

  if (!watchlist) return null;

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{watchlist.name}</h1>
        {watchlist.description && <p className="text-muted-foreground">{watchlist.description}</p>}
        <p className="text-sm text-muted-foreground mt-2">{items.length} items</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Film className="h-12 w-12 mb-3 opacity-50" />
          <p>This watchlist is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item, index) => (
            <SharedItemCard key={index} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function SharedItemCard({ item }: { item: SharedItem }) {
  const [tmdb, setTmdb] = useState<{ title?: string; name?: string; poster_path?: string | null } | null>(null);

  useEffect(() => {
    fetch(`/api/tmdb/${item.media_type}/${item.tmdb_id}`)
      .then((r) => r.json())
      .then((d) => setTmdb(d))
      .catch(() => {});
  }, [item.tmdb_id, item.media_type]);

  const title = tmdb?.title || tmdb?.name || `ID ${item.tmdb_id}`;

  return (
    <a href={`/${item.media_type}/${item.tmdb_id}`} className="block group">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-2">
        {tmdb?.poster_path ? (
          <Image src={`/api/tmdb/image/t/p/w342${tmdb.poster_path}`} alt={title} fill className="object-cover" sizes="200px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">{title}</div>
        )}
      </div>
      <p className="text-xs font-medium line-clamp-1 mb-1">{title}</p>
      <StatusBadge status={item.status as "want_to_watch" | "watching" | "watched" | "dropped"} className="text-[10px] px-1.5" />
    </a>
  );
}
