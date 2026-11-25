"use client";

import Link from "next/link";
import { useRef } from "react";
import { serviceCategories } from "@/config/services";

export function ServiceMenu() {
  const menu = useRef<HTMLDetailsElement>(null);
  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }

  return <details className="service-menu" ref={menu}>
    <summary>Services</summary>
    <div className="service-menu-items">
      <Link href="/services" onClick={closeMenu}>All services</Link>
      {serviceCategories.map((category) => <Link href={category.href} key={category.href} onClick={closeMenu}>{category.title}</Link>)}
    </div>
  </details>;
}
