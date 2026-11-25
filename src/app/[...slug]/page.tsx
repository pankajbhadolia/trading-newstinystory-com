import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BreadcrumbData } from "@/components/structured-data";
import { CalculatorGuide } from "@/components/calculator-guide";
import { DrawdownSimulator } from "@/components/drawdown-simulator";
import { MarketTimings, WorldClock } from "@/components/market-times";
import { RiskAssessmentForm } from "@/components/risk-assessment";
import { ServiceDirectory } from "@/components/service-directory";
import { TradingCalculator } from "@/components/trading-calculator";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { placeholderPages } from "@/config/placeholder-pages";
import { pageMetadata } from "@/config/seo";
import { riskAreas } from "@/config/risk-areas";
import { serviceCategories, services } from "@/config/services";
import { AppShell } from "@/layouts/app-shell";
import { calculators } from "@/modules/calculators/calculations";

export const instant = false;

const legacyPaths: Record<string, string> = {
  "/position-size-calculator": "/tools/position-size-calculator",
  "/risk-reward-calculator": "/tools/risk-reward-calculator",
  "/profit-loss-calculator": "/tools/equity-delivery-pnl-calculator",
  "/tools/equity-pnl-calculator": "/tools/equity-delivery-pnl-calculator",
  "/brokerage-calculator": "/tools/brokerage-calculator",
  "/risk-intelligence": "/risk",
  "/trading-journal": "/journal",
  "/market-tools": "/tools",
};

function getPath(slug: string[]) {
  return `/${slug.join("/")}`;
}

