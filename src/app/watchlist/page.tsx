"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Plus, Loader2, Trash2, Share2, Globe, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/cinema/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Watchlist {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  is_shared: boolean;
  share_token: string | null;
  is_published: boolean;
  item_count: number;
}

interface WatchlistItem {
  id: string;
  tmdb_id: number;
  media_type: string;
  status: string;
  user_rating: number | null;
  added_at: string;
}

type StatusFilter = "all" | "want_to_watch" | "watching" | "watched" | "dropped";

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<readonly Watchlist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<readonly WatchlistItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadWatchlists = useCallback(async () => {
    const res = await fetch("/api/watchlists");
    const data = await res.json();
    setWatchlists(data.watchlists || []);
    if (!selectedId && data.watchlists?.length > 0) {
      setSelectedId(data.watchlists[0].id);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { loadWatchlists(); }, [loadWatchlists]);

  useEffect(() => {
    if (!selectedId) return;
    setItemsLoading(true);
    fetch(`/api/watchlists/${selectedId}/items`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setItemsLoading(false));
  }, [selectedId]);

  const createWatchlist = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    setShowCreate(false);
    setCreating(false);
    await loadWatchlists();
  };

  const deleteWatchlist = async (id: string) => {
    if (!confirm("Delete this watchlist?")) return;
    await fetch(`/api/watchlists/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    await loadWatchlists();
  };

  const toggleShare = async (id: string) => {
    await fetch(`/api/watchlists/${id}/share`, { method: "PUT" });
    await loadWatchlists();
  };

  const togglePublish = async (id: string) => {
    await fetch(`/api/watchlists/${id}/publish`, { method: "PUT" });
    await loadWatchlists();
  };

  const updateItemStatus = async (tmdbId: number, mediaType: string, status: string) => {
    await fetch(`/api/items/${tmdbId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: mediaType, status }),
    });
    setItems((prev) => prev.map((item) => item.tmdb_id === tmdbId ? { ...item, status } : item));
  };

  const removeItem = async (tmdbId: number, mediaType: string) => {
    await fetch(`/api/items/${tmdbId}?type=${mediaType}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.tmdb_id !== tmdbId));
  };

  const filteredItems = statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter);

  const selectedWatchlist = watchlists.find((w) => w.id === selectedId);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Watchlists</h1>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />New Watchlist
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-muted/30 rounded-xl border">
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createWatchlist()}
              placeholder="Watchlist name..."
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <Button size="sm" onClick={createWatchlist} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Watchlist tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {watchlists.map((wl) => (
          <button
            key={wl.id}
            onClick={() => setSelectedId(wl.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selectedId === wl.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {wl.name}
            <span className="ml-1.5 opacity-60">({wl.item_count})</span>
          </button>
        ))}
      </div>

      {selectedWatchlist && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => toggleShare(selectedWatchlist.id)} className="gap-2 text-xs">
            <Share2 className="h-3.5 w-3.5" />
            {selectedWatchlist.is_shared ? "Disable Sharing" : "Enable Sharing"}
          </Button>
          {selectedWatchlist.is_shared && selectedWatchlist.share_token && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/shared/${selectedWatchlist.share_token}`)}
            >
              Copy Share Link
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => togglePublish(selectedWatchlist.id)} className="gap-2 text-xs">
            <Globe className="h-3.5 w-3.5" />
            {selectedWatchlist.is_published ? "Unpublish" : "Publish"}
          </Button>
          {!selectedWatchlist.is_default && (
            <Button variant="ghost" size="sm" onClick={() => deleteWatchlist(selectedWatchlist.id)} className="gap-2 text-xs text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />Delete
            </Button>
          )}

          {/* Status filter */}
          <div className="ml-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="want_to_watch">Want to Watch</SelectItem>
                <SelectItem value="watching">Watching</SelectItem>
                <SelectItem value="watched">Watched</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {itemsLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Film className="h-12 w-12 mb-3 opacity-50" />
          <p>No items in this watchlist</p>
          <p className="text-sm mt-1">Browse movies and TV shows to add them</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <WatchlistItemCard
              key={item.id}
              item={item}
              onStatusChange={updateItemStatus}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistItemCard({
  item,
  onStatusChange,
  onRemove,
}: {
  item: WatchlistItem;
  onStatusChange: (tmdbId: number, mediaType: string, status: string) => void;
  onRemove: (tmdbId: number, mediaType: string) => void;
}) {
  const [tmdbData, setTmdbData] = useState<{ title?: string; name?: string; poster_path?: string | null } | null>(null);

  useEffect(() => {
    fetch(`/api/tmdb/${item.media_type}/${item.tmdb_id}`)
      .then((r) => r.json())
      .then((d) => setTmdbData(d))
      .catch(() => {});
  }, [item.tmdb_id, item.media_type]);

  const title = tmdbData?.title || tmdbData?.name || `ID ${item.tmdb_id}`;
  const poster = tmdbData?.poster_path;

  return (
    <div className="group relative">
      <a href={`/${item.media_type}/${item.tmdb_id}`} className="block">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-2">
          {poster ? (
            <Image
              src={`/api/tmdb/image/t/p/w342${poster}`}
              alt={title}
              fill
              className="object-cover"
              sizes="200px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">{title}</div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); onRemove(item.tmdb_id, item.media_type); }}
            className="absolute top-1.5 right-1.5 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3 w-3 text-white" />
          </button>
        </div>
      </a>
      <p className="text-xs font-medium line-clamp-1 mb-1">{title}</p>
      <StatusBadge status={item.status as "want_to_watch" | "watching" | "watched" | "dropped"} className="text-[10px] px-1.5 py-0" />
      <Select
        value={item.status}
        onValueChange={(v) => onStatusChange(item.tmdb_id, item.media_type, v)}
      >
        <SelectTrigger className="w-full h-7 text-[10px] mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="want_to_watch">Want to Watch</SelectItem>
          <SelectItem value="watching">Watching</SelectItem>
          <SelectItem value="watched">Watched</SelectItem>
          <SelectItem value="dropped">Dropped</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
