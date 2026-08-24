import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://padel-russia.online";
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

async function fetchCourts(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    const res = await fetch(`${backendUrl}/courts`, { cache: 'no-store' });
    if (!res.ok) return [];
    const courts = await res.json();
    return courts.map((c: any) => ({ slug: c.slug, updatedAt: c.updatedAt }));
  } catch {
    return [];
  }
}

async function fetchArticles(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    const res = await fetch(`${backendUrl}/articles`, { cache: 'no-store' });
    if (!res.ok) return [];
    const articles = await res.json();
    return articles.map((a: any) => ({ slug: a.slug, updatedAt: a.updatedAt }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courts, articles] = await Promise.all([fetchCourts(), fetchArticles()]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/courts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/map`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/news`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const courtPages: MetadataRoute.Sitemap = courts.map((court) => ({
    url: `${siteUrl}/courts/${court.slug}`,
    lastModified: new Date(court.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/news/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...courtPages, ...articlePages];
}
