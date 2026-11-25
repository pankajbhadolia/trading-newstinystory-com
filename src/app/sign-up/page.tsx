import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AppShell } from "@/layouts/app-shell";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Sign up", "Create a Trader's Command Centre account in the development preview.", "/sign-up", false);

export default function SignUpPage() {
  return <AppShell><section className="calculator-page home-container"><AccountForm initialMode="sign-up" /><p><Link className="text-link" href="/risk/history">Go to assessment history</Link></p></section></AppShell>;
}
