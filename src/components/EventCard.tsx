import { DateChip } from "@/components/bh";
import { restaurant } from "@/lib/restaurant";

const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });

type EventCardProps = {
  title: string;
  description: string | null;
  date: Date;
  timeLabel: string | null;
  location: string | null;
  compact?: boolean;
};

export function EventCard({ title, description, date, timeLabel, location, compact }: EventCardProps) {
  return (
    <article className={`bh-event ${compact ? "bh-event--compact" : ""}`}>
      <DateChip date={date} size={compact ? "md" : "lg"} />
      <div className="bh-event__body">
        <h3 className="bh-event__title">{title}</h3>
        <div className="bh-event__meta">
          <span>{weekdayFmt.format(date)}</span>
          {timeLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{timeLabel}</span>
            </>
          )}
          {location && (
            <>
              <span aria-hidden="true">·</span>
              <span>{location}</span>
            </>
          )}
        </div>
        {description && <p className="bh-event__desc">{description}</p>}
      </div>
      {!compact && (
        <a
          className="bh-event__more"
          href={`mailto:${restaurant.email}`}
          aria-label={`Ask about ${title}`}
        >
          Inquire
          <svg width="12" height="9" viewBox="0 0 14 10" aria-hidden="true">
            <path
              d="M1 5h11M8 1l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      )}
    </article>
  );
}
