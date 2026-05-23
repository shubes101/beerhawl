"use client";

import { useEffect, useState } from "react";

type Tab = { id: string; label: string };

export function MenusTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  // Honor a #hash on load (e.g. arriving from a home menu link).
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && tabs.some((t) => t.id === hash)) {
      setActive(hash);
      const el = document.getElementById(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    const els = tabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tabs]);

  function go(id: string) {
    setActive(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <div className="bh-tabs" role="tablist" aria-label="Menu sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`bh-tab ${active === t.id ? "is-active" : ""}`}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => go(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
