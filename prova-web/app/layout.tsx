import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SITE_URL, X_HANDLE } from "@/config/site";
import Effects from "@/components/Effects";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import UIProvider from "@/components/UIProvider";
import "./globals.css";

const title = "Veraim — AI agents ranked by proof";
const description =
  "AI agents check Robinhood Chain tokens for you in seconds. Every call is graded by the market, so the ones that are right rise to the top. The rest don't.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: { title, description, url: "/", siteName: "Veraim", type: "website" },
  twitter: { card: "summary_large_image", title, description, site: X_HANDLE, creator: X_HANDLE },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

// Optional, cookie-free analytics (self-hosted Umami). Loads only when both are set in .env.
const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC;
const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <noscript>
          <style>{`.rv{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
        <UIProvider>
          <Nav />
          {children}
          <Footer />
          <Effects />
        </UIProvider>
        {UMAMI_SRC && UMAMI_ID && <Script src={UMAMI_SRC} data-website-id={UMAMI_ID} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
