import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JournalApp, type JournalTab } from "@/components/journal/journal-app";
import { AppShell } from "@/layouts/app-shell";
import { pageMetadata } from "@/config/seo";

const sections: Record<string, { title: string; tab: JournalTab }> = {
  "daily-logbook": { title: "Daily Logbook", tab: "reviews" },
  "trading-discipline-sheets": { title: "Trading Discipline Sheets", tab: "rules" },
  "trading-rules": { title: "Trading Rules", tab: "rules" },
  "trading-notes": { title: "Trading Notes", tab: "trades" },
  "trade-attachments": { title: "Trade Attachments", tab: "trades" },
};

export function generateStaticParams() { return Object.keys(sections).map((section) => ({ section })); }

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const entry = sections[section];
  if (!entry) notFound();
  return pageMetadata(entry.title, `Explore ${entry.title.toLowerCase()} in the private Trading Journal development preview.`, `/journal/${section}`, false);
}

export default async function JournalSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const entry = sections[section];
  if (!entry) notFound();
  return <AppShell><section className="calculator-page home-container">
    <Breadcrumbs items={[{ label: "Trading Journal", href: "/journal" }, { label: entry.title }]} />
    <div className="calculator-intro"><h1>{entry.title}</h1><p>Part of the Trading Journal &amp; Discipline Centre.</p></div>
    <div className="calculator-explanation"><strong>Private preview</strong><p>Accounts and PostgreSQL are required. Do not enter real sensitive data until the security and privacy work documented in the project is complete.</p></div>
    <JournalApp initialTab={entry.tab} />
  </section></AppShell>;
}
