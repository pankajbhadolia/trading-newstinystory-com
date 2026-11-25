import { AccountSettings } from "@/components/account-settings";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AppShell } from "@/layouts/app-shell";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Account & Subscription", "Manage your profile, security, data and subscription in the account preview.", "/account", false);
export default function Page() {
  return <AppShell><section className="calculator-page home-container"><Breadcrumbs items={[{ label: "Account & Subscription" }]} /><div className="calculator-intro"><h1>Account &amp; Subscription</h1><p>Manage your profile, security, data, and subscription.</p></div><AccountSettings /></section></AppShell>;
}
