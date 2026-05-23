"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { restaurant } from "@/lib/restaurant";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Menus", href: "/menus" },
  { label: "Events", href: "/events" },
  { label: "Leaderboard", href: "/leaderboard" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);

  // Sync with the mode chosen before paint (and persisted).
  useEffect(() => {
    setDark(document.documentElement.dataset.mode !== "daybreak");
  }, []);

  // Close the drawer on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function toggleMode() {
    const next = dark ? "daybreak" : "tavern";
    document.documentElement.dataset.mode = next;
    try {
      localStorage.setItem("bh-mode", next);
    } catch {
      /* ignore */
    }
    setDark(!dark);
  }

  return (
    <header className="bh-header">
      <Link className="bh-wordmark" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bh-wordmark__mark" src="/bierhaul/logo-bh.webp" alt="" aria-hidden="true" />
        <span className="bh-wordmark__main">Bierhaul</span>
        <span className="bh-wordmark__tag">Farmhouse · Thornton</span>
      </Link>

      <nav className="bh-nav" aria-label="Primary">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`bh-nav__link ${isActive(pathname, n.href) ? "is-active" : ""}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="bh-header__right">
        <button
          className="bh-modetoggle"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleMode}
        >
          <span className={`bh-modetoggle__icon ${dark ? "is-sun" : "is-moon"}`}>
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" fill="none" />
                <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
                </g>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M13.5 9.5A6 6 0 016.5 2.5a6 6 0 107 7z" fill="currentColor" />
              </svg>
            )}
          </span>
        </button>

        <button
          className={`bh-burger ${open ? "is-open" : ""}`}
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div className="bh-drawer" role="dialog" aria-modal="true">
          <div className="bh-drawer__panel">
            <button className="bh-drawer__close" aria-label="Close menu" onClick={() => setOpen(false)}>
              ✕
            </button>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`bh-drawer__link ${isActive(pathname, n.href) ? "is-active" : ""}`}
              >
                {n.label}
              </Link>
            ))}
            <button
              className="bh-drawer__mode"
              onClick={() => {
                toggleMode();
                setOpen(false);
              }}
            >
              {dark ? "Switch to light mode" : "Switch to dark mode"}
            </button>
            <div className="bh-drawer__foot">
              <div>{restaurant.address[0]}</div>
              <div>{restaurant.phone}</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
