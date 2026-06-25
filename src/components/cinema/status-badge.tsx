import { cn } from "@/lib/utils";

type WatchStatus = "want_to_watch" | "watching" | "watched" | "dropped";

interface StatusBadgeProps {
  readonly status: WatchStatus;
  readonly className?: string;
}

const STATUS_CONFIG: Record<WatchStatus, { label: string; className: string }> = {
  want_to_watch: { label: "Want to Watch", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  watching: { label: "Watching", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  watched: { label: "Watched", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  dropped: { label: "Dropped", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.want_to_watch;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
