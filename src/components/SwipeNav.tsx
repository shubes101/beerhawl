"use client";

// Mobile-only left/right swipe navigation across the primary pages.
// Renders nothing; attaches passive touch listeners so it never blocks scrolling.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const ORDER = ["/", "/menus", "/events", "/stay", "/leaderboard", "/contact"];

function indexFor(pathname: string): number {
  if (pathname === "/") return 0;
  const i = ORDER.findIndex((p) => p !== "/" && pathname.startsWith(p));
  return i === -1 ? 0 : i;
}

export function SwipeNav() {
  const pathname = usePathname();
  const router = useRouter();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const isMobile = () => window.matchMedia("(max-width: 760px)").matches;

    function onStart(e: TouchEvent) {
      if (!isMobile() || e.touches.length !== 1) {
        start.current = null;
        return;
      }
      const target = e.target as HTMLElement | null;
      // Don't capture swipes inside horizontally-scrollable UI or form fields.
      if (target?.closest(".bh-tabs, input, textarea, select")) {
        start.current = null;
        return;
      }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    }

    function onEnd(e: TouchEvent) {
      const s = start.current;
      start.current = null;
      if (!s) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;

      if (Date.now() - s.t > 800) return; // too slow to be a swipe
      if (Math.abs(dx) < 70) return; // too short
      if (Math.abs(dx) < Math.abs(dy) * 1.7) return; // mostly vertical → let it scroll

      const idx = indexFor(pathname);
      if (dx < 0 && idx < ORDER.length - 1) router.push(ORDER[idx + 1]);
      else if (dx > 0 && idx > 0) router.push(ORDER[idx - 1]);
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pathname, router]);

  return null;
}
