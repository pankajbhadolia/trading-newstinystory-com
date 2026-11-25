import { ResetPassword } from "@/components/reset-password";
import { AppShell } from "@/layouts/app-shell";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Reset password", "Reset your Trader's Command Centre account password.", "/reset-password", false);
export default function Page() { return <AppShell><section className="calculator-page home-container"><ResetPassword /></section></AppShell>; }
