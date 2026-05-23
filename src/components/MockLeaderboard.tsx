"use client";

// Animated mock leaderboard, ported from the original Claude Design prototype.
// Shown until the real Untappd check-in API is connected (see src/lib/untappd.ts).
import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/bh";

type Drinker = { firstName: string; username: string; count: number };
type Beer = { name: string; brewery: string; count: number };
type TickerItem = { id: number; name: string; beer: string; brewery: string };

const INITIAL_DRINKERS: Drinker[] = [
  { firstName: "Marco", username: "marcobeer", count: 5 },
  { firstName: "Jess", username: "jessdrinks", count: 4 },
  { firstName: "Hank", username: "hank_o", count: 4 },
  { firstName: "Priya", username: "priya_p", count: 3 },
  { firstName: "Connor", username: "connormcgrath", count: 3 },
  { firstName: "Devon", username: "devs", count: 2 },
  { firstName: "Aly", username: "alyabv", count: 2 },
];

const INITIAL_BEERS: Beer[] = [
  { name: "Susan", brewery: "Hill Farmstead", count: 9 },
  { name: "Vista Pils", brewery: "Suarez Family", count: 7 },
  { name: "Tröegs Sunshine", brewery: "Tröegs", count: 5 },
  { name: "Saison Dupont", brewery: "Brasserie Dupont", count: 4 },
  { name: "Allagash White", brewery: "Allagash", count: 4 },
  { name: "HopHands", brewery: "Tired Hands", count: 3 },
  { name: "Hop Devil", brewery: "Victory", count: 2 },
];

const FIRST_NAMES = ["Sara", "Tom", "Lila", "Owen", "Mara"];

export function MockLeaderboard({ windowHours }: { windowHours: number }) {
  const [drinkers, setDrinkers] = useState<Drinker[]>(INITIAL_DRINKERS);
  const [beers, setBeers] = useState<Beer[]>(INITIAL_BEERS);
  const [pulse, setPulse] = useState({ d: -1, b: -1 });
  const [ticker, setTicker] = useState<TickerItem[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setDrinkers((cur) => {
        const next = cur.map((x) => ({ ...x }));
        if (Math.random() < 0.7) {
          next[Math.floor(Math.random() * Math.min(5, next.length))].count += 1;
        } else {
          const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
          next.push({
            firstName: fn,
            username: `${fn.toLowerCase()}_${Math.floor(Math.random() * 99)}`,
            count: 1,
          });
        }
        next.sort((a, b) => b.count - a.count);
        setPulse((p) => ({ ...p, d: 0 }));
        setTimeout(() => setPulse((p) => ({ ...p, d: -1 })), 900);
        return next.slice(0, 8);
      });

      setBeers((cur) => {
        const next = cur.map((x) => ({ ...x }));
        next[Math.floor(Math.random() * Math.min(6, next.length))].count += 1;
        next.sort((a, b) => b.count - a.count);
        setPulse((p) => ({ ...p, b: 0 }));
        setTimeout(() => setPulse((p) => ({ ...p, b: -1 })), 900);
        return next.slice(0, 8);
      });

      const beer = INITIAL_BEERS[Math.floor(Math.random() * INITIAL_BEERS.length)];
      const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      setTicker((cur) =>
        [{ id: Math.random(), name: fn, beer: beer.name, brewery: beer.brewery }, ...cur].slice(0, 5),
      );
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const total = drinkers.reduce((n, d) => n + d.count, 0);

  return (
    <div className="bh-page">
      <div className="bh-pagehead bh-pagehead--lb">
        <div>
          <Eyebrow>Last {windowHours} Hours · Live</Eyebrow>
          <h1 className="bh-pagehead__title">Leaderboard</h1>
          <p className="bh-pagehead__sub">
            Pulled from Untappd check-ins. The board re-sorts as new pours land.
          </p>
        </div>
        <div className="bh-lb-meter">
          <div className="bh-lb-meter__h">Total Check-ins</div>
          <div className="bh-lb-meter__big">{total}</div>
          <div className="bh-lb-meter__sub">
            <span className="bh-lb-pulse" /> live
          </div>
        </div>
      </div>

      <div className="bh-lb-grid">
        <Board
          eyebrow="The Regulars"
          title="Top Patrons"
          rows={drinkers}
          pulse={pulse.d}
          render={(d: Drinker) => ({ main: d.firstName, sub: `@${d.username}`, count: d.count })}
        />
        <Board
          eyebrow="Pouring Most"
          title="Most Popular"
          rows={beers}
          pulse={pulse.b}
          render={(b: Beer) => ({ main: b.name, sub: b.brewery, count: b.count })}
        />
      </div>

      <div className="bh-ticker">
        <div className="bh-ticker__h">
          <span className="bh-lb-pulse" /> Just now
        </div>
        <div className="bh-ticker__rows">
          {ticker.length === 0 ? (
            <div className="bh-ticker__empty">Waiting for the next check-in…</div>
          ) : (
            ticker.map((e) => (
              <div key={e.id} className="bh-ticker__row">
                <b>{e.name}</b> just had a <b>{e.beer}</b> <span>· {e.brewery}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="bh-lb-note">Sample activity — live check-ins begin once Untappd is connected.</p>
    </div>
  );
}

function Board<T>({
  eyebrow,
  title,
  rows,
  pulse,
  render,
}: {
  eyebrow: string;
  title: string;
  rows: T[];
  pulse: number;
  render: (row: T) => { main: string; sub: string; count: number };
}) {
  return (
    <section className="bh-lboard">
      <div className="bh-lboard__head">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="bh-lboard__title">{title}</h2>
      </div>
      <ol className="bh-lboard__list">
        {rows.map((row, i) => {
          const r = render(row);
          return (
            <li key={`${r.main}-${r.sub}`} className={`bh-lrow ${pulse === i ? "is-pulsing" : ""}`}>
              <div className="bh-lrow__rank">{String(i + 1).padStart(2, "0")}</div>
              <div className="bh-lrow__main">
                <div className="bh-lrow__name">{r.main}</div>
                <div className="bh-lrow__sub">{r.sub}</div>
              </div>
              <div className="bh-lrow__count" key={r.count}>
                <span className="bh-lrow__count__n">{r.count}</span>
                <span className="bh-lrow__count__u">pour{r.count === 1 ? "" : "s"}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
