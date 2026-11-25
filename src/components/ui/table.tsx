import type { ReactNode, TableHTMLAttributes } from "react";

export function Table({ children, className = "", ...props }: TableHTMLAttributes<HTMLTableElement> & { children: ReactNode }) {
  return <div className="table-scroll"><table className={`ui-table ${className}`} {...props}>{children}</table></div>;
}
