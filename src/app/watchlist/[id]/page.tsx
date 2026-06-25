"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Film, ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/cinema/status-badge";

interface WatchlistItem {
  id: string;
  tmdb_id: number;
  media_type: string;
  status: string;
  user_rating: number | null;
}

interface Watchlist {
  id: string;
  name: string;
  description: string;
  user_id: string;
}

export default function WatchlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [items, setItems] = useState<readonly WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/watchlists/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setWatchlist(d.watchlist);
        setItems(d.items || []);
      })
      .catch(() => router.push("/watchlist"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!watchlist) return null;

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <button onClick={() => router.push("/watchlist")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" />Back to watchlists
      </button>

      <h1 className="text-2xl font-bold mb-1">{watchlist.name}</h1>
      {watchlist.description && <p className="text-muted-foreground mb-6">{watchlist.description}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Film className="h-12 w-12 mb-3 opacity-50" />
          <p>This watchlist is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item }: { item: WatchlistItem }) {
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
