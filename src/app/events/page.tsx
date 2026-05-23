import { getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events — Bierhaul",
};

export default async function EventsPage() {
  const events = await getUpcomingEvents();

  return (
    <div className="container-content py-16">
      <p className="eyebrow">Mark Your Calendar</p>
      <h1 className="mt-2 text-4xl text-cream sm:text-5xl">Upcoming Events</h1>

      <div className="mt-12 space-y-5">
        {events.length === 0 ? (
          <p className="text-muted">No events on the calendar right now — check back soon.</p>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              title={event.title}
              description={event.description}
              date={event.date}
              timeLabel={event.timeLabel}
              location={event.location}
            />
          ))
        )}
      </div>
    </div>
  );
}
