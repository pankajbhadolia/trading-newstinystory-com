import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BreadcrumbData } from "@/components/structured-data";
import { pageMetadata } from "@/config/seo";
import { AppShell } from "@/layouts/app-shell";
import { education } from "@/modules/education/content";

export const metadata = pageMetadata("Trading Education & Resources", "Explore trading guides, risk management, options education, calculator tutorials and financial education.", "/resources");

export default function ResourcesPage() {
  return <AppShell><section className="directory-page home-container">
    <Breadcrumbs items={[{ label: "Educational Resources" }]} />
    <BreadcrumbData items={[{ label: "Educational Resources", href: "/resources" }]} />
    <div className="directory-intro"><div className="home-eyebrow">KEEP LEARNING</div><h1>Educational Resources</h1><p>Practical explanations to help you understand trading tools, risk and your decision-making process.</p></div>
    <p className="education-disclaimer">Educational information only, not financial advice. Trading involves risk, including loss of capital, and losses can exceed the amount committed.</p>
    <div className="education-grid">{education.categories.map((category) => <article className="ui-card education-card" key={category.slug}>
      <h2><Link href={`/resources/${category.slug}`}>{category.title}</Link></h2><p>{category.description}</p>
      <Link className="card-link" href={`/resources/${category.slug}`}>Explore {category.title}</Link>
    </article>)}</div>
  </section></AppShell>;
}
