import type { Metadata } from "next";
import "./globals.css";
import "@/styles/themes.css";
import "@/styles/home.css";
import "@/styles/directory.css";
import "@/styles/calculators.css";
import "@/styles/risk.css";
import "@/styles/journal.css";
import "@/styles/analytics.css";
import "@/styles/education.css";
import { siteUrl } from "@/config/seo";

export const metadata: Metadata = {
  title: "Trader's Command Centre",
  description: "A thoughtful workspace for planning, tracking, and growing as a trader.",
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
