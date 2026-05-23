import { Eyebrow } from "@/components/bh";
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

function LBoard({
  eyebrow,
  title,
  rows,
}: {
  eyebrow: string;
  title: string;
  rows: LeaderboardEntry[];
}) {
  return (
    <section className="bh-lboard">
      <div className="bh-lboard__head">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="bh-lboard__title">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="bh-lboard__empty">
          No check-ins in the last {LEADERBOARD_WINDOW_HOURS} hours yet.
        </div>
      ) : (
        <ol className="bh-lboard__list">
          {rows.map((row, i) => (
            <li key={`${row.name}-${i}`} className="bh-lrow">
              <div className="bh-lrow__rank">{String(i + 1).padStart(2, "0")}</div>
              <div className="bh-lrow__main">
                <div className="bh-lrow__name">{row.name}</div>
                {row.subtitle && <div className="bh-lrow__sub">{row.subtitle}</div>}
              </div>
              <div className="bh-lrow__count">
                <span className="bh-lrow__count__n">{row.count}</span>
                <span className="bh-lrow__count__u">pour{row.count === 1 ? "" : "s"}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function LeaderboardPage() {
  const data = await getLeaderboards();
  const total = data ? data.topUsers.reduce((n, d) => n + d.count, 0) : null;

  return (
    <div className="bh-page">
      <div className="bh-pagehead bh-pagehead--lb">
        <div>
          <Eyebrow>Last {LEADERBOARD_WINDOW_HOURS} Hours{data ? " · Live" : ""}</Eyebrow>
          <h1 className="bh-pagehead__title">Leaderboard</h1>
          <p className="bh-pagehead__sub">
            Pulled from Untappd check-ins. The board re-sorts as new pours land.
          </p>
        </div>
        <div className="bh-lb-meter">
          <div className="bh-lb-meter__h">Total Check-ins</div>
          <div className="bh-lb-meter__big">{total ?? "—"}</div>
          <div className="bh-lb-meter__sub">
            {data ? (
              <>
                <span className="bh-lb-pulse" /> live
              </>
            ) : (
              "soon"
            )}
          </div>
        </div>
      </div>

      {data ? (
        <div className="bh-lb-grid">
          <LBoard eyebrow="The Regulars" title="Top Drinkers" rows={data.topUsers} />
          <LBoard eyebrow="Pouring Most" title="Most Popular" rows={data.topBeers} />
        </div>
      ) : (
        <div className="bh-lb-cta">
          <Eyebrow>Powered by Untappd</Eyebrow>
          <div className="bh-lb-cta__h">Coming soon</div>
          <p>
            Once our Untappd for Business check-in feed is connected, this page shows the top
            drinkers and the most-popular beers over the last {LEADERBOARD_WINDOW_HOURS} hours,
            updating through the night. Add to the tally by checking in when you visit.
          </p>
          <a
            className="bh-btn bh-btn--primary"
            href={UNTAPPD_VENUE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Check in on Untappd
            <svg className="bh-btn__arrow" width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
              <path d="M1 5h11M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
