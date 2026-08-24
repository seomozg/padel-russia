import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Article } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  "Тренды": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Турниры": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Советы": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Начинающим": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Новости клубов": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

interface NewsCardProps {
  article: Article;
  featured?: boolean;
}

export default function NewsCard({ article, featured = false }: NewsCardProps) {
  if (featured) {
    return (
      <Link href={`/news/${article.slug}`} className="block group">
        <div className="card-sport overflow-hidden md:flex h-full">
          <div className="relative md:w-1/2 aspect-[16/9] md:aspect-auto overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/20" />
          </div>
          <div className="p-6 md:w-1/2 flex flex-col justify-between">
            <div>
              <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${CATEGORY_COLORS[article.category] || "bg-muted text-muted-foreground"}`}>
                {article.category}
              </span>
              <h2 className="font-display font-bold text-xl leading-tight mb-3 group-hover:text-primary transition-colors">
                {article.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{article.excerpt}</p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar size={12} />{new Date(article.createdAt).toLocaleDateString("ru-RU")}</span>
                <span className="flex items-center gap-1"><Clock size={12} />{article.readTime} мин</span>
              </div>
              <span className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                Читать <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/news/${article.slug}`} className="block group">
      <div className="card-sport overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[article.category] || "bg-muted text-muted-foreground"}`}>
            {article.category}
          </span>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-display font-semibold text-base leading-tight mb-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed flex-1 line-clamp-2">{article.excerpt}</p>
          <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar size={12} />{new Date(article.createdAt).toLocaleDateString("ru-RU")}</span>
            <span className="flex items-center gap-1"><Clock size={12} />{article.readTime} мин</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
