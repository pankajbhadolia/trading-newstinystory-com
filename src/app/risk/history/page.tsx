import { Breadcrumbs } from "@/components/breadcrumbs";
import { RiskHistory } from "@/components/risk-history";
import { AppShell } from "@/layouts/app-shell";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Assessment History", "Review saved personal risk assessment snapshots in your account.", "/risk/history", false);

export default function HistoryPage() {
  return <AppShell><section className="calculator-page home-container"><Breadcrumbs items={[{ label: "Personal Risk Intelligence", href: "/risk" }, { label: "Assessment history" }]} /><div className="calculator-intro"><h1>Assessment history</h1><p>Review and compare your saved report snapshots.</p></div><RiskHistory /></section></AppShell>;
}
