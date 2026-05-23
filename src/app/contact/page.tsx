import { Eyebrow, Socials } from "@/components/bh";
import { ContactForm } from "@/components/ContactForm";
import { restaurant } from "@/lib/restaurant";

export const metadata = {
  title: "Contact — Bierhaul",
};

export default function ContactPage() {
  return (
    <div className="bh-page">
      <div className="bh-pagehead">
        <div className="bh-eyebrow">Say Hello</div>
        <h1 className="bh-pagehead__title">Get in touch</h1>
        <p className="bh-pagehead__sub">
          Private events, big tables, press, or just to say hi — drop us a line.
        </p>
      </div>

      <div className="bh-contact-grid">
        <ContactForm />

        <aside className="bh-contact-aside">
          <Eyebrow>Direct</Eyebrow>
          <a className="bh-untappd-link" href={`mailto:${restaurant.email}`}>
            {restaurant.email}
          </a>
          <a className="bh-untappd-link" href={`tel:${restaurant.phone.replace(/[^\d+]/g, "")}`}>
            {restaurant.phone}
          </a>
          <div style={{ marginTop: "0.6rem", color: "var(--text-2)" }}>
            {restaurant.address.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <Socials />
        </aside>
      </div>
    </div>
  );
}
