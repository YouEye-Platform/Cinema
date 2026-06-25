/**
 * BrandedAppTitle — Renders an app title with pre-computed branding CSS.
 *
 * Receives CSS properties from the header config API (computed server-side
 * from the app's SiteNameStyle). Handles font loading and per-character shapes.
 */

"use client";

import { useEffect } from "react";

interface BrandedAppTitleProps {
  name: string;
  css: React.CSSProperties;
  fontUrl?: string | null;
  charTransforms?: string[] | null;
}

export function BrandedAppTitle({ name, css, fontUrl, charTransforms }: BrandedAppTitleProps) {
  useEffect(() => {
    if (!fontUrl) return;
    const id = `branded-font-${name}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }, [fontUrl, name]);

  if (charTransforms && charTransforms.length > 0) {
    return (
      <span style={{ ...css, display: "inline-flex", alignItems: "baseline" }}>
        {name.split("").map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: charTransforms[i] ?? undefined,
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </span>
    );
  }

  return <span style={css}>{name}</span>;
}
