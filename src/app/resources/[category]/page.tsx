import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BreadcrumbData } from "@/components/structured-data";
import { pageMetadata } from "@/config/seo";
import { AppShell } from "@/layouts/app-shell";
import { articlePath, education } from "@/modules/education/content";

type Props = { params: Promise<{ category: string }> };
export function generateStaticParams() { return education.categories.map(({ slug }) => ({ category: slug })); }
export async function generateMetadata({ params }: Props) {
  const { category: slug } = await params;
  const category = education.categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return pageMetadata(category.title, category.description, `/resources/${category.slug}`);
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = education.categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const articles = education.articles.filter((item) => item.category === slug);
  return <AppShell><section className="directory-page home-container">
    <Breadcrumbs items={[{ label: "Educational Resources", href: "/resources" }, { label: category.title }]} />
    <BreadcrumbData items={[{ label: "Educational Resources", href: "/resources" }, { label: category.title, href: `/resources/${slug}` }]} />
    <div className="directory-intro"><h1>{category.title}</h1><p>{category.description}</p></div>
    <p className="education-disclaimer">For education only, not financial advice. Trading involves the risk of loss.</p>
    {articles.length ? <div className="education-grid">{articles.map((article) => <article className="ui-card education-card" key={article.slug}>
      <h2><Link href={articlePath(article)}>{article.title}</Link></h2><p>{article.description}</p><Link className="card-link" href={articlePath(article)}>Read article</Link>
    </article>)}</div> : <p>No articles have been published in this section yet.</p>}
  </section></AppShell>;
}
