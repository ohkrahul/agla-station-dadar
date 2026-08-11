import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Mukta, Courier_Prime } from "next/font/google";
import "./globals.css";

/** Painted signage: destination boards, coach markings, the wordmark. */
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

/** Devanagari + Latin body. Ek Type, Mumbai — the right provenance. */
const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-mukta",
  display: "swap",
});

/** Printed, not painted. Ticket readouts only. */
const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier-prime",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AGLA STATION — Mumbai Local Radio",
  description:
    "Board a Mumbai local, watch the monsoon go past the window, and play the songs that were on in 1997.",
};

export const viewport: Viewport = {
  themeColor: "#1a1815",
  // The scene is a fixed 100dvh object; pinch-zooming it only breaks the illusion.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${barlowCondensed.variable} ${mukta.variable} ${courierPrime.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
