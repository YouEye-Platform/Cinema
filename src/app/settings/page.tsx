"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CinemaSettingsPanel } from "./settings-panel";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <CinemaSettingsPanel />
    </Suspense>
  );
}
