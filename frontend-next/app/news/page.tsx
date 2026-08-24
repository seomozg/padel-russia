import type { Metadata } from "next";
import { api, Article } from "@/lib/api";
import NewsClient from "@/components/NewsClient";

export const metadata: Metadata = {
  title: "Новости падела",
  description:
    "Статьи и новости о падел-теннисе в России и мире. Турниры, советы, тренды, начинающим, новости клубов.",
  alternates: { canonical: "/news" },
};

export default async function NewsPage() {
  let articles: Article[] = [];

  try {
    articles = await api.getArticles();
  } catch (error) {
    console.error("Failed to load articles:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20">
        <NewsClient initialArticles={articles} />
      </div>
    </div>
  );
}
