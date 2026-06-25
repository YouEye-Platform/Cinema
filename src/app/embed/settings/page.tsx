"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CinemaSettingsPanel } from "@/app/settings/page";

export default function SettingsEmbedPage() {
  return (
    <Suspense fallback={<div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <CinemaSettingsPanel embedded />
    </Suspense>
  );
}
