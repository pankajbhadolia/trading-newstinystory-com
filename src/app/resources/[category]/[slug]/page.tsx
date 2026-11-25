import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BreadcrumbData, StructuredData } from "@/components/structured-data";
import { pageMetadata, siteUrl } from "@/config/seo";
import { AppShell } from "@/layouts/app-shell";
import { calculators } from "@/modules/calculators/calculations";
import { articlePath, education } from "@/modules/education/content";

type Props = { params: Promise<{ category: string; slug: string }> };
export function generateStaticParams() { return education.articles.map(({ category, slug }) => ({ category, slug })); }
export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  const article = education.articles.find((item) => item.category === category && item.slug === slug);
  if (!article) notFound();
  return pageMetadata(article.title, article.description, articlePath(article));
}

export default async function ArticlePage({ params }: Props) {
  const { category: categorySlug, slug } = await params;
  const category = education.categories.find((item) => item.slug === categorySlug);
  const article = education.articles.find((item) => item.category === categorySlug && item.slug === slug);
  if (!category || !article) notFound();
  const path = articlePath(article);
  return <AppShell><div className="directory-page home-container">
    <Breadcrumbs items={[{ label: "Educational Resources", href: "/resources" }, { label: category.title, href: `/resources/${category.slug}` }, { label: article.title }]} />
    <BreadcrumbData items={[{ label: "Educational Resources", href: "/resources" }, { label: category.title, href: `/resources/${category.slug}` }, { label: article.title, href: path }]} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description, mainEntityOfPage: `${siteUrl}${path}`, publisher: { "@type": "Organization", name: "Trader's Command Centre" } }} />
    <article className="education-content education-article">
      <header><p className="home-eyebrow">{category.title}</p><h1>{article.title}</h1><p className="education-lead">{article.intro}</p></header>
      {article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
      <section><h2>Related calculators</h2><ul>{article.relatedCalculators.map((id) => {
        const calculator = calculators.find((item) => item.id === id);
        if (!calculator) throw new Error(`Unknown related calculator: ${id}`);
        return <li key={id}><Link href={calculator.href}>{calculator.title}</Link></li>;
      })}</ul></section>
      <p className="education-disclaimer">Educational information only, not financial advice or a promise of returns. Trading involves risk, including loss of capital, and losses may exceed the amount committed. Verify applicable rules and charges independently.</p>
    </article>
  </div></AppShell>;
}
