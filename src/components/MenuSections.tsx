"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { MenuSection } from "@/lib/data";

function formatPrice(price: string): string {
  return /^\$?\d/.test(price) ? `$${price.replace("$", "")}` : price;
}

const TAG_LABEL: Record<string, string> = { veg: "VEG", vgn: "VGN", gf: "GF", gfo: "GF*" };
const FILTERABLE_TAGS = new Set(["veg", "vgn", "gf", "gfo"]);

function matchesQuery(
  item: { name: string; description: string | null },
  sectionTitle: string | null | undefined,
  q: string,
): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    item.name.toLowerCase().includes(needle) ||
    (item.description?.toLowerCase().includes(needle) ?? false) ||
    (sectionTitle?.toLowerCase().includes(needle) ?? false)
  );
}

export function MenuSections({ sections }: { sections: MenuSection[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const tagFilter = params.get("tag");

  const toggleTag = useCallback(
    (tag: string) => {
      if (!FILTERABLE_TAGS.has(tag)) return;
      const url = new URL(window.location.href);
      if (url.searchParams.get("tag") === tag) {
        url.searchParams.delete("tag");
      } else {
        url.searchParams.set("tag", tag);
      }
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    },
    [router],
  );

  if (sections.length === 0) {
    return <p className="bh-blurb">This menu hasn&apos;t been published yet — check back soon.</p>;
  }

  const filtered = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (tagFilter && !item.tags.includes(tagFilter)) return false;
        if (query && !matchesQuery(item, section.title, query)) return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  if (filtered.length === 0) {
    return <p className="bh-blurb">No items match the current filter.</p>;
  }

  return (
    <>
      {filtered.map((section, i) => (
        <div key={section.title ?? `section-${i}`} className="bh-menugroup">
          {section.title && <div className="bh-menugroup__h">{section.title}</div>}
          <ul className="bh-menugroup__list">
            {section.items.map((item) => (
              <li key={item.id} className={item.soldOut ? "bh-mi bh-mi--sold" : "bh-mi"}>
                <div className="bh-mi__row">
                  <div className="bh-mi__name">
                    {item.name}
                    {item.soldOut && <span className="bh-tag bh-tag--sold">Sold Out</span>}
                    {item.tags.map((t) =>
                      FILTERABLE_TAGS.has(t) ? (
                        <button
                          key={t}
                          type="button"
                          className={`bh-tag bh-tag--clickable${tagFilter === t ? " is-active" : ""}`}
                          onClick={() => toggleTag(t)}
                          aria-label={`Filter by ${TAG_LABEL[t] ?? t}`}
                          aria-pressed={tagFilter === t}
                        >
                          {TAG_LABEL[t] ?? t.toUpperCase()}
                        </button>
                      ) : (
                        <span key={t} className="bh-tag">
                          {TAG_LABEL[t] ?? t.toUpperCase()}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="bh-mi__dots" aria-hidden="true" />
                  {item.price && <div className="bh-mi__price">{formatPrice(item.price)}</div>}
                </div>
                {item.description && <div className="bh-mi__desc">{item.description}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
