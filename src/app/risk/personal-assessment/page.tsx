import { Breadcrumbs } from "@/components/breadcrumbs";
import { RiskAssessmentForm } from "@/components/risk-assessment";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/layouts/app-shell";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Personal Risk Assessment", "Explore financial resilience, risk tolerance and trading readiness with a provisional educational assessment.", "/risk/personal-assessment");

export default function PersonalAssessmentPage() {
  return <AppShell><section className="calculator-page home-container">
    <Breadcrumbs items={[{ label: "Services", href: "/services" }, { label: "Personal Risk Intelligence", href: "/risk" }, { label: "Personal Risk Assessment" }]} />
    <div className="calculator-intro"><Badge tone="positive">Free</Badge><h1>Personal Risk Assessment</h1><p>Reflect on financial resilience, your response to losses and trading readiness.</p></div>
    <div className="calculator-explanation"><strong>Educational preview, not financial advice</strong><p>The scoring rules are provisional and have not been professionally validated. They do not establish suitability, predict losses or replace independent advice. No account is needed to assess; saving is optional.</p></div>
    <RiskAssessmentForm />
  </section></AppShell>;
}
