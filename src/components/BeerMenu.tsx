import { getMenuEmbedUrl, UNTAPPD_VENUE_URL } from "@/lib/untappd";

export function BeerMenu() {
  const embedUrl = getMenuEmbedUrl();

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title="Bierhaul beer menu on Untappd"
        className="bh-ontap-embed"
        loading="lazy"
      />
    );
  }

  return (
    <div className="bh-ontap-card">
      <div className="bh-eyebrow">Powered by Untappd</div>
      <h3 className="bh-ontap-card__h">Twenty-four lines, pouring soon here</h3>
      <p>
        We keep our taps current on Untappd. The live list lands here once our Untappd
        for Business menu is connected — until then, see what&apos;s flowing right now:
      </p>
      <a
        className="bh-btn bh-btn--primary"
        href={UNTAPPD_VENUE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Untappd
        <svg className="bh-btn__arrow" width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
          <path d="M1 5h11M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}
