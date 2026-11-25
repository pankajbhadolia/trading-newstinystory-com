import { Breadcrumbs } from "@/components/breadcrumbs";
import { JournalApp } from "@/components/journal/journal-app";
import { AppShell } from "@/layouts/app-shell";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Trading Journal & Discipline Centre", "Manually record trades and review discipline in the private development preview.", "/journal", false);

export default function JournalPage() {
  return <AppShell><section className="calculator-page home-container">
    <Breadcrumbs items={[{ label: "Services", href: "/services" }, { label: "Trading Management", href: "/trading-management" }, { label: "Trading Journal" }]} />
    <div className="calculator-intro"><h1>Trading Journal &amp; Discipline Centre</h1><p>Manually record trades, reflect on discipline and review your trading sessions.</p></div>
    <div className="calculator-explanation"><strong>Private preview</strong><p>Accounts and PostgreSQL are required. This is a development preview; do not enter real sensitive data until the security and privacy work documented in the project is complete.</p></div>
    <JournalApp />
  </section></AppShell>;
}
