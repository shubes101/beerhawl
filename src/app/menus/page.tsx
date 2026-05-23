import { SectionHeading } from "@/components/bh";
import { MenusTabs } from "@/components/MenusTabs";
import { MenuSections } from "@/components/MenuSections";
import { BeerMenu } from "@/components/BeerMenu";
import { getAllMenus } from "@/lib/data";
import { MENU_BLURBS, MENU_LABELS, MENU_TYPES } from "@/lib/restaurant";
import { UNTAPPD_VENUE_URL } from "@/lib/untappd";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Menus — Bierhaul",
};

export default async function MenusPage() {
  const menus = await getAllMenus();

  const tabs = [
    { id: "tap", label: "On Tap" },
    ...MENU_TYPES.map((t) => ({ id: t, label: MENU_LABELS[t] })),
  ];

  return (
    <div className="bh-page">
      <div className="bh-pagehead">
        <div className="bh-eyebrow">The Menu</div>
        <h1 className="bh-pagehead__title">From the line, the bar, the cellar</h1>
        <p className="bh-pagehead__sub">
          Texted in by the kitchen. Prices when set, &ldquo;market&rdquo; when not, blanks when
          we&apos;re rotating.
        </p>
      </div>

      <MenusTabs tabs={tabs} />

      {/* ON TAP */}
      <section id="tap" className="bh-menu-section">
        <SectionHeading
          eyebrow="Live · Untappd"
          title="On Tap"
          blurb="Twenty-four lines, updated as kegs blow."
          trailing={
            <a
              className="bh-untappd-link"
              href={UNTAPPD_VENUE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Untappd ↗
            </a>
          }
        />
        <BeerMenu />
      </section>

      {/* FOOD & DRINK MENUS */}
      {MENU_TYPES.map((type) => (
        <section key={type} id={type} className="bh-menu-section">
          <SectionHeading
            eyebrow={type === "specials" ? "Tonight Only" : "Kitchen · Bar"}
            title={MENU_LABELS[type]}
            blurb={MENU_BLURBS[type]}
          />
          <MenuSections sections={menus[type]} />
        </section>
      ))}
    </div>
  );
}
