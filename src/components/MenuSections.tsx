import type { MenuSection } from "@/lib/data";

function formatPrice(price: string): string {
  return /^\$?\d/.test(price) ? `$${price.replace("$", "")}` : price;
}

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
              <li key={item.id} className="bh-mi">
                <div className="bh-mi__row">
                  <div className="bh-mi__name">{item.name}</div>
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
