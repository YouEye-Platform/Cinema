"use client";


import { useTranslations as useInterfaceTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Genre {
  readonly id: number;
  readonly name: string;
}

interface FilterPanelProps {
  readonly mediaType: "movie" | "tv";
  readonly onMediaTypeChange: (type: "movie" | "tv") => void;
  readonly genres: readonly Genre[];
  readonly selectedGenre: string;
  readonly onGenreChange: (genreId: string) => void;
  readonly sortBy: string;
  readonly onSortByChange: (sort: string) => void;
  readonly minRating: string;
  readonly onMinRatingChange: (rating: string) => void;
}

export function FilterPanel({
  mediaType,
  onMediaTypeChange,
  genres,
  selectedGenre,
  onGenreChange,
  sortBy,
  onSortByChange,
  minRating,
  onMinRatingChange,
}: FilterPanelProps) {
  const translateInterface = useInterfaceTranslations("interface");

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Media Type */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          onClick={() => onMediaTypeChange("movie")}
          className={`px-3 py-1.5 text-sm transition-colors ${
            mediaType === "movie"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          {translateInterface("mdff924b69f96")}</button>
        <button
          onClick={() => onMediaTypeChange("tv")}
          className={`px-3 py-1.5 text-sm transition-colors ${
            mediaType === "tv"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          {translateInterface("m6adcc6960b86")}</button>
      </div>

      {/* Genre */}
      <Select value={selectedGenre} onValueChange={onGenreChange}>
        <SelectTrigger className="w-40 h-9">
          <SelectValue placeholder={translateInterface("m90009547165f")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{translateInterface("m90009547165f")}</SelectItem>
          {genres.map((g) => (
            <SelectItem key={g.id} value={String(g.id)}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort By */}
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-44 h-9">
          <SelectValue placeholder={translateInterface("mc9129025bd3f")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="popularity.desc">{translateInterface("mfe60d8511c44")}</SelectItem>
          <SelectItem value="vote_average.desc">{translateInterface("m9f29530464f7")}</SelectItem>
          <SelectItem value="release_date.desc">{translateInterface("m1fb0ecfb5d03")}</SelectItem>
          <SelectItem value="revenue.desc">{translateInterface("mc4b7330bd91e")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Min Rating */}
      <Select value={minRating} onValueChange={onMinRatingChange}>
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder={translateInterface("md3769b07b54d")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">{translateInterface("mbbf585b86efc")}</SelectItem>
          <SelectItem value="5">5+ / 10</SelectItem>
          <SelectItem value="6">6+ / 10</SelectItem>
          <SelectItem value="7">7+ / 10</SelectItem>
          <SelectItem value="8">8+ / 10</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
