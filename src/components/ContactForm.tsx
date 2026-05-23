"use client";

import { useState } from "react";
import { restaurant } from "@/lib/restaurant";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = `Website message${name ? ` from ${name}` : ""}`;
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    window.location.href = `mailto:${restaurant.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form className="bh-form" onSubmit={handleSubmit}>
      <div className="bh-field">
        <label htmlFor="cf-name">Name</label>
        <input id="cf-name" name="name" type="text" required autoComplete="name" />
      </div>
      <div className="bh-field">
        <label htmlFor="cf-email">Email</label>
        <input id="cf-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="bh-field">
        <label htmlFor="cf-message">Message</label>
        <textarea id="cf-message" name="message" required />
      </div>
      <button className="bh-btn bh-btn--primary" type="submit">
        Send message
        <svg className="bh-btn__arrow" width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
          <path d="M1 5h11M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <p className="bh-form__note">
        {sent
          ? "Your email app should have opened — hit send and it lands in our inbox."
          : `This opens your email app to send to ${restaurant.email}.`}
      </p>
    </form>
  );
}
