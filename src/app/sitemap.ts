import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/config/seo";
import { serviceCategories, services } from "@/config/services";
import { riskAreas } from "@/config/risk-areas";
import { calculators } from "@/modules/calculators/calculations";
import { articlePath, education } from "@/modules/education/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/", "/services", "/risk/personal-assessment", "/resources",
    ...serviceCategories.map((item) => item.href),
    ...riskAreas.map((item) => item.href),
    ...calculators.map((item) => item.href),
    ...services.filter((item) => item.category.href === "/tools" && item.status === "Free").map((item) => item.href),
    ...education.categories.map((item) => `/resources/${item.slug}`),
    ...education.articles.map(articlePath),
  ];
  return [...new Set(paths)].map((path) => ({ url: canonicalUrl(path) }));
}
