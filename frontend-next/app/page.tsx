import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { api, Court, Article } from "@/lib/api";
import CourtCard from "@/components/CourtCard";
import NewsCard from "@/components/NewsCard";
import JsonLd from "@/components/JsonLd";
import IndexClient from "@/components/IndexClient";

export const metadata: Metadata = {
  title: "Падел-корты России",
  description:
    "Каталог падел-кортов России: рейтинги, отзывы, карта кортов. Найди свой падел-корт и начни играть уже сегодня.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: "🗺️",
    title: "Удобный каталог",
    desc: "Ищите корты по городу, типу и цене. Фильтрация и сортировка в один клик.",
  },
  {
    icon: "⭐",
    title: "Реальные отзывы",
    desc: "Читайте отзывы других игроков и выбирайте лучшие корты рядом с вами.",
  },
  {
    icon: "📍",
    title: "Карта кортов",
    desc: "Интерактивная карта России с отметками всех падел-клубов по городам.",
  },
  {
    icon: "📱",
    title: "Работает везде",
    desc: "Оптимизировано для телефона. Открывайте с любого устройства без установки.",
  },
];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://padel-russia.online";

export default async function IndexPage() {
  // Серверный fetch данных (SSR)
  let courts: Court[] = [];
  let articles: Article[] = [];

  try {
    [courts, articles] = await Promise.all([
      api.getCourts({ sort: "rating" }),
      api.getArticles({ limit: 3 }),
    ]);
  } catch (error) {
    console.error("Failed to load data:", error);
  }

  const cities = [...new Set(courts.map((c) => c.city))];
  const citiesWithCount = cities
    .map((city) => ({
      name: city,
      count: courts.filter((c) => c.city === city).length,
    }))
    .sort((a, b) => b.count - a.count);

  const totalCourts = courts.length;
  const totalCities = cities.length;
  const topCourts = [...courts].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const latestNews = articles.slice(0, 3);

  // JSON-LD: WebSite + SearchAction
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PadelRussia",
    url: siteUrl,
    description:
      "Каталог падел-кортов России: рейтинги, отзывы, карта кортов.",
    inLanguage: "ru-RU",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/courts?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={websiteJsonLd} />
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-2xl animate-fade-up">
            <div className="badge-sport inline-flex mb-6 text-sm">
              🎾 Каталог падела в России
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
              Падел-корты <span className="text-gradient-primary">России</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl">
              {totalCourts} кортов в {totalCities} городах. Найди свой корт и начни играть уже сегодня.
            </p>
            <IndexClient cities={citiesWithCount} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="card-sport p-6 animate-fade-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top courts */}
      {topCourts.length > 0 && (
        <section className="py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-primary text-sm font-semibold mb-2 uppercase tracking-wider">
                  Топ кортов
                </p>
                <h2 className="font-display font-bold text-3xl md:text-4xl">
                  Лучшие корты по рейтингу
                </h2>
              </div>
              <Link
                href="/courts"
                className="hidden sm:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
              >
                Все корты <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topCourts.map((court, i) => (
                <div key={court.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <CourtCard court={court} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cities */}
      {citiesWithCount.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10">
              <p className="text-primary text-sm font-semibold mb-2 uppercase tracking-wider">
                География
              </p>
              <h2 className="font-display font-bold text-3xl md:text-4xl">Корты по городам</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {citiesWithCount.map((city, i) => (
                <Link
                  key={city.name}
                  href={`/courts?city=${encodeURIComponent(city.name)}`}
                  className="group p-4 bg-card rounded-xl border border-border hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-center animate-fade-up"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <MapPin size={20} className="mx-auto mb-2 text-primary group-hover:text-primary-foreground" />
                  <div className="font-semibold text-sm">{city.name}</div>
                  <div className="text-xs text-muted-foreground group-hover:text-primary-foreground/70 mt-0.5">
                    {city.count} {city.count === 1 ? "корт" : city.count < 5 ? "корта" : "кортов"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* News */}
      {latestNews.length > 0 && (
        <section className="py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-primary text-sm font-semibold mb-2 uppercase tracking-wider">
                  Блог
                </p>
                <h2 className="font-display font-bold text-3xl md:text-4xl">Новости и статьи</h2>
              </div>
              <Link
                href="/news"
                className="hidden sm:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
              >
                Все статьи <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestNews.map((article, i) => (
                <div key={article.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <NewsCard article={article} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/2 translate-y-1/2" />
            </div>
            <div className="relative">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-primary-foreground mb-4">
                Готов сыграть в падел?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Найди корт рядом с домой и начни играть уже сегодня. Это проще, чем кажется!
              </p>
              <Link
                href="/courts"
                className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-bold hover:bg-white/90 transition-all text-base shadow-lg"
              >
                Найти корт <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