export function generateStaticParams() {
  const paths = ["/services", ...serviceCategories.map((category) => category.href), ...services.map((service) => service.href), ...Object.keys(placeholderPages).map((slug) => `/${slug}`), ...Object.keys(legacyPaths)];
  return [...new Set(paths)].map((path) => ({ slug: path.slice(1).split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = getPath(slug);
  const category = serviceCategories.find((item) => item.href === path);
  const service = services.find((item) => item.href === path);
  const placeholder = slug.length === 1 && Object.hasOwn(placeholderPages, slug[0]) ? placeholderPages[slug[0]] : undefined;
  const title = path === "/services" ? "Service Directory" : category?.title ?? service?.title ?? placeholder?.title;
  if (!title) return { title: "Page not found", robots: { index: false } };
  const description = path === "/services" ? "Explore trading calculators, risk tools and planned services in the Trader's Command Centre directory." : category?.description ?? service?.description ?? placeholder?.description ?? "";
  return pageMetadata(title, description, path, !placeholder && service?.status !== "Coming Soon");
}

export default async function DirectoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = getPath(slug);
  if (Object.hasOwn(legacyPaths, path)) redirect(legacyPaths[path]);

  const category = serviceCategories.find((item) => item.href === path);
  const service = services.find((item) => item.href === path);
  const placeholder = slug.length === 1 && Object.hasOwn(placeholderPages, slug[0]) ? placeholderPages[slug[0]] : undefined;

  if (path === "/services" || category) {
    const title = category?.title ?? "Service Directory";
    return <AppShell><section className="directory-page home-container">
      <Breadcrumbs items={category ? [{ label: "Services", href: "/services" }, { label: category.title }] : [{ label: "Services" }]} />
      <div className="directory-intro"><div className="home-eyebrow">EXPLORE THE WORKSPACE</div><h1>{title}</h1><p>{category?.description ?? "Explore free calculators and planned services for Trader's Command Centre."}</p></div>
      <div className="directory-notice"><Construction size={17} /><span>Free and Pro services are available at their indicated tier. Services marked Coming Soon are still in development.</span></div>
      <ServiceDirectory categoryHref={category?.href} />
    </section></AppShell>;
  }

  if (service) {
    const riskArea = riskAreas.find((item) => item.href === service.href);
    if (riskArea) {
      return <AppShell><section className="calculator-page home-container">
        <Breadcrumbs items={[{ label: "Services", href: "/services" }, { label: service.category.title, href: service.category.href }, { label: service.title }]} />
        <BreadcrumbData items={[{ label: "Services", href: "/services" }, { label: service.category.title, href: service.category.href }, { label: service.title, href: service.href }]} />
        <div className="calculator-intro"><Badge tone="positive">Free</Badge><h1>{riskArea.title}</h1><p>{riskArea.description}</p></div>
        <div className="calculator-explanation"><strong>Educational preview, not financial advice</strong><p>The provisional rules are not professionally validated and do not establish suitability or predict losses. Complete the shared assessment to see this area highlighted in a full report, including red flags and the other scores. Answers remain in this page unless you choose to save the report; navigating away discards unsaved answers.</p></div>
        <RiskAssessmentForm key={riskArea.focus} focus={riskArea.focus} />
      </section></AppShell>;
    }
    const calculator = calculators.find((item) => item.href === service.href);
    if (calculator) {
      return <AppShell><section className="calculator-page home-container">
        <Breadcrumbs items={[{ label: "Services", href: "/services" }, { label: service.category.title, href: service.category.href }, { label: service.title }]} />
        <BreadcrumbData items={[{ label: "Services", href: "/services" }, { label: service.category.title, href: service.category.href }, { label: service.title, href: service.href }]} />
        <div className="calculator-intro"><Badge tone="positive">Free</Badge><h1>{calculator.title}</h1><p>{calculator.description}</p></div>
        <div className="calculator-explanation"><strong>How it works</strong><p>{calculator.explanation}</p></div>
        <TradingCalculator definition={calculator} />
        <CalculatorGuide calculator={calculator} />
      </section></AppShell>;
    }
    if (["/tools/world-clock", "/tools/market-timings", "/tools/drawdown-simulator"].includes(service.href)) {
      return <AppShell><section className="calculator-page home-container">
        <Breadcrumbs items={[{ label: "Services", href: "/services" }, { label: service.category.title, href: service.category.href }, { label: service.title }]} />
        <BreadcrumbData items={[{ label: "Services", href: "/services" }, { label: service.category.title, href: service.category.href }, { label: service.title, href: service.href }]} />
        <div className="calculator-intro"><Badge tone="positive">Free</Badge><h1>{service.title}</h1><p>{service.description}</p></div>
        {service.href === "/tools/world-clock" ? <WorldClock /> : service.href === "/tools/market-timings" ? <MarketTimings /> : <DrawdownSimulator />}
      </section></AppShell>;
    }
    return <AppShell><section className="service-page home-container">
      <Breadcrumbs items={[{ label: "Services", href: "/services" }, { label: service.category.title, href: service.category.href }, { label: service.title }]} />
      <div className="service-detail">
        <Badge>{service.status}</Badge>
        <h1>{service.title}</h1>
        <p className="service-description">{service.description}</p>
        <div className="service-usage"><h2>Intended use</h2><p>{service.usage}</p></div>
        <div className="directory-notice"><Construction size={17} /><span>This service is in development and cannot be used yet.</span></div>
        <Link className="text-link" href={service.category.href}><ArrowLeft size={16} /> Back to {service.category.title}</Link>
      </div>
    </section></AppShell>;
  }

  if (placeholder) {
    return <AppShell><section className="placeholder-page home-container">
      <Breadcrumbs items={[{ label: placeholder.title }]} />
      <span className="home-icon"><Construction size={22} /></span>
      <Badge tone="info">In development</Badge>
      <h1>{placeholder.title}</h1>
      <p>{placeholder.description}</p>
      <p className="placeholder-note">This page is a placeholder. No functionality is available here yet.</p>
      <ButtonLink href="/" variant="secondary"><ArrowLeft size={16} /> Back to home</ButtonLink>
    </section></AppShell>;
  }

  notFound();
}
