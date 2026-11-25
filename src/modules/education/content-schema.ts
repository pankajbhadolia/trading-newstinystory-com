import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = z.string().trim().min(1).max(2000);
const categorySchema = z.object({ slug, title: text, description: text }).strict();
const articleSchema = z.object({
  category: slug, slug, title: text, description: text, intro: text,
  sections: z.array(z.object({ heading: text, paragraphs: z.array(text).min(1) }).strict()).min(1),
  relatedCalculators: z.array(slug).min(1),
}).strict();

export const educationSchema = z.object({
  categories: z.array(categorySchema).min(1),
  articles: z.array(articleSchema),
}).strict().superRefine((data, ctx) => {
  const categories = new Set<string>();
  const articles = new Set<string>();
  for (const category of data.categories) {
    if (categories.has(category.slug)) ctx.addIssue({ code: "custom", message: `Duplicate category: ${category.slug}` });
    categories.add(category.slug);
  }
  for (const article of data.articles) {
    const key = `${article.category}/${article.slug}`;
    if (!categories.has(article.category)) ctx.addIssue({ code: "custom", message: `Unknown category: ${article.category}` });
    if (articles.has(key)) ctx.addIssue({ code: "custom", message: `Duplicate article: ${key}` });
    articles.add(key);
  }
});
