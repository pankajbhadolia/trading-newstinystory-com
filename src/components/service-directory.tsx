"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { serviceCategories, services } from "@/config/services";

export function ServiceDirectory({ categoryHref }: { categoryHref?: string }) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const search = query.trim().toLocaleLowerCase();
  const filtered = services.filter((service) => {
    const matchesCategory = !categoryHref || service.category.href === categoryHref;
    const searchableText = `${service.title} ${service.description} ${service.usage} ${service.category.title}`.toLocaleLowerCase();
    return matchesCategory && searchableText.includes(search);
  });

  return (
    <div className="directory-layout">
      <aside className="directory-sidebar">
        <h2>Categories</h2>
        <nav className="directory-categories" aria-label="Service categories">
          <Link className={!categoryHref ? "selected" : ""} aria-current={!categoryHref ? "page" : undefined} href="/services">All services <span>{services.length}</span></Link>
          {serviceCategories.map((category) => <Link className={category.href === categoryHref ? "selected" : ""} aria-current={category.href === categoryHref ? "page" : undefined} key={category.href} href={category.href}>{category.title}<span>{category.services.length}</span></Link>)}
        </nav>
      </aside>
      <div className="directory-results">
        <div className="directory-search">
          <label htmlFor={searchId}>Search {categoryHref ? "this category" : "all services"}</label>
          <div className="directory-search-input"><Search size={18} aria-hidden="true" /><Input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by service or topic" /></div>
        </div>
        <p className="directory-count" role="status">{filtered.length} {filtered.length === 1 ? "service" : "services"} {search && `matching “${query.trim()}”`}</p>
        {filtered.length ? (
          <div className="directory-grid">
            {filtered.map((service) => <Card className="directory-card" key={service.href}>
              <div className="directory-card-heading"><span className="directory-category-label">{service.category.title}</span><Badge tone={service.status === "Free" ? "positive" : service.status === "Pro" ? "info" : "neutral"}>{service.status}</Badge></div>
              <h3><Link href={service.href}>{service.title}</Link></h3>
              <p>{service.description}</p>
              <Link className="card-link" href={service.href}>{service.status !== "Coming Soon" ? "Open service" : "View details"} <ArrowRight size={15} /></Link>
            </Card>)}
          </div>
        ) : <div className="directory-empty"><strong>No services found.</strong><p>Try a different search term or browse another category.</p></div>}
      </div>
    </div>
  );
}
