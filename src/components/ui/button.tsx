import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary";

export function Button({ className = "", variant = "primary", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`ui-button ui-button-${variant} ${className}`} {...props} />;
}

export function ButtonLink({ className = "", variant = "primary", ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant }) {
  return <Link className={`ui-button ui-button-${variant} ${className}`} {...props} />;
}
