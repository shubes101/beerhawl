import {
  getLeaderboards,
  LEADERBOARD_WINDOW_HOURS,
  type LeaderboardEntry,
  UNTAPPD_VENUE_URL,
} from "@/lib/untappd";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard — Bierhaul",
};

function Board({
  title,
  subtitle,
  entries,
}: {
  title: string;
  subtitle: string;
  entries: LeaderboardEntry[];
}) {
  return (
    <div className="rounded-lg border border-bark/60 bg-espresso/60 p-6">
      <h2 className="font-display text-2xl text-cream">{title}</h2>
      <p className="mt-0.5 text-sm text-amber">{subtitle}</p>
      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No check-ins in the last {LEADERBOARD_WINDOW_HOURS} hours yet — be the first.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {entries.map((entry, i) => (
            <li key={`${entry.name}-${i}`} className="flex items-center gap-4">
              <span className="w-6 shrink-0 font-display text-lg text-gold">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-parchment">{entry.name}</p>
                {entry.subtitle && (
                  <p className="truncate text-xs text-muted">{entry.subtitle}</p>
                )}
              </div>
              <span className="shrink-0 font-display text-cream">{entry.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function LeaderboardPage() {
  const data = await getLeaderboards();

  return (
    <div className="container-content py-16">
      <p className="eyebrow">Last {LEADERBOARD_WINDOW_HOURS} Hours</p>
      <h1 className="mt-2 text-4xl text-cream sm:text-5xl">Leaderboard</h1>
      <p className="mt-3 max-w-2xl text-parchment/80">
        Who&apos;s drinking the most and what&apos;s pouring fastest, from live Untappd
        check-ins at Bierhaul.
      </p>

      {!data ? (
        <div className="mt-12 rounded-lg border border-dashed border-bark/70 bg-espresso/40 p-8">
          <p className="eyebrow">Powered by Untappd</p>
          <h2 className="mt-2 font-display text-2xl text-cream">Coming soon</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-parchment/80">
            Once our Untappd for Business check-in feed is connected, this page will
            show the top drinkers and the most-popular beers over the last{" "}
            {LEADERBOARD_WINDOW_HOURS} hours, updating throughout the night.
          </p>
          <a
            href={UNTAPPD_VENUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-md bg-amber px-5 py-2.5 text-sm font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-gold"
          >
            Check in on Untappd →
          </a>
        </div>
      ) : (
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <Board title="Top Drinkers" subtitle="Most check-ins" entries={data.topUsers} />
          <Board title="Most Popular" subtitle="Most-checked-in beers" entries={data.topBeers} />
        </div>
      )}
    </div>
  );
}
