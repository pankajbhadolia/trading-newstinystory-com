import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

export function FinancialMetric({ label, value, detail, tone = "neutral", icon }: { label: string; value: string; detail: string; tone?: "neutral" | "positive" | "negative" | "caution"; icon?: ReactNode }) {
  return (
    <Card className="financial-metric">
      <div className="metric-label"><span>{label}</span>{icon}</div>
      <strong className={`metric-value metric-${tone}`}>{value}</strong>
      <span className="metric-detail">{detail}</span>
    </Card>
  );
}
