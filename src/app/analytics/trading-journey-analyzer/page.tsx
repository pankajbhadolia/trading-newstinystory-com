import { AnalyticsPage } from "@/components/analytics/analytics-page";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Trading Journey Analyzer", "Compare periods of recorded trading activity in the private development preview.", "/analytics/trading-journey-analyzer", false);
export default function Page() { return <AnalyticsPage title="Trading Journey Analyzer" />; }
