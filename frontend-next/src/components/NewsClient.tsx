"use client";

import { useState } from "react";
import { Search, Tag, Loader2 } from "lucide-react";
import { Article } from "@/lib/api";
import NewsCard from "@/components/NewsCard";

const CATEGORIES = ["Все", "Тренды", "Турниры", "Советы", "Начинающим", "Новости клубов"];

interface NewsClientProps {
  initialArticles: Article[];
}

export default function NewsClient({ initialArticles }: NewsClientProps) {
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [articles] = useState<Article[]>(initialArticles);

  const filtered = articles.filter((a) => {
    const matchCat = category === "Все" || a.category === category;
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const [featured, ...rest] = filtered;

  return (
    <>
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <h1 className="font-display font-bold text-3xl mb-2">Новости и статьи</h1>
          <p className="text-muted-foreground mb-6">Всё о падел-теннисе в России и мире</p>

          {/* Search */}
          <div className="relative max-w-lg mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Поиск статей..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {cat !== "Все" && <Tag size={12} />}
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📰</p>
            <h3 className="font-display font-bold text-xl mb-2">Статьи не найдены</h3>
            <p className="text-muted-foreground">Попробуйте другой запрос</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <div className="mb-8 animate-fade-up">
                <NewsCard article={featured} featured />
              </div>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((article, i) => (
                  <div key={article.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                    <NewsCard article={article} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
