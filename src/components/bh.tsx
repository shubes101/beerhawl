import Link from "next/link";
import type { ReactNode } from "react";

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
