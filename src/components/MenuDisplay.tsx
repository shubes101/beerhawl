import type { MenuSection } from "@/lib/data";

export function MenuDisplay({ sections }: { sections: MenuSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="text-muted">This menu hasn&apos;t been published yet — check back soon.</p>
    );
  }

  return (
    <div className="space-y-10">
      {sections.map((section, i) => (
        <div key={section.title ?? `section-${i}`}>
          {section.title && (
            <h3 className="mb-4 border-b border-bark/60 pb-2 text-lg uppercase tracking-[0.2em] text-amber">
              {section.title}
            </h3>
          )}
          <ul className="space-y-5">
            {section.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-display text-lg text-cream">{item.name}</span>
                  {item.price && (
                    <span className="shrink-0 font-display text-base text-gold">
                      {item.price}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="max-w-2xl text-sm leading-relaxed text-parchment/80">
                    {item.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
