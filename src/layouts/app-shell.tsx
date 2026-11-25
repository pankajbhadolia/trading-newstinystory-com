import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/mobile-nav";
import { ServiceMenu } from "@/components/service-menu";
import { ThemeSelector } from "@/components/theme-selector";
import { navigation } from "@/config/navigation";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/risk-disclaimer", label: "Risk Disclaimer" },
];

function BrandLogo() {
  return (
    <Link className="site-brand" href="/" aria-label="Trader's Command Centre home">
      <Image className="logo-light" src="/traders-command-centre-logo.png" width={690} height={211} alt="" priority />
      <Image className="logo-dark" src="/traders-command-centre-logo-dark.png" width={675} height={211} alt="" priority />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <BrandLogo />
          <nav className="desktop-nav" aria-label="Main navigation">
            <ServiceMenu />
            {navigation.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
          </nav>
          <div className="header-actions">
            <ThemeSelector />
            <div className="desktop-auth"><Link href="/account">Account</Link><Link href="/login">Login</Link><Link className="header-signup" href="/sign-up">Sign Up</Link></div>
            <MobileNav />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-intro"><BrandLogo /><p>A more thoughtful approach to your trading journey.</p></div>
          <div className="footer-column"><strong>Explore</strong><Link href="/services">All services</Link><Link href="/tools">Free Tools</Link><Link href="/risk">Risk Intelligence</Link><Link href="/resources">Resources</Link></div>
          <div className="footer-column"><strong>Information</strong>{footerLinks.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div>
          <div className="footer-column"><strong>Social <span>(coming soon)</span></strong><Link href="/social">LinkedIn</Link><Link href="/social">X</Link><Link href="/social">YouTube</Link></div>
        </div>
        <div className="footer-bottom"><span>© Trader&apos;s Command Centre</span><span>Trading involves risk. Content is not financial advice.</span></div>
      </footer>
    </div>
  );
}
