"use client";

import { useEffect, useRef } from "react";

// Autoplaying, muted, looping hero clip. `muted` is set imperatively because a
// JSX `muted` attribute isn't reliably applied as the DOM property, which some
// browsers require before they'll allow muted autoplay.
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      /* autoplay blocked — the poster frame stays visible */
    });
  }, []);

  return (
    <div className="bh-imgslot" style={{ aspectRatio: "16/9" }}>
      <video
        ref={ref}
        className="bh-hero__video"
        src="/bierhaul/bierhaul_ad.webm"
        poster="/bierhaul/thepour.webp"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Bierhaul promo video"
      />
    </div>
  );
}
