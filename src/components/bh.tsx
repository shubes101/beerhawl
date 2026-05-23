import Link from "next/link";
import type { ReactNode } from "react";
import { restaurant } from "@/lib/restaurant";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="bh-eyebrow">{children}</div>;
}

export function Arrow({ className = "bh-btn__arrow" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
      <path
        d="M1 5h11M8 1l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  blurb,
  align = "left",
  trailing,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  blurb?: ReactNode;
  align?: "left" | "center";
  trailing?: ReactNode;
}) {
  return (
    <div className={`bh-secheading bh-secheading--${align}`}>
      <div className="bh-secheading__col">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="bh-h2">{title}</h2>
        {blurb && <p className="bh-blurb">{blurb}</p>}
      </div>
      {trailing && <div className="bh-secheading__trail">{trailing}</div>}
    </div>
  );
}

export function Button({
  variant = "primary",
  children,
  href,
}: {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
  href: string;
}) {
  const cls = `bh-btn bh-btn--${variant}`;
  const internal = href.startsWith("/") && !href.startsWith("//");
  if (internal) {
    return (
      <Link className={cls} href={href}>
        {children}
        <Arrow />
      </Link>
    );
  }
  const external = href.startsWith("http");
  return (
    <a
      className={cls}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
      <Arrow />
    </a>
  );
}

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Event dates are stored at noon UTC; format in UTC so the day doesn't shift.
export function DateChip({ date, size = "md" }: { date: Date; size?: "md" | "lg" }) {
  return (
    <div className={`bh-datechip bh-datechip--${size}`} aria-hidden="true">
      <div className="bh-datechip__mon">{MON[date.getUTCMonth()]}</div>
      <div className="bh-datechip__day">{date.getUTCDate()}</div>
    </div>
  );
}

export function Socials({ className }: { className?: string }) {
  return (
    <div className={`bh-socials${className ? ` ${className}` : ""}`}>
      <a
        className="bh-social"
        href={restaurant.social.instagram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bierhaul on Instagram"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
        </svg>
      </a>
      <a
        className="bh-social"
        href={restaurant.social.facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bierhaul on Facebook"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 12a10 10 0 10-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6v1.9h2.7l-.4 2.9h-2.3v7A10 10 0 0022 12z" />
        </svg>
      </a>
    </div>
  );
}

export function ImageSlot({
  src,
  alt,
  aspect,
  className,
}: {
  src: string;
  alt: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <div className={`bh-imgslot${className ? ` ${className}` : ""}`} style={aspect ? { aspectRatio: aspect } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}
