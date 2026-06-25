"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { User, ExternalLink, Loader2 } from "lucide-react";
import { MovieCard } from "@/components/cinema/movie-card";

interface CastCredit {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: string;
  character?: string;
  department?: string;
}

interface Person {
  id: number;
  name: string;
  biography: string;
  profile_path: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  imdb_id: string | null;
  combined_credits?: {
    cast: CastCredit[];
    crew: CastCredit[];
  };
}

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tmdb/person/${id}?append_to_response=combined_credits`)
      .then((r) => r.json())
      .then((d) => setPerson(d))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!person) return <div className="p-6 text-center text-muted-foreground">Person not found</div>;

  const sortedCast = [...(person.combined_credits?.cast || [])]
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 20);

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-shrink-0">
          <div className="relative w-48 aspect-[2/3] rounded-xl overflow-hidden bg-muted">
            {person.profile_path ? (
              <Image src={`/api/tmdb/image/t/p/h632${person.profile_path}`} alt={person.name} fill className="object-cover" sizes="192px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-2">{person.name}</h1>
          <p className="text-muted-foreground mb-3">{person.known_for_department}</p>

          {person.birthday && (
            <p className="text-sm text-muted-foreground mb-2">
              Born: {person.birthday}
              {person.place_of_birth && ` in ${person.place_of_birth}`}
            </p>
          )}

          {person.biography && (
            <div className="text-sm leading-relaxed max-h-48 overflow-y-auto mb-4">
              {person.biography}
            </div>
          )}

          <div className="flex gap-3">
            <a href={`https://www.themoviedb.org/person/${person.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-3 w-3" />TMDB
            </a>
            {person.imdb_id && (
              <a href={`https://www.imdb.com/name/${person.imdb_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="h-3 w-3" />IMDB
              </a>
            )}
          </div>
        </div>
      </div>

      {sortedCast.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Known For</h2>
          <div className="flex flex-wrap gap-3">
            {sortedCast.map((credit) => (
              <MovieCard
                key={`${credit.id}-${credit.media_type}`}
                id={credit.id}
                mediaType={credit.media_type === "tv" ? "tv" : "movie"}
                title={credit.title || credit.name || ""}
                posterPath={credit.poster_path}
                year={(credit.release_date || credit.first_air_date || "").slice(0, 4)}
                rating={credit.vote_average}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
