export type Service = {
  title: string;
  href: string;
  description: string;
  usage: string;
  status: "Free" | "Pro" | "Coming Soon";
};

export type ServiceCategory = {
  title: string;
  href: string;
  description: string;
  services: Service[];
};

import { riskAreas } from "@/config/risk-areas";

function planned(title: string, href: string, description: string, usage: string): Service {
  return { title, href, description, usage, status: "Coming Soon" };
}

function calculator(id: CalculatorId): Service {
  const definition = calculators.find((item) => item.id === id);
  if (!definition) throw new Error(`Missing calculator definition: ${id}`);
  return { title: definition.title, href: definition.href, description: definition.description, usage: definition.explanation, status: "Free" };
}

export const serviceCategories: ServiceCategory[] = [
  {
    title: "Free Trading Tools",
    href: "/tools",
    description: "Free calculators, global clocks and market time references for trade preparation.",
    services: [
      { title: "World Clock", href: "/tools/world-clock", description: "Compare time across global financial centres.", usage: "Check local times when coordinating across markets.", status: "Free" },
      { title: "Market Timings", href: "/tools/market-timings", description: "Review reference hours for selected equity markets.", usage: "Compare regular session hours and verify holidays and special sessions with the exchange.", status: "Free" },
      calculator("brokerage"),
      calculator("equity-delivery"),
      calculator("equity-intraday"),
      calculator("futures"),
      calculator("options"),
      calculator("position-size"),
      calculator("stop-loss"),
      calculator("target"),
      calculator("risk-reward"),
      calculator("break-even"),
      calculator("compound-growth"),
      calculator("loss-recovery"),
      calculator("capital-depletion"),
      calculator("drawdown"),
      { title: "Drawdown Simulator", href: "/tools/drawdown-simulator", description: "Explore how a sequence of gains and losses affects capital and drawdown.", usage: "Enter hypothetical returns to review balances, peaks and maximum drawdown.", status: "Free" },
    ],
  },
  {
    title: "Personal Risk Intelligence",
    href: "/risk",
    description: "Explore financial resilience and trading readiness with a guided educational assessment.",
    services: [
      { title: "Personal Risk Assessment", href: "/risk/personal-assessment", description: "Explore financial capacity, risk tolerance and trading readiness.", usage: "Complete a guided educational assessment and review provisional risk indicators.", status: "Free" },
      ...riskAreas.map(({ title, href, description, usage }) => ({ title, href, description, usage, status: "Free" as const })),
    ],
  },
  {
    title: "Trading Management",
    href: "/trading-management",
    description: "Record manual trades, establish rules, and review discipline.",
    services: [
      { title: "Trading Journal", href: "/journal", description: "Record manual trades and your reasoning.", usage: "Document executions and review your trading process.", status: "Free" },
      { title: "Daily Logbook", href: "/journal/daily-logbook", description: "Review trading activity and observations by session.", usage: "Record session notes and checklist completion.", status: "Free" },
      { title: "Trading Discipline Sheets", href: "/journal/trading-discipline-sheets", description: "Review discipline using checklists. Custom rules require Pro.", usage: "Review weighted checklists in your daily session.", status: "Free" },
      { title: "Trading Rules", href: "/journal/trading-rules", description: "Organize the rules that guide your trading.", usage: "Create and maintain personal trading rules with Pro.", status: "Pro" },
      { title: "Trading Notes", href: "/journal/trading-notes", description: "Collect trade observations and lessons.", usage: "Record notes alongside manual trade entries.", status: "Free" },
      { title: "Trade Attachments", href: "/journal/trade-attachments", description: "Associate screenshots with trade records.", usage: "Save a trade and attach private screenshots.", status: "Free" },
    ],
  },
  {
    title: "Analytics & Reports",
    href: "/analytics",
    description: "Review recorded results and compare periods in your trading journey.",
    services: [
      { title: "Trading Performance", href: "/analytics/trading-performance", description: "Review trading results and performance measures.", usage: "Evaluate recorded activity over a selected period.", status: "Free" },
      planned("Daily P&L", "/analytics/daily-pnl", "Review profit and loss by trading day.", "Use it to understand daily outcomes from recorded trades."),
      planned("Monthly P&L", "/analytics/monthly-pnl", "Review profit and loss by month.", "Use it to compare recorded results across months."),
      planned("Strategy Analysis", "/analytics/strategy-analysis", "Review results associated with trading strategies.", "Use it to compare recorded trades by strategy."),
      planned("Loss Analysis", "/analytics/loss-analysis", "Examine losses and recurring patterns.", "Use it to review losing trades and identify areas for reflection."),
      { title: "Trading Journey Analyzer", href: "/analytics/trading-journey-analyzer", description: "Compare periods and patterns across your trading history.", usage: "Compare recorded performance and discipline between periods with Pro.", status: "Pro" },
      planned("Behavioural Analysis", "/analytics/behavioural-analysis", "Explore behavioural patterns in your trading records.", "Use it to review decisions and potential recurring habits."),
    ],
  },
  {
    title: "Market Intelligence",
    href: "/market-intelligence",
    description: "Planned market information, events, and analysis resources.",
    services: [
      planned("Global Markets", "/market-intelligence/global-markets", "Explore information about global markets.", "Use it to find context on markets beyond your local exchange."),
      planned("Indian Markets", "/market-intelligence/indian-markets", "Explore information about Indian markets.", "Use it to find context relevant to Indian exchanges."),
      planned("Market News", "/market-intelligence/market-news", "Find market-related news and updates.", "Use it to keep track of relevant developments; verify sources independently."),
      planned("Economic Calendar", "/market-intelligence/economic-calendar", "Review scheduled economic events.", "Use it to plan around events that may affect markets."),
      planned("Technical Analysis", "/market-intelligence/technical-analysis", "Explore technical market analysis resources.", "Use them to review price-based information as part of your own process."),
      planned("Options Analysis", "/market-intelligence/options-analysis", "Explore information for options analysis.", "Use it to research options-related data and risk before making decisions."),
    ],
  },
  {
    title: "AI Assistance",
    href: "/ai-assistance",
    description: "Planned AI-assisted resources for reflection, research, and analysis.",
    services: [
      planned("AI Trading Coach", "/ai-assistance/trading-coach", "Explore AI-assisted trading process guidance.", "Use it to reflect on your process, not as a substitute for independent judgment."),
      planned("AI Journal Analyst", "/ai-assistance/journal-analyst", "Explore AI-assisted review of journal entries.", "Use it to surface questions and patterns for your own review."),
      planned("AI Market Analyst", "/ai-assistance/market-analyst", "Explore AI-assisted market information analysis.", "Use it as a research aid and independently verify any output."),
      planned("AI Strategy Researcher", "/ai-assistance/strategy-researcher", "Explore AI-assisted strategy research.", "Use it to organize research ideas and independently evaluate their limitations."),
    ],
  },
];

export const services = serviceCategories.flatMap((category) =>
  category.services.map((service) => ({ ...service, category: { title: category.title, href: category.href } })),
);
import { calculators, type CalculatorId } from "@/modules/calculators/calculations";

