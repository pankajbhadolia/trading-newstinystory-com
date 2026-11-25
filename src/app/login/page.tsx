import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AppShell } from "@/layouts/app-shell";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Sign in", "Sign in to your Trader's Command Centre account.", "/login", false);

export default function LoginPage() {
  return <AppShell><section className="calculator-page home-container"><AccountForm /><p><Link className="text-link" href="/risk/history">Go to assessment history</Link></p></section></AppShell>;
}
