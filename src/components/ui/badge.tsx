import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "info" | "positive" | "caution" | "negative";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}
