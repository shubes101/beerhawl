import { restaurant } from "@/lib/restaurant";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-bark/60 bg-espresso">
      <div className="container-content grid gap-10 py-12 sm:grid-cols-3">
        <div>
          <h3 className="font-display text-xl text-cream">{restaurant.name}</h3>
          <p className="mt-2 max-w-xs text-sm text-muted">{restaurant.tagline}</p>
        </div>

        <div>
          <p className="eyebrow">Visit</p>
          <p className="mt-3 text-sm text-parchment">{restaurant.address}</p>
          <p className="mt-1 text-sm text-parchment">{restaurant.phone}</p>
          <p className="mt-1 text-sm text-parchment">{restaurant.email}</p>
        </div>

        <div>
          <p className="eyebrow">Hours</p>
          <ul className="mt-3 space-y-1 text-sm text-parchment">
            {restaurant.hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-6">
                <span className="text-muted">{h.days}</span>
                <span>{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container-content border-t border-bark/40 py-6 text-xs text-muted">
        © {new Date().getFullYear()} {restaurant.name}. All rights reserved.
      </div>
    </footer>
  );
}
