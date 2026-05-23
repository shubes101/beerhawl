import Link from "next/link";
import { restaurant } from "@/lib/restaurant";

const nav = [
  { href: "/", label: "Home" },
  { href: "/menus", label: "Menus" },
  { href: "/events", label: "Events" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-bark/60 bg-ink/95 backdrop-blur">
      <div className="container-content flex items-center justify-between py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-wide text-cream">
            {restaurant.name}
          </span>
          <span className="hidden text-xs uppercase tracking-[0.3em] text-amber sm:inline">
            Thornton
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm uppercase tracking-widest">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="link-underline text-parchment">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
