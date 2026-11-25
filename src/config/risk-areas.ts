export const riskAreas = [
  { focus: "financial", title: "Financial Risk Capacity", href: "/risk/financial-risk-capacity", description: "Consider how much financial risk your circumstances may support.", usage: "Review financial resilience, capital, obligations and the potential impact of loss." },
  { focus: "psychological", title: "Psychological Risk Tolerance", href: "/risk/psychological-risk-tolerance", description: "Explore your comfort with trading uncertainty and loss.", usage: "Reflect on how volatility and losses affect your decisions." },
  { focus: "readiness", title: "Trading Readiness", href: "/risk/trading-readiness", description: "Review your preparedness for trading.", usage: "Consider your experience, knowledge and written trading plan." },
  { focus: "budget", title: "Personal Risk Budget", href: "/risk/personal-risk-budget", description: "Explore a framework for allocating risk.", usage: "Review illustrative loss limits alongside your financial and psychological circumstances." },
  { focus: "instruments", title: "Trading Instrument Suitability", href: "/risk/trading-instrument-suitability", description: "Consider the risks of different trading instruments.", usage: "Review provisional readiness indicators for delivery, intraday, options and futures." },
] as const;

export type RiskFocus = (typeof riskAreas)[number]["focus"];

export function riskReportOrder(focus?: RiskFocus) {
  if (focus === "budget") return ["findings", "budget", "scores", "instruments"] as const;
  if (focus === "instruments") return ["findings", "instruments", "scores", "budget"] as const;
  return ["scores", "findings", "budget", "instruments"] as const;
}
