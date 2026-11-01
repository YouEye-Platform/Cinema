"use client";


import { useTranslations as useInterfaceTranslations } from "next-intl";
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
  const translateInterface = useInterfaceTranslations("interface");

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
        <label className="text-sm font-medium mb-1 block">{translateInterface("me02bce4b378f")}</label>
        <RatingStars value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">{translateInterface("maff0766a5290")}</label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder={translateInterface("mdef1ebe1f1af")}
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
        {saved ? translateInterface("med9b760289e6") : translateInterface("m66d3a3ed8cd5")}
      </Button>
    </div>
  );
}
