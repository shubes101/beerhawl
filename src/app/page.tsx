import Link from "next/link";
import { Arrow, Button, Eyebrow, ImageSlot, SectionHeading } from "@/components/bh";
import { EventCard } from "@/components/EventCard";
import { HeroVideo } from "@/components/HeroVideo";
import { getAllMenus, getUpcomingEvents, isSpecialsEnabled, menuItemCount } from "@/lib/data";
import { MENU_LABELS, MENU_TYPES, restaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

function priceLabel(p: string) {
  return /^\$?\d/.test(p) ? `$${p.replace("$", "")}` : p;
}

export default async function HomePage() {
  const [menus, events, specialsOn] = await Promise.all([
    getAllMenus(),
    getUpcomingEvents(2),
    isSpecialsEnabled(),
  ]);
  const specials = menus.specials
    .flatMap((s) => s.items)
    .filter((it) => !it.soldOut)
    .slice(0, 3);
  const visibleMenuTypes = MENU_TYPES.filter((t) => t !== "specials" || specialsOn);

  return (
    <div className="bh-page">
      {/* HERO */}
      <section className="bh-hero">
        <div className="bh-hero__copy">
          <Eyebrow>
            {restaurant.city} · Est. {restaurant.established}
          </Eyebrow>
          <h1 className="bh-hero__title">
            A friendly seat,
            <br />
            a cold pour,
            <br />
            <em>stay a while.</em>
          </h1>
          <p className="bh-hero__about">{restaurant.about}</p>
          <div className="bh-hero__ctas">
            <Button variant="primary" href="/menus">
              View Menus
            </Button>
            <Button variant="secondary" href="/events">
              Upcoming Events
            </Button>
          </div>
          <div className="bh-hero__meta">
            <span>{restaurant.address[0]}</span>
            <span aria-hidden="true">·</span>
            <span>{restaurant.phone}</span>
            <span aria-hidden="true">·</span>
            <span>No reservations</span>
          </div>
        </div>
        <div className="bh-hero__media">
          <HeroVideo />
          <div className="bh-hero__badge">
            <span className="bh-hero__badge__dot" />
            <b>24</b>
            <span>on tap</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bh-hero__logo" src="/bierhaul/logo-circle.webp" alt="Bierhaul" />
        </div>
      </section>

      {/* SPECIALS */}
      {specialsOn && specials.length > 0 && (
        <section className="bh-section">
          <SectionHeading
            eyebrow="This Week"
            title="Specials"
            blurb="From the kitchen and the bar — running while they last."
            trailing={
              <Button variant="ghost" href="/menus#specials">
                All specials
              </Button>
            }
          />
          <div className="bh-grid-3">
            {specials.map((s, i) => (
              <article key={s.id} className="bh-card bh-card--special">
                <div className="bh-card__head">
                  <div className="bh-card__num">{String(i + 1).padStart(2, "0")}</div>
                  {s.price && <div className="bh-card__price">{priceLabel(s.price)}</div>}
                </div>
                <h3 className="bh-card__title">{s.name}</h3>
                {s.description && <p className="bh-card__desc">{s.description}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* THE SPACE */}
      <section className="bh-section">
        <SectionHeading
          eyebrow="The Space"
          title="A bar, an attic, a good time."
          blurb="Biergarten, a beautiful rustic bar, a quiet dining room, an event space, and even rooms to stay."
        />
        <div className="bh-space-grid">
          <figure className="bh-space-fig">
            <ImageSlot src="/bierhaul/thebar.webp" alt="The bar" />
            <figcaption>The Bar</figcaption>
          </figure>
          <figure className="bh-space-fig">
            <ImageSlot src="/bierhaul/BierhaulHDR-2.webp" alt="The Attic event space" />
            <figcaption>The Attic</figcaption>
          </figure>
          <figure className="bh-space-fig">
            <ImageSlot src="/bierhaul/patio.webp" alt="The patio at sunset" />
            <figcaption>A Good Time</figcaption>
          </figure>
        </div>
      </section>

      {/* MENUS */}
      <section className="bh-section">
        <SectionHeading
          eyebrow="Our Kitchen & Bar"
          title="Menus"
          blurb="Updated weekly, texted in directly from the kitchen. Always up to date."
        />
        <div className="bh-menulinks">
          {visibleMenuTypes.map((type, i) => {
            const sections = menus[type];
            return (
              <Link key={type} className="bh-menulink" href={`/menus#${type}`}>
                <div className="bh-menulink__num">{String(i + 1).padStart(2, "0")}</div>
                <div className="bh-menulink__body">
                  <div className="bh-menulink__title">{MENU_LABELS[type]}</div>
                  <div className="bh-menulink__sub">
                    {menuItemCount(sections)} items · {sections.length} section
                    {sections.length === 1 ? "" : "s"}
                  </div>
                </div>
                <Arrow className="bh-menulink__arrow" />
              </Link>
            );
          })}
        </div>
        <div className="bh-tap-promo">
          <div className="bh-tap-promo__l">
            <Eyebrow>Always Live</Eyebrow>
            <div className="bh-tap-promo__h">On Tap — what&apos;s pouring right now</div>
            <p className="bh-tap-promo__sub">
              Twenty-four lines, pulled from our Untappd venue. Tap list and a live check-in
              leaderboard, updated through the night.
            </p>
          </div>
          <Button variant="primary" href="/menus#tap">
            See the tap list
          </Button>
        </div>
      </section>

      {/* EVENTS PREVIEW */}
      {events.length > 0 && (
        <section className="bh-section">
          <SectionHeading
            eyebrow="What's On"
            title="Upcoming Events"
            blurb="Live music, brewer's nights, and the occasional pig roast."
            trailing={
              <Button variant="ghost" href="/events">
                All events
              </Button>
            }
          />
          <div className="bh-grid-2">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                title={ev.title}
                description={ev.description}
                date={ev.date}
                timeLabel={ev.timeLabel}
                location={ev.location}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
