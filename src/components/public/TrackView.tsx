"use client";
import { useEffect } from "react";

/** Records one page view per visit, with the traffic source from ?src=. */
export function TrackView({ slug, source, kind = "view" }: { slug: string; source: string | null; kind?: string }) {
  useEffect(() => {
    const key = `tv:${slug}:${kind}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked (private mode, embedded iframe): still record the view.
    }
    const body = JSON.stringify({ slug, source, kind });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/public/track", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/public/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  }, [slug, source, kind]);
  return null;
}
