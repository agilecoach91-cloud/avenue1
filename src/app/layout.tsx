import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { APP_NAME } from "@/lib/env";
import "./globals.css";

// Archivo (SIL Open Font License), self-hosted: variable weight 100–900 and width 62–125.
const archivo = localFont({
  src: "./fonts/Archivo-Variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-archivo",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const metadata: Metadata = {
  title: { default: `${APP_NAME}: online booking for home-service trades`, template: `%s` },
  description:
    "A booking page for your Google listing, Instagram bio and website. Customers pick a time, you get the job.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14212b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
