import type { Metadata } from "next";
import "./globals.css";
import "./bierhaul.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { restaurant } from "@/lib/restaurant";

export const metadata: Metadata = {
  title: `${restaurant.name} — ${restaurant.city}`,
  description: restaurant.about,
  icons: { icon: "/bierhaul/logo-circle.webp" },
};

// Set the saved color mode before paint to avoid a flash.
const modeScript = `try{var m=localStorage.getItem('bh-mode');if(m==='daybreak'||m==='tavern'){document.documentElement.dataset.mode=m;}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="tavern" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: modeScript }} />
      </head>
      <body>
        <SiteHeader />
        <main className="bh-main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
