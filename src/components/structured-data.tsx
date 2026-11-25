import { canonicalUrl } from "@/config/seo";

export function StructuredData({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function BreadcrumbData({ items }: { items: { label: string; href: string }[] }) {
  return <StructuredData data={{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ label: "Home", href: "/" }, ...items].map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.label, item: canonicalUrl(item.href),
    })),
  }} />;
}
