type EventCardProps = {
  title: string;
  description: string | null;
  date: Date;
  timeLabel: string | null;
  location: string | null;
};

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });

export function EventCard({ title, description, date, timeLabel, location }: EventCardProps) {
  return (
    <article className="flex gap-5 rounded-lg border border-bark/60 bg-espresso/60 p-5">
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-ink text-center">
        <span className="text-xs uppercase tracking-widest text-amber">{monthFmt.format(date)}</span>
        <span className="font-display text-2xl text-cream">{dayFmt.format(date)}</span>
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-xl text-cream">{title}</h3>
        <p className="mt-0.5 text-sm text-amber">
          {weekdayFmt.format(date)}
          {timeLabel ? ` · ${timeLabel}` : ""}
          {location ? ` · ${location}` : ""}
        </p>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-parchment/80">{description}</p>
        )}
      </div>
    </article>
  );
}
