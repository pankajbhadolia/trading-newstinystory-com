import { AnalyticsApp } from "@/components/analytics/analytics-app";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AppShell } from "@/layouts/app-shell";

export function AnalyticsPage({ title }: { title: string }) {
  return <AppShell><section className="calculator-page home-container">
    <Breadcrumbs items={[{ label: "Services", href: "/services" }, { label: "Analytics & Reports", href: "/analytics" }, { label: title }]} />
    <div className="calculator-intro"><h1>{title}</h1><p>Explore recorded performance and compare your trading journey.</p></div>
    <div className="calculator-explanation"><strong>Private preview</strong><p>Accounts and PostgreSQL are required. Do not enter real sensitive data until the documented security and privacy work is complete.</p></div>
    <AnalyticsApp journey={title === "Trading Journey Analyzer"} />
  </section></AppShell>;
}
