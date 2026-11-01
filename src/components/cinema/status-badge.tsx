import { useTranslations as useInterfaceTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type WatchStatus = "want_to_watch" | "watching" | "watched" | "dropped";

interface StatusBadgeProps {
  readonly status: WatchStatus;
  readonly className?: string;
}

const STATUS_CONFIG: Record<WatchStatus, { labelKey: string; className: string }> = {
  want_to_watch: { labelKey: "m02e740aaf70d", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  watching: { labelKey: "mfbc594054d51", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  watched: { labelKey: "m1ca8c1c0de6f", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  dropped: { labelKey: "m739f68fe97ad", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const translateInterface = useInterfaceTranslations("interface");
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.want_to_watch;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {translateInterface(config.labelKey)}
    </span>
  );
}
