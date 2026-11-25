import data from "../../../content/education.json";
import { calculators } from "../calculators/calculations";
import { educationSchema } from "./content-schema";

export const education = educationSchema.parse(data);
const calculatorIds = new Set<string>(calculators.map((item) => item.id));
for (const article of education.articles) {
  for (const id of article.relatedCalculators) {
    if (!calculatorIds.has(id)) throw new Error(`Unknown calculator "${id}" in article "${article.slug}"`);
  }
}

export function articlePath(article: { category: string; slug: string }) {
  return `/resources/${article.category}/${article.slug}`;
}
