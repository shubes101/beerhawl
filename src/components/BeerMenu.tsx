import { getMenuEmbedUrl, UNTAPPD_VENUE_URL } from "@/lib/untappd";

export function BeerMenu() {
  const embedUrl = getMenuEmbedUrl();

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title="Bierhaul beer menu on Untappd"
        className="h-[820px] w-full rounded-lg border border-bark/60 bg-white"
        loading="lazy"
      />
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-bark/70 bg-espresso/40 p-8">
      <p className="eyebrow">Powered by Untappd</p>
      <h3 className="mt-2 font-display text-2xl text-cream">Our draft list is pouring soon</h3>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-parchment/80">
        We keep our taps current on Untappd. The live list will appear here once
        our Untappd for Business menu is connected. In the meantime, see what&apos;s
        on now:
      </p>
      <a
        href={UNTAPPD_VENUE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block rounded-md bg-amber px-5 py-2.5 text-sm font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-gold"
      >
        View on Untappd →
      </a>
    </div>
  );
}
