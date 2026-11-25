"use client";

import Link from "next/link";
import { useRef } from "react";
import { navigation } from "@/config/navigation";
import { serviceCategories } from "@/config/services";

export function MobileNav() {
  const menu = useRef<HTMLDetailsElement>(null);
  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }

  return (
    <details className="mobile-menu" ref={menu}>
      <summary aria-label="Navigation menu">Menu</summary>
      <nav aria-label="Mobile navigation">
        {navigation.map((item) => <Link key={item.label} href={item.href} onClick={closeMenu}>{item.label}</Link>)}
        <span className="mobile-menu-label">SERVICE CATEGORIES</span>
        <Link href="/services" onClick={closeMenu}>All services</Link>
        {serviceCategories.map((category) => <Link key={category.href} href={category.href} onClick={closeMenu}>{category.title}</Link>)}
        <Link href="/account" onClick={closeMenu}>Account</Link><Link href="/login" onClick={closeMenu}>Login</Link><Link href="/sign-up" onClick={closeMenu}>Sign Up</Link>
      </nav>
    </details>
  );
}
