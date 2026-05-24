import type { MenuSection } from "@/lib/data";

function formatPrice(price: string): string {
  return /^\$?\d/.test(price) ? `$${price.replace("$", "")}` : price;
}

const TAG_LABEL: Record<string, string> = { veg: "VEG", vgn: "VGN", gf: "GF", gfo: "GF*" };

export function MenuSections({ sections }: { sections: MenuSection[] }) {
  if (sections.length === 0) {
    return <p className="bh-blurb">This menu hasn&apos;t been published yet — check back soon.</p>;
  }

  return (
    <>
      {sections.map((section, i) => (
        <div key={section.title ?? `section-${i}`} className="bh-menugroup">
          {section.title && <div className="bh-menugroup__h">{section.title}</div>}
          <ul className="bh-menugroup__list">
            {section.items.map((item) => (
              <li key={item.id} className={item.soldOut ? "bh-mi bh-mi--sold" : "bh-mi"}>
                <div className="bh-mi__row">
                  <div className="bh-mi__name">
                    {item.name}
                    {item.soldOut && <span className="bh-tag bh-tag--sold">Sold Out</span>}
                    {item.tags.map((t) => (
                      <span key={t} className="bh-tag">
                        {TAG_LABEL[t] ?? t.toUpperCase()}
                      </span>
                    ))}
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
