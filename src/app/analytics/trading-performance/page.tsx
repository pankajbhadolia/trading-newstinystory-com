import { AnalyticsPage } from "@/components/analytics/analytics-page";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("Trading Performance", "Review recorded trading performance in the private development preview.", "/analytics/trading-performance", false);
export default function Page() { return <AnalyticsPage title="Trading Performance" />; }
