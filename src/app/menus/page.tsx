import { getMenu } from "@/lib/data";
import { MenuDisplay } from "@/components/MenuDisplay";
import { BeerMenu } from "@/components/BeerMenu";
import { MENU_BLURBS, MENU_LABELS, MENU_TYPES } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Menus — Bierhaul",
};

export default async function MenusPage() {
  const menus = await Promise.all(
    MENU_TYPES.map(async (type) => ({ type, sections: await getMenu(type) })),
  );

  return (
    <div className="container-content py-16">
      <p className="eyebrow">The Table</p>
      <h1 className="mt-2 text-4xl text-cream sm:text-5xl">Menus</h1>

      <div className="mt-16 space-y-20">
        <section id="beer" className="scroll-mt-24">
          <div className="mb-8">
            <h2 className="text-3xl text-cream">On Tap</h2>
            <p className="mt-1 text-sm text-muted">Our rotating draft list, straight from Untappd.</p>
          </div>
          <BeerMenu />
        </section>

        {menus.map(({ type, sections }) => (
          <section key={type} id={type} className="scroll-mt-24">
            <div className="mb-8">
              <h2 className="text-3xl text-cream">{MENU_LABELS[type]}</h2>
              <p className="mt-1 text-sm text-muted">{MENU_BLURBS[type]}</p>
            </div>
            <MenuDisplay sections={sections} />
          </section>
        ))}
      </div>
    </div>
  );
}
