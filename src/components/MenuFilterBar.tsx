"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const TAG_LABEL: Record<string, string> = { veg: "VEG", vgn: "VGN", gf: "GF", gfo: "GF*" };

export function MenuFilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const urlTag = params.get("tag");

  // Local input state so typing isn't laggy; URL writes are debounced.
  const [text, setText] = useState(urlQuery);

  // Sync local state from the URL when it changes externally (back/forward,
  // chip clear, tag toggle from a badge).
  useEffect(() => {
    setText(urlQuery);
  }, [urlQuery]);

  // Debounce URL writes so a fast typist doesn't push one history entry per
  // keystroke.
  useEffect(() => {
    if (text === urlQuery) return;
    const id = setTimeout(() => {
      const url = new URL(window.location.href);
      if (text) url.searchParams.set("q", text);
      else url.searchParams.delete("q");
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    }, 180);
    return () => clearTimeout(id);
  }, [text, urlQuery, router]);

  const clearTag = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("tag");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [router]);

  return (
    <div className="bh-menu-filter">
      <input
        type="search"
        className="bh-menu-filter__input"
        placeholder="Search the menus — try 'schnitzel', 'jaeger', 'gluten free'"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Search menu items"
      />
      {urlTag && TAG_LABEL[urlTag] && (
        <button
          type="button"
          className="bh-menu-filter__chip"
          onClick={clearTag}
          aria-label={`Clear ${TAG_LABEL[urlTag]} filter`}
        >
          <span>Showing {TAG_LABEL[urlTag]}</span>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
