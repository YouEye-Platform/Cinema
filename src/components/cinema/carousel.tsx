"use client";
import { useTranslations as useInterfaceTranslations } from "next-intl";


import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselProps {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function Carousel({ title, children, className }: CarouselProps) {
  const translateInterface = useInterfaceTranslations("interface");

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 300;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
    setTimeout(updateScrollState, 350);
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-30 transition-all"
            aria-label={translateInterface("uxScrollCollectionLeft", { title })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-30 transition-all"
            aria-label={translateInterface("uxScrollCollectionRight", { title })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-4 overflow-x-auto scrollbar-none pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
    </div>
  );
}
