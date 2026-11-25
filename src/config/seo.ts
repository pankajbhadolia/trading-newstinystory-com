import type { Metadata } from "next";

export const siteUrl = "https://trading.newstinystory.com";
const siteName = "Trader's Command Centre";

export function canonicalUrl(path: string) {
  return path === "/" ? siteUrl : `${siteUrl}${path}`;
}

export function pageMetadata(title: string, description: string, path: string, index = true): Metadata {
  const fullTitle = `${title} | ${siteName}`;
  const url = canonicalUrl(path);
  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName, title: fullTitle, description, url },
    twitter: { card: "summary", title: fullTitle, description },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}
