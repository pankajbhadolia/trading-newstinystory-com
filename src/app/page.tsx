import { ArrowRight, BarChart3, BookOpen, Calculator, Check, Clock3, Compass, Globe2, Layers3, LineChart, ListChecks, Scale, ShieldCheck, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/layouts/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { featurePolicy } from "@/modules/subscriptions/entitlements";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Trading Calculators, Risk & Education", "Explore free trading calculators, educational risk tools, a trading journal preview and practical guides for Indian traders.", "/");

const quickTools = [
  { title: "Position Size", text: "Plan the size of a trade around your risk.", href: "/tools/position-size-calculator", icon: Calculator },
  { title: "Risk & Reward", text: "Consider potential risk against potential return.", href: "/tools/risk-reward-calculator", icon: Scale },
  { title: "Equity Delivery P&L", text: "Estimate the outcome of a planned trade.", href: "/tools/equity-delivery-pnl-calculator", icon: LineChart },
  { title: "Brokerage", text: "Understand the costs associated with a trade.", href: "/tools/brokerage-calculator", icon: Wallet },
];

const intelligence = [
  { title: "Personal Risk Intelligence", text: "Build awareness of your risk profile and trading readiness.", href: "/risk", icon: ShieldCheck },
  { title: "Trading Journal", text: "Keep a structured record of your trades and decisions.", href: "/journal", icon: BookOpen },
  { title: "Trading Journey Analyzer", text: "Review your process and uncover patterns over time.", href: "/analytics/trading-journey-analyzer", icon: BarChart3 },
];

const benefits = [
  "Understand your financial risk.",
  "Maintain a structured trading journal.",
  "Identify recurring mistakes.",
  "Improve trading discipline.",
  "Analyze historical performance.",
];

export default function Home() {
  return (
    <AppShell>
      <section className="home-hero">
        <div className="home-container hero-grid">
          <div className="hero-content">
            <div className="home-eyebrow"><span /> YOUR TRADING WORKSPACE</div>
            <h1>Trade Smarter. Understand Your Risk. Improve Every Day.</h1>
            <p>Everything you need to calculate, manage, analyze and improve your trading journey — in one place.</p>
            <div className="hero-actions"><ButtonLink href="/tools">Explore Free Tools <ArrowRight size={16} /></ButtonLink><ButtonLink href="/risk/personal-assessment" variant="secondary">Assess Your Trading Readiness</ButtonLink></div>
            <div className="hero-note"><ShieldCheck size={16} /> Built for thoughtful, informed decisions.</div>
          </div>
          <div className="hero-overview">
            <div className="overview-top"><div><span className="overview-label">YOUR COMMAND CENTRE</span><h2>A better process starts here.</h2><p>One place to bring clarity to your trading.</p></div><span className="overview-icon"><Layers3 size={21} /></span></div>
            <div className="overview-list">
              <div><span><Calculator size={18} /></span><div><strong>Plan with purpose</strong><p>Understand the numbers before a trade.</p></div></div>
              <div><span><ShieldCheck size={18} /></span><div><strong>Know your risk</strong><p>Keep risk awareness at the centre.</p></div></div>
              <div><span><BarChart3 size={18} /></span><div><strong>Learn from your journey</strong><p>Review your decisions and progress.</p></div></div>
            </div>
            <div className="overview-foot"><span>PLATFORM PREVIEW</span><Badge tone="info">More tools in development</Badge></div>
          </div>
        </div>
      </section>

      <section className="home-section home-container" id="free-tools">
        <div className="home-section-heading"><div><div className="home-eyebrow">START WITH THE NUMBERS</div><h2>Quick tools for everyday decisions</h2><p>Simple calculators to help you prepare before you trade.</p></div><span className="section-status">Free calculators</span></div>
        <div className="home-grid four-columns">
          {quickTools.map((item) => <Card className="home-card tool-preview" key={item.title}><span className="home-icon"><item.icon size={21} /></span><h3>{item.title} Calculator</h3><p>{item.text}</p><Link className="card-link" href={item.href}>View tool <ArrowRight size={15} /></Link></Card>)}
        </div>
        <Link className="text-link section-all-link" href="/tools">Browse all free trading tools <ArrowRight size={16} /></Link>
      </section>

      <section className="home-section home-section-alt" id="intelligence">
        <div className="home-container">
          <div className="home-section-heading"><div><div className="home-eyebrow">BEYOND THE TRADE</div><h2>Build your trading intelligence</h2><p>Understand your habits, manage risk, and learn from your experience.</p></div><span className="section-status">Assessment and journal preview available</span></div>
          <div className="home-grid three-columns">
            {intelligence.map((item) => <Card className="home-card intelligence-card" key={item.title}><span className="home-icon"><item.icon size={22} /></span><h3>{item.title}</h3><p>{item.text}</p><Link className="card-link" href={item.href}>Learn more <ArrowRight size={15} /></Link></Card>)}
          </div>
        </div>
      </section>

      <section className="home-section home-container why-grid">
        <div><div className="home-eyebrow">WHY TRADER&apos;S COMMAND CENTRE</div><h2>A more intentional way to trade.</h2><p>Good trading isn&apos;t just about the next position. It&apos;s about the process behind every decision.</p><Link className="text-link" href="/about">About our approach <ArrowRight size={16} /></Link></div>
        <div className="benefit-list">{benefits.map((benefit) => <div key={benefit}><span><Check size={16} /></span>{benefit}</div>)}</div>
      </section>

      <section className="home-section home-section-alt">
        <div className="home-container market-panel">
          <div><div className="home-eyebrow">MARKET TOOLS</div><h2>Stay in sync with the markets.</h2><p>Compare global clocks and reference market timings. Additional market information tools are planned.</p><ButtonLink href="/tools" variant="secondary">Explore free tools <ArrowRight size={16} /></ButtonLink></div>
          <div className="market-items"><div><Globe2 size={20} /><span><strong>Global clocks</strong><small>See time across markets</small></span></div><div><Clock3 size={20} /><span><strong>Market timings</strong><small>Review reference trading sessions</small></span></div><div><Compass size={20} /><span><strong>Market information</strong><small>Coming soon</small></span></div></div>
        </div>
      </section>

      <section className="home-section home-container" id="plans">
        <div className="home-section-heading"><div><div className="home-eyebrow">PLANS FOR YOUR JOURNEY</div><h2>Start with the essentials. Grow at your pace.</h2><p>Pricing is not configured. Paid-tier upgrades are handled as manual requests; no payment is collected.</p></div></div>
        <div className="home-grid plan-grid">
          <Card className="plan-card"><div className="plan-top"><div><h3>Free</h3><p>For building a strong foundation.</p></div><Badge tone="positive">Available</Badge></div><ul><li><Check size={16} /> Free trading calculators</li><li><Check size={16} /> {featurePolicy.journalHistory.limit.FREE}-day journal history</li><li><Check size={16} /> Basic performance reports</li></ul><ButtonLink href="/tools" variant="secondary">Explore Free <ArrowRight size={16} /></ButtonLink></Card>
          <Card className="plan-card plan-pro"><div className="plan-top"><div><h3>Pro</h3><p>For a deeper view of your process.</p></div><Badge tone="info">Manual upgrade</Badge></div><ul><li><Check size={16} /> Advanced performance insights</li><li><Check size={16} /> Extended journal history</li><li><Check size={16} /> Custom discipline rules</li></ul><ButtonLink href="/account">Explore Pro <ArrowRight size={16} /></ButtonLink></Card>
          <Card className="plan-card"><div className="plan-top"><div><h3>Premium</h3><p>For future personalized tools.</p></div><Badge tone="info">Manual upgrade</Badge></div><ul><li><Check size={16} /> Pro features</li><li><Check size={16} /> AI assistance (coming soon)</li><li><Check size={16} /> Behavioural analysis (coming soon)</li></ul><ButtonLink href="/account" variant="secondary">Explore Premium <ArrowRight size={16} /></ButtonLink></Card>
        </div>
      </section>

      <section className="home-section home-section-alt" id="resources">
        <div className="home-container">
          <div className="home-section-heading"><div><div className="home-eyebrow">KEEP LEARNING</div><h2>Knowledge for the journey</h2><p>Practical educational resources for more considered trading decisions.</p></div><Link className="text-link" href="/resources">Explore resources <ArrowRight size={16} /></Link></div>
          <div className="home-grid three-columns">
            <Card className="resource-card"><span className="home-icon"><BookOpen size={20} /></span><div><h3><Link href="/resources/trading-guides">Trading fundamentals</Link></h3><p>Explore the basics.</p></div></Card>
            <Card className="resource-card"><span className="home-icon"><Target size={20} /></span><div><h3><Link href="/resources/risk-management">Risk management</Link></h3><p>Learn to think about risk first.</p></div></Card>
            <Card className="resource-card"><span className="home-icon"><ListChecks size={20} /></span><div><h3><Link href="/resources/trading-discipline">Trading discipline</Link></h3><p>Explore your trading process.</p></div></Card>
          </div>
          <p className="resources-note">Educational information only; trading involves risk.</p>
        </div>
      </section>
    </AppShell>
  );
}
