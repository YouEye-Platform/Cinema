"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingStars } from "./rating-stars";

interface ReviewEditorProps {
  readonly tmdbId: number;
  readonly mediaType: "movie" | "tv";
  readonly initialRating?: number | null;
  readonly initialReview?: string;
  readonly onSaved?: () => void;
}

export function ReviewEditor({ tmdbId, mediaType, initialRating = null, initialReview = "", onSaved }: ReviewEditorProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [review, setReview] = useState(initialReview);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/items/${tmdbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: mediaType,
          user_rating: rating,
          review_text: review,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium mb-1 block">Your Rating</label>
        <RatingStars value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Review</label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Write your thoughts..."
          rows={4}
          className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring resize-none placeholder:text-muted-foreground"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="gap-2"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saved ? "Saved!" : "Save Review"}
      </Button>
    </div>
  );
}
