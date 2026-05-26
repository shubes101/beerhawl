import { restaurant } from "@/lib/restaurant";

export const metadata = {
  title: "Where to stay — Bierhaul",
  description: `Find a place to stay near Bierhaul in ${restaurant.city} — deep-linked searches to Airbnb, Vrbo, Booking.com, and Google Maps.`,
};

// Each link runs a search of the platform pre-filled with our location. There
// is no public Airbnb/Vrbo listings API, so we hand off to the platforms.
const ADDRESS = restaurant.address.join(", ");

// Airbnb's slug-based geocoder mishandles small US towns ("Thornton, PA" can
// resolve to Thornton-near-Paris), so we drive their map search via a bounding
// box around Thornton / Chadds Ford / Glen Mills / Media instead.
const AIRBNB_BBOX = {
  ne_lat: 40.03,
  ne_lng: -75.33,
  sw_lat: 39.77,
  sw_lng: -75.7,
  zoom: 11,
};
const AIRBNB_URL =
  "https://www.airbnb.com/s/homes?" +
  new URLSearchParams({
    ne_lat: String(AIRBNB_BBOX.ne_lat),
    ne_lng: String(AIRBNB_BBOX.ne_lng),
    sw_lat: String(AIRBNB_BBOX.sw_lat),
    sw_lng: String(AIRBNB_BBOX.sw_lng),
    zoom: String(AIRBNB_BBOX.zoom),
    search_by_map: "true",
  }).toString();

const PLATFORMS = [
  {
    name: "Airbnb",
    sub: "Homes, cabins, and the occasional farm stay around us.",
    href: AIRBNB_URL,
  },
  {
    name: "Vrbo",
    sub: "Whole-house rentals — built for groups and longer stays.",
    href: `https://www.vrbo.com/search?destination=${encodeURIComponent("Thornton Center, PA")}`,
  },
  {
    name: "Booking.com",
    sub: "Hotels, inns, and B&Bs nearby with instant booking.",
    href: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(restaurant.city)}`,
  },
  {
    name: "Google Maps",
    sub: "Every lodging option pinned on a map around our address.",
    href: `https://www.google.com/maps/search/${encodeURIComponent(`lodging near ${ADDRESS}`)}`,
  },
];

export default function StayPage() {
  return (
    <div className="bh-page">
      <div className="bh-pagehead">
        <div className="bh-eyebrow">Around Bierhaul</div>
        <h1 className="bh-pagehead__title">Where to stay</h1>
        <p className="bh-pagehead__sub">
          Make a weekend of it. Each link runs a search near our address on the platform —
          pick what works and book there.
        </p>
      </div>

      <div className="bh-menulinks">
        {PLATFORMS.map((p, i) => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="bh-menulink"
          >
            <div className="bh-menulink__num">{String(i + 1).padStart(2, "0")}</div>
            <div className="bh-menulink__body">
              <div className="bh-menulink__title">{p.name}</div>
              <div className="bh-menulink__sub">{p.sub}</div>
            </div>
            <div className="bh-menulink__arrow" aria-hidden="true">↗</div>
          </a>
        ))}
      </div>

      <p className="bh-menu-legend">
        Bierhaul doesn&apos;t manage these rentals or take a cut — we just want you to have
        somewhere comfortable to land.
      </p>
    </div>
  );
}
