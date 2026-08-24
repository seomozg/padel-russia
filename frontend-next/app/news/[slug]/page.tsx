import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { api, Article } from "@/lib/api";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://padel-russia.online";

const CATEGORY_COLORS: Record<string, string> = {
  "Тренды": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Турниры": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Советы": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Начинающим": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Новости клубов": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

interface ArticleDetailPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: ArticleDetailPageProps): Promise<Metadata> {
  const slug = params.slug;
  let article: Article | null = null;

  try {
    article = await api.getArticle(slug);
  } catch {
    notFound();
  }

  if (!article) return {};

  const title = article.title;
  const description = article.excerpt?.substring(0, 155) || article.title;

  return {
    title,
    description,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/news/${article.slug}`,
      publishedTime: new Date(article.createdAt).toISOString(),
      authors: [article.author],
      images: article.image ? [{ url: article.image, alt: article.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.image ? [article.image] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  let article: Article | null = null;

  try {
    article = await api.getArticle(params.slug);
  } catch {
    notFound();
  }

  if (!article) notFound();

  // JSON-LD: Article
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.image,
    datePublished: new Date(article.createdAt).toISOString(),
    dateModified: new Date(article.updatedAt).toISOString(),
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "PadelRussia",
      url: siteUrl,
    },
    articleSection: article.category,
    url: `${siteUrl}/news/${article.slug}`,
  };

  // JSON-LD: BreadcrumbList
  const breadcrumbs = [
    { label: "Главная", href: "/" },
    { label: "Новости", href: "/news" },
    { label: article.category, href: "/news" },
    { label: article.title },
  ];

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="pt-16">
        {/* Hero image */}
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-8">
            <div className="container mx-auto">
              <Breadcrumbs items={breadcrumbs} />
              <Link
                href="/news"
                className="self-start flex items-center gap-2 text-white/90 hover:text-white bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg text-sm transition-colors"
              >
                <ArrowLeft size={16} /> К новостям
              </Link>
            </div>
            <div className="container mx-auto">
              <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${CATEGORY_COLORS[article.category] || "bg-muted text-muted-foreground"}`}>
                {article.category}
              </span>
              <h1 className="font-display font-bold text-3xl md:text-4xl text-white leading-tight mb-2">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 text-white/80 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(article.createdAt).toLocaleDateString("ru-RU")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {article.readTime} мин чтения
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Article content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Meta info */}
            <div className="flex items-center justify-between mb-8 pb-8 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {article.author.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{article.author}</div>
                  <div className="text-sm text-muted-foreground">
                    Опубликовано {new Date(article.createdAt).toLocaleDateString("ru-RU")}
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Share2 size={16} />
                Поделиться
              </button>
            </div>

            {/* Excerpt */}
            <div className="text-xl text-muted-foreground leading-relaxed mb-8 font-medium">
              {article.excerpt}
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <div className="whitespace-pre-line leading-relaxed">
                {article.content}
              </div>
            </div>

            {/* Category */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-muted-foreground">Категория:</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[article.category] || "bg-muted text-muted-foreground"}`}>
                  {article.category}
                </span>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center justify-between">
                <Link
                  href="/news"
                  className="flex items-center gap-2 text-primary hover:gap-3 transition-all"
                >
                  <ArrowLeft size={16} />
                  Все новости
                </Link>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <Share2 size={16} />
                  Поделиться статьей
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
