import { restaurant } from "@/lib/restaurant";

export function SiteFooter() {
  return (
    <footer className="bh-footer">
      <div className="bh-footer__grid">
        <div className="bh-footer__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bh-footer__logo" src="/bierhaul/logo-bh.webp" alt="" aria-hidden="true" />
          <div className="bh-footer__mark">{restaurant.name}</div>
          <div className="bh-footer__tag">{restaurant.tagline}</div>
          <div className="bh-footer__small">A modern farmhouse Bierhaul.</div>
        </div>

        <div className="bh-footer__col">
          <div className="bh-footer__h">Visit</div>
          {restaurant.address.map((line) => (
            <div key={line}>{line}</div>
          ))}
          <div style={{ marginTop: "0.4em" }}>{restaurant.phone}</div>
          <div>{restaurant.email}</div>
        </div>

        <div className="bh-footer__col">
          <div className="bh-footer__h">Hours</div>
          <table className="bh-hours">
            <tbody>
              {restaurant.hours.map((h) => (
                <tr key={h.day}>
                  <td>{h.day}</td>
                  <td>{h.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bh-footer__rule" />
      <div className="bh-footer__bottom">
        <span>© {new Date().getFullYear()} {restaurant.name}</span>
        <span>No reservations · First come, first served</span>
      </div>
    </footer>
  );
}
