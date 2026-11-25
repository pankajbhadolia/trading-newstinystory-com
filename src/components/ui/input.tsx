import type { ComponentPropsWithRef, ReactNode } from "react";

export function Input({ className = "", ...props }: ComponentPropsWithRef<"input">) {
  return <input className={`ui-input ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentPropsWithRef<"select">) {
  return <select className={`ui-input ui-select ${className}`} {...props} />;
}

export function FormField({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return <div className="form-field"><label htmlFor={htmlFor}>{label}</label>{children}{hint && <p>{hint}</p>}</div>;
}
