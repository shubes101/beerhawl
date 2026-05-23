import { Button, Eyebrow, ImageSlot } from "@/components/bh";
import { EventCard } from "@/components/EventCard";
import { getUpcomingEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events — Bierhaul",
};

export default async function EventsPage() {
  const events = await getUpcomingEvents();

  return (
    <div className="bh-page">
      <div className="bh-pagehead">
        <div className="bh-eyebrow">What&apos;s On</div>
        <h1 className="bh-pagehead__title">The calendar</h1>
        <p className="bh-pagehead__sub">
          Live music, brewer&apos;s nights, comedy in the attic, and Sunday long tables. No cover
          unless we say.
        </p>
      </div>

      <div className="bh-eventlist">
        {events.length === 0 ? (
          <p className="bh-blurb">No events on the calendar right now — check back soon.</p>
        ) : (
          events.map((ev) => (
            <EventCard
              key={ev.id}
              title={ev.title}
              description={ev.description}
              date={ev.date}
              timeLabel={ev.timeLabel}
              location={ev.location}
            />
          ))
        )}
      </div>

      <div className="bh-events__cta bh-events__cta--photo">
        <div className="bh-events__cta__media">
          <ImageSlot src="/bierhaul/photo-banquet.webp" alt="A private banquet at Bierhaul" />
        </div>
        <div className="bh-events__cta__body">
          <Eyebrow>Hosting something?</Eyebrow>
          <div className="bh-events__cta__h">Private parties, big or small.</div>
          <p>The Attic seats forty. The Long Table seats twelve. Email us and we&apos;ll figure out the rest.</p>
          <Button variant="primary" href="/contact">
            Get in touch
          </Button>
        </div>
      </div>
    </div>
  );
}
