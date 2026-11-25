import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function ChartContainer({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="chart-container">
      <div className="card-heading"><div><h3>{title}</h3><p>{description}</p></div></div>
      <div className="chart-content">{children}</div>
    </Card>
  );
}
