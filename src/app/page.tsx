import Link from "next/link";
import { getMenu, getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { MENU_LABELS, MENU_BLURBS, MENU_TYPES, restaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [events, specials] = await Promise.all([
    getUpcomingEvents(3),
    getMenu("specials"),
  ]);

  const specialItems = specials.flatMap((s) => s.items).slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-bark/60 bg-gradient-to-b from-espresso to-ink">
        <div className="container-content py-24 sm:py-32">
          <p className="eyebrow">{restaurant.city}</p>
          <h1 className="mt-4 max-w-3xl text-5xl leading-tight text-cream sm:text-7xl">
            {restaurant.tagline}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-parchment/85">
            {restaurant.about}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/menus"
              className="rounded-md bg-amber px-6 py-3 text-sm font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-gold"
            >
              View Menus
            </Link>
            <Link
              href="/events"
              className="rounded-md border border-bark px-6 py-3 text-sm font-semibold uppercase tracking-widest text-parchment transition-colors hover:border-amber hover:text-gold"
            >
              Upcoming Events
            </Link>
          </div>
        </div>
      </section>

      {/* Specials */}
      {specialItems.length > 0 && (
        <section className="container-content py-16">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">On Now</p>
              <h2 className="mt-2 text-3xl text-cream">This Week&apos;s Specials</h2>
            </div>
            <Link href="/menus#specials" className="text-sm text-amber link-underline">
              All specials →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {specialItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-bark/60 bg-espresso/60 p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl text-cream">{item.name}</h3>
                  {item.price && <span className="font-display text-gold">{item.price}</span>}
                </div>
                {item.description && (
                  <p className="mt-2 text-sm leading-relaxed text-parchment/80">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Menu links */}
      <section className="container-content py-16">
        <p className="eyebrow">The Table</p>
        <h2 className="mt-2 text-3xl text-cream">Our Menus</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MENU_TYPES.map((type) => (
            <Link
              key={type}
              href={`/menus#${type}`}
              className="group rounded-lg border border-bark/60 bg-espresso/40 p-6 transition-colors hover:border-amber"
            >
              <h3 className="font-display text-2xl text-cream group-hover:text-gold">
                {MENU_LABELS[type]}
              </h3>
              <p className="mt-2 text-sm text-muted">{MENU_BLURBS[type]}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Events */}
      {events.length > 0 && (
        <section className="container-content py-16">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Mark Your Calendar</p>
              <h2 className="mt-2 text-3xl text-cream">Upcoming Events</h2>
            </div>
            <Link href="/events" className="text-sm text-amber link-underline">
              All events →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                description={event.description}
                date={event.date}
                timeLabel={event.timeLabel}
                location={event.location}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
