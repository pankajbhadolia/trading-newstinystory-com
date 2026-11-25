import type { ReactNode } from "react";

export function Notification({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "positive" | "caution" | "negative" }) {
  return <div className={`ui-notification ui-notification-${tone}`} role={tone === "negative" ? "alert" : "status"}>{children}</div>;
}
